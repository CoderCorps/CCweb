"""
Weighted Scoring & Candidate Tier Classification Engine
Calculates tier-weighted accuracy and assigns candidate skill level classifications.
"""

from typing import Dict, Any, Tuple, Optional

# Tier scoring weights
TIER_WEIGHTS = {
    "basic": 1.0,
    "intermediate": 2.0,
    "deep": 3.0
}

CLASSIFICATION_NEEDS_REVIEW = "Needs Foundational Review"
CLASSIFICATION_INTERMEDIATE_READY = "Intermediate — Ready"
CLASSIFICATION_ADVANCED_STRONG = "Advanced — Strong Candidate"

def calculate_attempt_scoring(attempt) -> Dict[str, Any]:
    """
    Computes tier-weighted overall score, isolated tier accuracies,
    and classifies candidate tier.
    """
    questions = attempt.questions or []
    
    basic_total = 0
    basic_correct = 0
    intermediate_total = 0
    intermediate_correct = 0
    deep_total = 0
    deep_correct = 0

    total_weighted_points = 0.0
    earned_weighted_points = 0.0

    for q in questions:
        tier = (q.tier or q.difficulty or "intermediate").lower()
        if tier not in TIER_WEIGHTS:
            tier = "intermediate"
            
        weight = TIER_WEIGHTS[tier]
        total_weighted_points += weight

        is_correct = bool(q.answer and q.answer.is_correct)
        if is_correct:
            earned_weighted_points += weight

        if tier == "basic":
            basic_total += 1
            if is_correct:
                basic_correct += 1
        elif tier == "deep":
            deep_total += 1
            if is_correct:
                deep_correct += 1
        else:
            # default to intermediate
            intermediate_total += 1
            if is_correct:
                intermediate_correct += 1

    overall_weighted_score = (earned_weighted_points / total_weighted_points * 100.0) if total_weighted_points > 0 else 0.0
    intermediate_tier_accuracy = (intermediate_correct / intermediate_total * 100.0) if intermediate_total > 0 else 0.0
    deep_tier_accuracy = (deep_correct / deep_total * 100.0) if deep_total > 0 else 0.0

    # Assessment thresholds
    assessment = getattr(attempt, "assessment", None)
    min_inter_pass = getattr(assessment, "min_intermediate_pass_score", 60.0) if assessment else 60.0
    min_deep_pass = getattr(assessment, "min_deep_pass_score", 40.0) if assessment else 40.0

    # Classify tier
    if intermediate_tier_accuracy < min_inter_pass:
        tier_classification = CLASSIFICATION_NEEDS_REVIEW
    elif deep_total > 0 and (min_deep_pass is not None) and (deep_tier_accuracy >= min_deep_pass):
        tier_classification = CLASSIFICATION_ADVANCED_STRONG
    else:
        tier_classification = CLASSIFICATION_INTERMEDIATE_READY

    return {
        "overall_weighted_score": round(overall_weighted_score, 2),
        "intermediate_tier_accuracy": round(intermediate_tier_accuracy, 2),
        "deep_tier_accuracy": round(deep_tier_accuracy, 2),
        "tier_classification": tier_classification,
        "basic_correct": basic_correct,
        "basic_total": basic_total,
        "intermediate_correct": intermediate_correct,
        "intermediate_total": intermediate_total,
        "deep_correct": deep_correct,
        "deep_total": deep_total
    }

