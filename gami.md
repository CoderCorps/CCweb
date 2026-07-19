# CoderCorps: Gamified Progression System

The Gamified Progression system—often referred to as the "Skill Galaxy"—is a core feature of the CoderCorps platform designed to motivate students, validate their technical competencies, and provide actionable signals to recruiters.

Based on the UI visualization, the system operates as a constellation of interconnected skill nodes. Students start with a baseline of zero points and gradually illuminate the constellation by completing verified engineering tasks.

---

## 1. Core Mechanics

### Skill Points (SP)
Skill Points act as the universal currency for progression on the platform.
- **Earning Points:** Students earn SP by completing tasks within project sprints. The number of points awarded is determined by the task's difficulty, the quality of the PR (evaluated by AI), and final approval by the mentor.
- **Display:** A student's total SP is prominently displayed in the top left of their Skill Galaxy view, providing an immediate sense of overall progression.

### The Skill Galaxy (Nodes & Paths)
The progression UI maps out technical domains as interconnected nodes (e.g., *React*, *PostgreSQL*, *Docker*, *AWS*).
- **Locked Nodes (🔒):** Skills that the student has not yet proven competency in. They remain dimmed and locked.
- **Unlocked/Glowing Nodes (✨):** Skills where the student has submitted audited, merged code. These nodes illuminate, symbolizing mastery.
- **Paths:** Nodes are connected by constellation lines. Unlocking foundational skills (e.g., JavaScript) can unlock the path to more advanced domains (e.g., React or Node.js).

---

## 2. The User Journey

### A. The Student Flow
1. **Task Assignment:** A student is assigned a ticket on the Kanban board (e.g., "Implement JWT Authentication"). This ticket is tagged with specific underlying skills (e.g., `FastAPI`, `JWT`, `Python`).
2. **Execution & CI Sync:** The student pushes code. GitHub Actions runs the CI/CD pipeline, pushing test coverage and build status back to the CoderCorps task card.
3. **AI Pre-Review:** An LLM reviews the linked Pull Request, providing immediate feedback and an automated code quality score.
4. **Mentor Approval & Node Unlock:** The human mentor reviews the AI's feedback, the CI results, and the code itself. Upon marking the task as "Done", the student is awarded **Skill Points**.
5. **Leveling Up:** If the student accumulates enough SP in a specific domain, the corresponding `SkillNode` in their Galaxy unlocks, changing from a locked icon to a glowing star.

### B. The Recruiter Flow
Recruiters use the Skill Galaxy as a verifiable "Proof-of-Work" engine rather than relying on self-reported resumes.
1. **Targeted Search:** A hiring manager visits the `/recruiters` dashboard and filters the talent pool by specific unlocked `SkillNodes` (e.g., "Show me students who have unlocked the *React* and *AWS* nodes").
2. **Portfolio Audit:** Clicking on a student reveals their exact audited portfolio. The recruiter can see the specific tasks the student completed to earn that node, including the CI status, Mentor Score, and AI Feedback for those exact PRs.

---

## 3. Technical Implementation

The system is powered by a relational schema designed for efficient querying and aggregation.

### Database Models (`skill.py`)
- **`SkillNode`**: The master registry of all available skills on the platform.
  - Fields: `id`, `name` (e.g., "Python"), `category` (e.g., "Backend"), `description`.
- **`UserSkill`**: The many-to-many junction table tracking a student's unlocked skills.
  - Fields: `user_id`, `skill_id`, `proficiency_level` (a dynamic multiplier based on points earned), `unlocked_at`.
- **`User.skill_points`**: A cached aggregate integer on the main `User` model representing total global progression.

### Backend Endpoints
- **Task Submission Webhook:** When a PR is merged, the backend calculates the aggregate score (Mentor + AI) and updates `User.skill_points`.
- **Skill Evaluation Engine:** A background service evaluates if the recent task submission pushes the student past the threshold for a specific `SkillNode`. If so, a new `UserSkill` record is inserted.
- **Recruiter API (`/candidates`)**: Dynamically queries the `UserSkill` table: `query.join(UserSkill).join(SkillNode).filter(SkillNode.name.ilike(f"%{skill}%"))` to return candidates who have objectively proven their capability.

> [!TIP]
> **Future Enhancement:** The UI can be extended with libraries like `react-force-graph` or `framer-motion` to make the Skill Galaxy fully interactive, allowing users to pan, zoom, and click on individual nodes to see the exact PRs that contributed to that specific skill's progression.
