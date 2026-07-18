# 🧠 CoderCorps Quiz Management Guide

This document outlines who can manage technical assessments and the detailed procedures for setting up Internship Gatekeeper Quizzes.

---

## 🎭 Roles & Permissions

Only users with the following roles have the authority to manage quizzes:

| Role | Permissions |
| :--- | :--- |
| **🛡️ Admin** | Create, Edit, Delete, and Deactivate any quiz platform-wide. Can view all student attempts. |
| **👨‍🏫 Mentor** | Create and manage quizzes specifically for their assigned programs/projects. |
| **🚀 Student** | **Read-only/Attempt.** Can view active quizzes and submit answers. Cannot see correct answers until after submission (if enabled). |

---

## 🛠️ How to Setup a Quiz (Detailed Guide)

Currently, quizzes are initialized via the API or during database seeding. Follow these steps to set up a new Internship Gatekeeper Quiz.

### Step 1: Define the Quiz Container
Create the parent quiz object which defines the passing criteria.
- **Endpoint**: `POST /api/v1/quizzes/` (Admin/Mentor only)
- **Payload**:
```json
{
  "title": "Backend Engineering Intern Assessment",
  "description": "Validation of Python FastAPI and SQLAlchemy fundamentals.",
  "min_score_to_pass": 75,
  "is_active": true
}
```

### Step 2: Add Questions & Options
Each quiz consists of multiple-choice questions. You must mark exactly one option as `is_correct: true`.
- **Logic**: The system calculates scores based on the `points` assigned to each question.
- **Payload Example**:
```json
{
  "quiz_id": 1,
  "text": "What does the 'Depends' class in FastAPI do?",
  "question_type": "multiple_choice",
  "points": 10,
  "options": [
    { "text": "Handles Dependency Injection", "is_correct": true },
    { "text": "Connects to the Frontend", "is_correct": false },
    { "text": "Minifies JavaScript", "is_correct": false }
  ]
}
```

### Step 3: Activation
Set `is_active: true` to make the quiz visible to new users on their dashboard.

---

## 🌊 The Internship Selection Flow

The quiz system acts as a "Gatekeeper" in the following workflow:

1. **New User Signup**: Student joins the platform.
2. **Dashboard Prompt**: Student sees "Take the Internship Qualifier Quiz" widget.
3. **Attempt Submission**: Student submits answers via `POST /api/v1/quizzes/submit`.
4. **Automated Evaluation**:
   - Backend iterates through `QuizQuestion` and compares `selected_option_id` with `QuizOption.is_correct`.
   - Generates a `UserQuizAttempt` record.
5. **Conditional Access**:
   - **If Score >= min_score_to_pass**: The user is automatically tagged as "Internship Ready" (can be used to unlock specific `Project` enrollment).
   - **If Score < min_score_to_pass**: The user is encouraged to review specific resources before retrying.

---

## 📊 Monitoring Results

Mentors can monitor the `UserQuizAttempt` table to identify high-performing candidates.
- **Key Metrics to Watch**:
  - `score`: The percentage achieved.
  - `passed`: Boolean indicator of qualification.
  - `attempted_at`: To track how long it took the student to qualify after signup.

---

## 📝 Best Practices for Mentors
1. **Balanced Difficulty**: Include a mix of "Easy" (syntax) and "Hard" (architectural) questions.
2. **Clear Feedback**: Use the `description` field of the quiz to explain what the student should study if they fail.
3. **Regular Updates**: Deactivate old quizzes and create new versions every cohort to maintain assessment integrity.
