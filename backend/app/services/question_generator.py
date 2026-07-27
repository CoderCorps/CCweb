import os
import json
import random
import logging
import hashlib
import urllib.request
import urllib.error
from typing import List, Dict, Any, Optional
from app.services.fallback_questions import FALLBACK_BASIC_QUESTIONS, FALLBACK_INTERMEDIATE_QUESTIONS

logger = logging.getLogger(__name__)

# Global set of recently used question hashes to avoid exact duplicates across runs
RECENTLY_USED_HASHES = set()

def _calculate_question_hash(question_text: str) -> str:
    return hashlib.md5(question_text.strip().lower().encode("utf-8")).hexdigest()

def validate_questions_schema(data: Any, expected_count: int) -> bool:
    """Strict schema validation for generated LLM question payload."""
    if not isinstance(data, list):
        return False
    if len(data) != expected_count:
        return False
    
    for q in data:
        if not isinstance(q, dict):
            return False
        if "question" not in q or not isinstance(q["question"], str) or not q["question"].strip():
            return False
        if "options" not in q or not isinstance(q["options"], list) or len(q["options"]) != 4:
            return False
        for opt in q["options"]:
            if not isinstance(opt, str) or not opt.strip():
                return False
        if "correct_option_index" not in q or not isinstance(q["correct_option_index"], int):
            return False
        if q["correct_option_index"] < 0 or q["correct_option_index"] > 3:
            return False
        if "explanation" not in q or not isinstance(q["explanation"], str):
            return False

    return True

def _call_anthropic_api(prompt: str, api_key: str) -> Optional[str]:
    """Call Anthropic Claude API via urllib."""
    url = "https://api.anthropic.com/v1/messages"
    headers = {
        "x-api-key": api_key,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json"
    }
    payload = {
        "model": "claude-3-haiku-20240307",
        "max_tokens": 2048,
        "temperature": 0.5,
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
        with urllib.request.urlopen(req, timeout=4) as response:
            if response.status == 200:
                res_body = json.loads(response.read().decode("utf-8"))
                content_blocks = res_body.get("content", [])
                if content_blocks and content_blocks[0].get("type") == "text":
                    return content_blocks[0].get("text", "")
    except Exception as e:
        logger.warning(f"Anthropic API call failed: {e}")
    return None

def _clean_json_response(raw_text: str) -> str:
    """Extract raw JSON array from Markdown code fences or extra whitespace."""
    raw_text = raw_text.strip()
    if raw_text.startswith("```"):
        # Remove top fence
        lines = raw_text.splitlines()
        if len(lines) > 2 and lines[0].startswith("```"):
            lines = lines[1:]
        if len(lines) > 0 and lines[-1].startswith("```"):
            lines = lines[:-1]
        raw_text = "\n".join(lines).strip()
    return raw_text

def generate_questions_for_difficulty(
    topic: str,
    difficulty: str,
    count: int,
    exclusion_list: Optional[List[str]] = None
) -> List[Dict[str, Any]]:
    """
    Generate `count` MCQs for `topic` at `difficulty` level.
    Tries Anthropic API with retries; falls back to static question bank on failure.
    """
    api_key = os.getenv("ANTHROPIC_API_KEY")
    exclusion_list = exclusion_list or []
    
    if api_key and api_key != "YOUR_ANTHROPIC_API_KEY_HERE":
        prompt = (
            f"Generate exactly {count} multiple-choice {topic} programming questions "
            f"at {difficulty} difficulty for screening internship candidates.\n"
            f"Basic = language fundamentals (variables, loops, conditionals, basic data structures, string/list operations).\n"
            f"Intermediate = functions, OOP basics, exceptions, comprehensions, common standard library usage, reading and predicting output of short code snippets.\n"
            f"Return ONLY a raw JSON array, with no surrounding prose or markdown fences, matching this exact schema:\n"
            f'[{{\"question\": \"...\", \"options\": [\"...\", \"...\", \"...\", \"...\"], \"correct_option_index\": 0, \"explanation\": \"...\"}}]\n'
            f"Rules:\n"
            f"1. Exactly 4 options per question.\n"
            f"2. Exactly one correct answer (index 0 to 3).\n"
            f"3. Options must not be trivially guessable (avoid 'all of the above' / 'none of the above').\n"
            f"4. Code snippets in the question text must be syntactically valid {topic}.\n"
            f"5. Do NOT repeat any of these concepts/questions: {json.dumps(exclusion_list)}."
        )

        for attempt in range(1):  # 1 quick attempt; fallback to static bank if >4s
            raw_response = _call_anthropic_api(prompt, api_key)
            if raw_response:
                cleaned = _clean_json_response(raw_response)
                try:
                    parsed = json.loads(cleaned)
                    if validate_questions_schema(parsed, count):
                        # Track hashes
                        for q in parsed:
                            RECENTLY_USED_HASHES.add(_calculate_question_hash(q["question"]))
                        return parsed
                    else:
                        logger.warning(f"Attempt {attempt + 1}: LLM response schema validation failed.")
                except json.JSONDecodeError as err:
                    logger.warning(f"Attempt {attempt + 1}: Failed to parse LLM JSON output: {err}")

    # --- FALLBACK BANK ---
    logger.info(f"Using fallback question bank for {topic} - {difficulty} (requested count: {count})")
    pool = FALLBACK_BASIC_QUESTIONS if difficulty == "basic" else FALLBACK_INTERMEDIATE_QUESTIONS
    
    # Shuffle and select count items
    available = [q for q in pool if _calculate_question_hash(q["question"]) not in RECENTLY_USED_HASHES]
    if len(available) < count:
        available = pool  # Reset pool if exhausted
    
    selected = random.sample(available, min(count, len(available)))
    
    # If still need more, duplicate or cycle
    while len(selected) < count:
        selected.append(random.choice(pool))

    # Mark used
    for q in selected:
        RECENTLY_USED_HASHES.add(_calculate_question_hash(q["question"]))

    return selected

def generate_full_assessment_questions(
    topic: str,
    basic_count: int,
    intermediate_count: int
) -> List[Dict[str, Any]]:
    """
    Generate questions for basic batch and intermediate batch separately,
    assigning order_index and difficulty metadata.
    """
    basic_qs = generate_questions_for_difficulty(topic, "basic", basic_count)
    
    # Pass basic question texts as exclusion list for intermediate call
    basic_texts = [q["question"] for q in basic_qs]
    intermediate_qs = generate_questions_for_difficulty(topic, "intermediate", intermediate_count, exclusion_list=basic_texts)

    all_questions = []
    order = 1

    for q in basic_qs:
        all_questions.append({
            "order_index": order,
            "difficulty": "basic",
            "question_text": q["question"],
            "options": q["options"],
            "correct_option_index": q["correct_option_index"],
            "explanation": q["explanation"]
        })
        order += 1

    for q in intermediate_qs:
        all_questions.append({
            "order_index": order,
            "difficulty": "intermediate",
            "question_text": q["question"],
            "options": q["options"],
            "correct_option_index": q["correct_option_index"],
            "explanation": q["explanation"]
        })
        order += 1

    return all_questions
