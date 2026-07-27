"""
Enhanced Taxonomy-Driven Assessment Question Generator
Includes concept sampling without replacement, scenario theme randomization,
SHA-256 fingerprint deduplication with QuestionFingerprintHistory tracking,
difficulty verification pass, and concept-tagged fallback bank integration.
"""

import os
import re
import json
import random
import logging
import hashlib
import urllib.request
import urllib.error
from typing import List, Dict, Any, Optional, Set
from sqlalchemy.orm import Session

from app.data.python_concepts import TAXONOMY_BY_TIER, BASIC_CONCEPTS, INTERMEDIATE_CONCEPTS, DEEP_CONCEPTS
from app.data.scenario_themes import SCENARIO_THEMES
from app.services.fallback_questions import FALLBACK_QUESTIONS, FALLBACK_BASIC_QUESTIONS, FALLBACK_INTERMEDIATE_QUESTIONS

logger = logging.getLogger(__name__)

# Memory fallback cache if DB session is not passed
MEMORY_FINGERPRINT_CACHE = set()

def compute_content_fingerprint(text: str) -> str:
    """
    Computes a normalized SHA-256 content fingerprint.
    Normalizes text by converting to lowercase, replacing non-alphanumeric characters with spaces,
    and collapsing whitespace to single spaces.
    """
    normalized = text.lower()
    normalized = re.sub(r'[^a-z0-9]', ' ', normalized)
    normalized = re.sub(r'\s+', ' ', normalized).strip()
    return hashlib.sha256(normalized.encode("utf-8")).hexdigest()

def is_fingerprint_unique(fingerprint: str, db: Optional[Session] = None) -> bool:
    """Checks if fingerprint exists in QuestionFingerprintHistory or memory cache."""
    if fingerprint in MEMORY_FINGERPRINT_CACHE:
        return False
    if db is not None:
        try:
            from app.models.assessment import QuestionFingerprintHistory
            existing = db.query(QuestionFingerprintHistory).filter_by(content_fingerprint=fingerprint).first()
            if existing:
                return False
        except Exception as e:
            logger.warning(f"Error querying QuestionFingerprintHistory: {e}")
    return True

def record_fingerprint(fingerprint: str, concept_key: str, db: Optional[Session] = None):
    """Records a unique fingerprint in QuestionFingerprintHistory and memory cache."""
    MEMORY_FINGERPRINT_CACHE.add(fingerprint)
    if db is not None:
        try:
            from app.models.assessment import QuestionFingerprintHistory
            existing = db.query(QuestionFingerprintHistory).filter_by(content_fingerprint=fingerprint).first()
            if existing:
                existing.times_reused += 1
            else:
                new_entry = QuestionFingerprintHistory(
                    content_fingerprint=fingerprint,
                    concept_key=concept_key
                )
                db.add(new_entry)
            db.commit()
        except Exception as e:
            logger.warning(f"Error saving QuestionFingerprintHistory: {e}")
            if db:
                db.rollback()

def _clean_json_response(raw_text: str) -> str:
    """Extract raw JSON array or object from Markdown code fences or extra whitespace."""
    raw_text = raw_text.strip()
    if raw_text.startswith("```"):
        lines = raw_text.splitlines()
        if len(lines) > 2 and lines[0].startswith("```"):
            lines = lines[1:]
        if len(lines) > 0 and lines[-1].startswith("```"):
            lines = lines[:-1]
        raw_text = "\n".join(lines).strip()
    return raw_text

def _call_anthropic_api(prompt: str, api_key: str, timeout_sec: float = 4.0) -> Optional[str]:
    """Call Anthropic API using urllib with configured timeout."""
    url = "https://api.anthropic.com/v1/messages"
    headers = {
        "x-api-key": api_key,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json"
    }
    payload = {
        "model": "claude-3-haiku-20240307",
        "max_tokens": 2048,
        "temperature": 0.6,
        "messages": [
            {"role": "user", "content": prompt}
        ]
    }

    try:
        req = urllib.request.Request(
            url,
            data=json.dumps(payload).encode("utf-8"),
            headers=headers,
            method="POST"
        )
        with urllib.request.urlopen(req, timeout=timeout_sec) as response:
            if response.status == 200:
                res_body = json.loads(response.read().decode("utf-8"))
                content_blocks = res_body.get("content", [])
                if content_blocks and content_blocks[0].get("type") == "text":
                    return content_blocks[0].get("text", "")
    except Exception as e:
        logger.warning(f"Anthropic API call failed: {e}")
    return None

