"""
Automated Test Suite for Python Assessment Taxonomy, Fingerprint Dedup, and Tier Scoring
"""

import sys

# Ensure backend directory is in sys.path
sys.path.insert(0, r"d:\MycoderCorpsackend")

from app.data.python_concepts import BASIC_CONCEPTS, INTERMEDIATE_CONCEPTS, DEEP_CONCEPTS
from app.data.scenario_themes import SCENARIO_THEMES
from app.services.question_generator import (
    generate_full_assessment_questions,
    compute_content_fingerprint,
    is_fingerprint_unique,
    record_fingerprint,
    MEMORY_FINGERPRINT_CACHE
)
from app.services.scoring import (
    calculate_attempt_scoring,
    CLASSIFICATION_NEEDS_REVIEW,
    CLASSIFICATION_INTERMEDIATE_READY,
    CLASSIFICATION_ADVANCED_STRONG
)

class MockQuestion:
    def __init__(self, tier, is_correct):
        self.tier = tier
        self.difficulty = tier
        self.answer = MockAnswer(is_correct)

class MockAnswer:
    def __init__(self, is_correct):
        self.is_correct = is_correct
        self.time_taken_seconds = 30.0

class MockAssessment:
    def __init__(self, min_inter=60.0, min_deep=40.0):
        self.min_intermediate_pass_score = min_inter
        self.min_deep_pass_score = min_deep

class MockAttempt:
    def __init__(self, questions, assessment=None):
        self.questions = questions
        self.assessment = assessment or MockAssessment()


def test_concept_coverage_uniqueness():
    """Simulate 20 attempts and assert concept keys are sampled without replacement within each attempt."""
    print("[TEST 1/3]: Testing concept sampling uniqueness across 20 simulated attempts...")
    for run in range(20):
        questions = generate_full_assessment_questions(
            topic="python",
            basic_count=2,
            intermediate_count=6,
            deep_count=2
        )
        assert len(questions) == 10, f"Run {run}: Expected 10 questions, got {len(questions)}"
        
        concept_keys = [q["concept_key"] for q in questions if "concept_key" in q]
        assert len(concept_keys) == len(set(concept_keys)), f"Run {run}: Duplicate concept_key found in attempt: {concept_keys}"
    print("  -> PASSED: All 20 simulated attempts had 100% unique concept keys per attempt.")


def test_fingerprint_collision_dedup():
    """Test SHA-256 fingerprint normalization and collision detection."""
    print("[TEST 2/3]: Testing fingerprint normalization and collision detection...")
    sample_text_1 = "What is the output of print(type([])) in Python?"
    sample_text_2 = "  what is the output of PRINT( type( [] ) ) IN python??? "

    fp1 = compute_content_fingerprint(sample_text_1)
    fp2 = compute_content_fingerprint(sample_text_2)

    assert fp1 == fp2, "Fingerprint normalization failed for equivalent question texts."
    
    # Test recording and checking
    record_fingerprint(fp1, "variables_types")
    assert not is_fingerprint_unique(fp1), "Collision detection failed for registered fingerprint."
    print("  -> PASSED: SHA-256 fingerprint collision detection and normalization verified.")


def test_weighted_scoring_arithmetic():
    """Deterministic test for tier-weighted scoring arithmetic and tier classification."""
    print("[TEST 3/3]: Testing weighted scoring arithmetic and classification rules...")
    
    # Test Case A: 2/2 basic (1x), 2/6 inter (2x), 2/2 deep (3x)
    # Total points = 2*1 + 6*2 + 2*3 = 20
    # Earned points = 2*1 + 2*2 + 2*3 = 12 -> 60.0% overall
    # Inter accuracy = 2/6 = 33.33% (< 60% threshold) -> Needs Foundational Review
    q_set_a = (
        [MockQuestion("basic", True) for _ in range(2)] +
        [MockQuestion("intermediate", True) for _ in range(2)] +
        [MockQuestion("intermediate", False) for _ in range(4)] +
        [MockQuestion("deep", True) for _ in range(2)]
    )
    attempt_a = MockAttempt(q_set_a)
    res_a = calculate_attempt_scoring(attempt_a)

    assert res_a["overall_weighted_score"] == 60.0, f"Expected 60.0, got {res_a['overall_weighted_score']}"
    assert res_a["intermediate_tier_accuracy"] == 33.33, f"Expected 33.33, got {res_a['intermediate_tier_accuracy']}"
    assert res_a["deep_tier_accuracy"] == 100.0, f"Expected 100.0, got {res_a['deep_tier_accuracy']}"
    assert res_a["tier_classification"] == CLASSIFICATION_NEEDS_REVIEW, f"Expected Needs Foundational Review, got {res_a['tier_classification']}"

    # Test Case B: 2/2 basic, 5/6 inter (83.33%), 0/2 deep (0%)
    # min_inter=60, min_deep=40 -> Intermediate — Ready
    q_set_b = (
        [MockQuestion("basic", True) for _ in range(2)] +
        [MockQuestion("intermediate", True) for _ in range(5)] +
        [MockQuestion("intermediate", False) for _ in range(1)] +
        [MockQuestion("deep", False) for _ in range(2)]
    )
    attempt_b = MockAttempt(q_set_b)
    res_b = calculate_attempt_scoring(attempt_b)

    assert res_b["intermediate_tier_accuracy"] == 83.33
    assert res_b["tier_classification"] == CLASSIFICATION_INTERMEDIATE_READY, f"Expected Intermediate — Ready, got {res_b['tier_classification']}"

    # Test Case C: 2/2 basic, 5/6 inter (83.33%), 1/2 deep (50.0%)
    # min_inter=60, min_deep=40 -> Advanced — Strong Candidate
    q_set_c = (
        [MockQuestion("basic", True) for _ in range(2)] +
        [MockQuestion("intermediate", True) for _ in range(5)] +
        [MockQuestion("intermediate", False) for _ in range(1)] +
        [MockQuestion("deep", True) for _ in range(1)] +
        [MockQuestion("deep", False) for _ in range(1)]
    )
    attempt_c = MockAttempt(q_set_c)
    res_c = calculate_attempt_scoring(attempt_c)

    assert res_c["intermediate_tier_accuracy"] == 83.33
    assert res_c["deep_tier_accuracy"] == 50.0
    assert res_c["tier_classification"] == CLASSIFICATION_ADVANCED_STRONG, f"Expected Advanced — Strong Candidate, got {res_c['tier_classification']}"

    print("  -> PASSED: All hand-calculated scoring test cases matched exact expected values.")

if __name__ == "__main__":
    test_concept_coverage_uniqueness()
    test_fingerprint_collision_dedup()
    test_weighted_scoring_arithmetic()
    print("\n=== ALL 3 TEST SUITE MODULES PASSED CLEANLY! ===")