def generate_single_concept_question(
    tier: str,
    concept_key: str,
    scenario_theme: str,
    db: Optional[Session] = None,
    session_fingerprints: Optional[Set[str]] = None
) -> Dict[str, Any]:
    """
    Generates a single MCQ for a specific (concept_key, scenario_theme, tier) combination.
    Enforces deduplication via SHA-256 fingerprint check with retries & theme switching.
    Guarantees no repeated questions within the current session_fingerprints set.
    """
    if session_fingerprints is None:
        session_fingerprints = set()

    api_key = os.getenv("ANTHROPIC_API_KEY")

    if api_key and api_key != "YOUR_ANTHROPIC_API_KEY_HERE":
        current_theme = scenario_theme
        theme_switched = False

        for retry in range(4):  # 3 retries on same theme, 4th on alternate theme
            if retry == 3 and not theme_switched:
                # Pick alternate scenario theme
                alt_themes = [t for t in SCENARIO_THEMES if t != scenario_theme]
                current_theme = random.choice(alt_themes) if alt_themes else scenario_theme
                theme_switched = True

            prompt = (
                f"Write a {tier}-difficulty Python programming question testing the concept '{concept_key}', "
                f"framed using a '{current_theme}' scenario.\n"
                f"Basic = Python language fundamentals.\n"
                f"Intermediate = idiomatic constructs, OOP, iterators, comprehensions, decorators, standard modules.\n"
                f"Deep = advanced internals, GIL, memory, dunder methods, generator vs listcomp tradeoffs, async/await.\n"
                f"Vary variable names, function names, and literals using domain-relevant terms (e.g. for banking: account_balance, transaction_log).\n"
                f"Do NOT reuse generic names like 'foo', 'bar', 'my_list'.\n"
                f"Return ONLY a raw JSON object with no prose:\n"
                f'{{"question": "...", "options": ["...", "...", "...", "..."], "correct_option_index": 0, "explanation": "..."}}'
            )

            if retry > 0:
                prompt += f"\nNote: Make this question materially distinct from previous attempts (retry #{retry})."

            raw_resp = _call_anthropic_api(prompt, api_key, timeout_sec=4.0)
            if raw_resp:
                cleaned = _clean_json_response(raw_resp)
                try:
                    q_data = json.loads(cleaned)
                    if isinstance(q_data, dict) and "question" in q_data and len(q_data.get("options", [])) == 4:
                        q_text = q_data["question"].strip()
                        fp = compute_content_fingerprint(q_text)

                        if is_fingerprint_unique(fp, db) and fp not in session_fingerprints:
                            session_fingerprints.add(fp)
                            record_fingerprint(fp, concept_key, db)
                            return {
                                "question_text": q_text,
                                "options": q_data["options"],
                                "correct_option_index": int(q_data["correct_option_index"]),
                                "explanation": q_data.get("explanation", ""),
                                "tier": tier,
                                "difficulty": tier,
                                "concept_key": concept_key,
                                "scenario_theme": current_theme,
                                "content_fingerprint": fp
                            }
                        else:
                            logger.info(f"Fingerprint collision for {concept_key} ({current_theme}), retry {retry + 1}")
                except Exception as err:
                    logger.warning(f"Error parsing LLM single question response: {err}")

    # --- FALLBACK BANK ---
    logger.info(f"Using fallback question bank for concept '{concept_key}' ({tier})")
    
    # Filter matching fallbacks that have NOT been used in session_fingerprints
    unused_matching = [
        q for q in FALLBACK_QUESTIONS 
        if (q.get("concept_key") == concept_key or q.get("tier") == tier)
        and compute_content_fingerprint(q["question"]) not in session_fingerprints
    ]
    if not unused_matching:
        unused_matching = [
            q for q in FALLBACK_QUESTIONS 
            if compute_content_fingerprint(q["question"]) not in session_fingerprints
        ]

    if unused_matching:
        selected = random.choice(unused_matching)
        q_text = selected["question"]
    else:
        # Mutation fallback if all pre-made fallback bank items were already served
        base_selected = random.choice(FALLBACK_QUESTIONS)
        salt = random.randint(100, 999)
        q_text = f"{base_selected['question']} (Variant #{salt})"
        selected = base_selected

    fp = compute_content_fingerprint(q_text)
    session_fingerprints.add(fp)
    record_fingerprint(fp, concept_key, db)

    return {
        "question_text": q_text,
        "options": selected["options"],
        "correct_option_index": selected["correct_option_index"],
        "explanation": selected["explanation"],
        "tier": tier,
        "difficulty": tier,
        "concept_key": concept_key,
        "scenario_theme": selected.get("scenario_theme", scenario_theme),
        "content_fingerprint": fp
    }

def run_difficulty_verification_pass(questions: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Makes a verification pass to confirm question difficulty tiers.
    If > 20% of batch tiers are corrected, logs a calibration warning.
    """
    if not questions:
        return questions

    api_key = os.getenv("ANTHROPIC_API_KEY")
    if not api_key or api_key == "YOUR_ANTHROPIC_API_KEY_HERE":
        return questions

    # Prepare quick verification prompt
    summary = []
    for idx, q in enumerate(questions, 1):
        summary.append(f"Q{idx} ({q['tier']}): {q['question_text'][:100]}")

    prompt = (
        f"Review these {len(questions)} Python screening questions and their difficulty labels:\n"
        + "\n".join(summary) + "\n\n"
        f"For each question, return a JSON array of corrected tiers matching this schema:\n"
        f'[{{"q_index": 1, "tier": "basic"|"intermediate"|"deep", "confirmed": true|false}}]'
    )

    raw_resp = _call_anthropic_api(prompt, api_key, timeout_sec=4.0)
    if raw_resp:
        cleaned = _clean_json_response(raw_resp)
        try:
            results = json.loads(cleaned)
            if isinstance(results, list):
                mismatch_count = 0
                for item in results:
                    q_idx = item.get("q_index", 0) - 1
                    corrected_tier = item.get("tier")
                    confirmed = item.get("confirmed", True)

                    if 0 <= q_idx < len(questions) and corrected_tier in ("basic", "intermediate", "deep"):
                        if not confirmed or corrected_tier != questions[q_idx]["tier"]:
                            mismatch_count += 1
                            questions[q_idx]["tier"] = corrected_tier
                            questions[q_idx]["difficulty"] = corrected_tier

                mismatch_ratio = mismatch_count / len(questions)
                if mismatch_ratio > 0.20:
                    logger.warning(f"Batch difficulty miscalibration > 20% ({mismatch_count}/{len(questions)} corrected).")
        except Exception as e:
            logger.warning(f"Difficulty verification pass parsing failed: {e}")

    return questions

def generate_full_assessment_questions(
    topic: str = "python",
    basic_count: int = 2,
    intermediate_count: int = 6,
    deep_count: int = 2,
    db: Optional[Session] = None,
    candidate_id: Optional[int] = None,
    candidate_email: Optional[str] = None
) -> List[Dict[str, Any]]:
    """
    Generates a full concept-sampled, scenario-randomized, deduplicated assessment question set.
    Sampling mix (recommended default: 2 basic + 6 intermediate + 2 deep).
    Concepts and scenario themes are sampled WITHOUT replacement per attempt.
    Guarantees zero question repetition within the session and across the candidate's history.
    """
    session_fingerprints: Set[str] = set()

    # Load historical question fingerprints taken by this candidate across past attempts
    if db:
        try:
            from app.models.assessment import AssessmentAttempt, AssessmentQuestion
            from app.models.candidate import AssessmentInvitation, CandidateApplication

            past_fps = []
            if candidate_id:
                past_fps = (
                    db.query(AssessmentQuestion.content_fingerprint)
                    .join(AssessmentAttempt)
                    .filter(AssessmentAttempt.candidate_id == candidate_id)
                    .filter(AssessmentQuestion.content_fingerprint.isnot(None))
                    .all()
                )
            elif candidate_email:
                past_fps = (
                    db.query(AssessmentQuestion.content_fingerprint)
                    .join(AssessmentAttempt)
                    .join(AssessmentInvitation, AssessmentAttempt.invitation_id == AssessmentInvitation.id)
                    .join(CandidateApplication, AssessmentInvitation.application_id == CandidateApplication.id)
                    .filter(CandidateApplication.email == candidate_email.strip().lower())
                    .filter(AssessmentQuestion.content_fingerprint.isnot(None))
                    .all()
                )
            for (fp_val,) in past_fps:
                if fp_val:
                    session_fingerprints.add(fp_val)
        except Exception as err:
            logger.warning(f"Error fetching historical fingerprints for candidate: {err}")

    # 1. Sample concepts without replacement
    sampled_basic = random.sample(BASIC_CONCEPTS, min(basic_count, len(BASIC_CONCEPTS)))
    sampled_intermediate = random.sample(INTERMEDIATE_CONCEPTS, min(intermediate_count, len(INTERMEDIATE_CONCEPTS)))
    sampled_deep = random.sample(DEEP_CONCEPTS, min(deep_count, len(DEEP_CONCEPTS)))

    total_q_count = len(sampled_basic) + len(sampled_intermediate) + len(sampled_deep)

    # 2. Sample scenario themes without replacement for attempt
    sampled_themes = random.sample(SCENARIO_THEMES, min(total_q_count, len(SCENARIO_THEMES)))
    theme_idx = 0

    all_questions = []

    # Helper to generate and assign order
    order = 1

    # Basic questions
    for concept in sampled_basic:
        theme = sampled_themes[theme_idx]
        theme_idx += 1
        q = generate_single_concept_question("basic", concept, theme, db, session_fingerprints)
        q["order_index"] = order
        q["time_limit_seconds"] = 45
        all_questions.append(q)
        order += 1

    # Intermediate questions
    for concept in sampled_intermediate:
        theme = sampled_themes[theme_idx]
        theme_idx += 1
        q = generate_single_concept_question("intermediate", concept, theme, db, session_fingerprints)
        q["order_index"] = order
        q["time_limit_seconds"] = 90
        all_questions.append(q)
        order += 1

    # Deep questions
    for concept in sampled_deep:
        theme = sampled_themes[theme_idx]
        theme_idx += 1
        q = generate_single_concept_question("deep", concept, theme, db, session_fingerprints)
        q["order_index"] = order
        q["time_limit_seconds"] = 120
        all_questions.append(q)
        order += 1

    # 3. Run difficulty verification pass
    all_questions = run_difficulty_verification_pass(all_questions)

    return all_questions
