# MycoderCorps: Developer Growth Platform

MycoderCorps is a comprehensive platform designed to facilitate project-based learning, mentorship, and collaboration for aspiring developers. It combines modern project management tools with gamification and community features to create an engaging learning environment.

## 🚀 Project Overview

The platform allows mentors to guide students through real-world software development cycles. Students work on tasks, receive feedback, collaborate with peers, and build a verified portfolio of their work.

## 🛠 Tech Stack

### Backend
- **Framework**: [FastAPI](https://fastapi.tiangolo.com/) (Python)
- **Database**: [PostgreSQL](https://www.postgresql.org/) with [SQLAlchemy 2.0](https://www.sqlalchemy.org/) ORM
- **Migrations**: [Alembic](https://alembic.sqlalchemy.org/)
- **Authentication**: JWT-based security with password hashing (Bcrypt)
- **Real-time**: WebSockets for collaboration rooms and notifications

### Frontend
- **Framework**: [Next.js 15+](https://nextjs.org/) (React 19)
- **Styling**: [Tailwind CSS 4](https://tailwindcss.com/)
- **Animations**: [Framer Motion](https://www.framer.com/motion/) & [GSAP](https://gsap.com/)
- **3D/Interactive**: [Spline](https://spline.design/) & [Three.js](https://threejs.org/)
- **State Management**: React Hooks and Context API

---

## 🔑 Core Features & Workflows

### 1. User Roles
- **Students**: Learn by doing, complete tasks, earn badges, and build portfolios.
- **Mentors**: Create projects, design curriculum (sprints/tasks), and guide students.
- **Admins**: Manage the overall platform, users, and global settings.

### 2. Project & Task Management
- **Projects**: The core unit of work. Contains sprints, members, and resources.
- **Sprints**: Time-boxed development cycles within a project.
- **Tasks**: Granular work items.
    - **Modes**: *Individual* or *Competitive* (multiple students working on the same goal).
    - **Difficulty**: Easy, Medium, or Hard.
    - **Interaction**: Comments, Stuck Flags (help requests), and Peer Review requests.

### 3. Submission & Feedback Loop
- Students submit their work via GitHub repository links and demo URLs.
- Mentors review submissions, provide detailed feedback, and assign scores (0-100).
- Successful reviews award **Skill Points** and can trigger **Badge** awards.

### 4. Gamification & Engagement
- **Leaderboards**: Track top performers within a project based on scores and task completion.
- **Badges**: Earned for specific achievements (e.g., "Blocker Crusher" for resolving stuck flags, "System Architect" for high-scoring technical tasks).
- **Skill Points**: Accumulated to unlock new "skills" on the user profile.

### 5. Collaboration Tools
- **Project Rooms**: Dedicated spaces for project members to communicate.
- **Direct Messaging**: One-on-one communication between users.
- **Announcements**: Mentors can broadcast important updates to all project members.
- **Resource Sharing**: A centralized place for project-related documentation and links.

### 6. Personal Branding
- **Portfolio**: Automatically generated based on completed projects and tasks.
- **Certificates**: Issued to students upon successful completion of projects.
- **Daily Activity**: Tools for students to track their own progress (Daily To-dos) and report to mentors.

---

## 👥 Roles, Responsibilities & Features

The platform is built around three distinct user roles, each with specific capabilities and access levels.

### 1. Admin (The Orchestrator)
**Responsibility:** Oversees the entire platform ecosystem and ensures operational integrity.
- **User Management:** Full authority to promote or demote users (Student ↔ Mentor ↔ Admin).
- **System Governance:** Visibility into all projects, regardless of mentor assignment.
- **Global Insights:** Access to a high-level dashboard showing platform growth, active users, and system-wide pending reviews.
- **Content Oversight:** Can modify or delete any resource, announcement, or project.
- **Manual Overrides:** Ability to manually issue certificates or resolve platform-wide stuck flags.

### 2. Mentor (The Guide)
**Responsibility:** Designs learning paths, manages project delivery, and provides expert feedback.
- **Project Creation:** Set up new projects with descriptions, timelines, and technical requirements.
- **Curriculum Design:** Break down projects into manageable **Sprints** and **Tasks**.
- **Team Leadership:** Assign students to projects and specific tasks based on their skills.
- **Quality Control:** Review student submissions, assign scores (0-100), and provide detailed constructive feedback.
- **Student Monitoring:** 
    - Track student "health" through **Daily Reports** and **Stuck Flags**.
    - Monitor progress on the **Project Leaderboard**.
- **Communication:** Broadcast **Announcements** and share technical **Resources**.

### 3. Student (The Builder)
**Responsibility:** Actively participates in projects, completes technical tasks, and collaborates with peers.
- **Project Participation:** Join available projects and engage in **Project Rooms**.
- **Task Execution:**
    - Work on assigned individual or competitive tasks.
    - Submit work via GitHub PRs and Demo URLs.
- **Self-Management:**
    - Plan daily work with **Daily To-dos**.
    - Submit **Daily Standup Reports** to track progress and blockers.
- **Collaboration:**
    - Raise **Stuck Flags** when facing technical hurdles.
    - Request **Peer Reviews** from fellow students.
    - Engage in task-level discussions via **Comments**.
- **Growth Tracking:**
    - Earn **Skill Points** and **Badges** for achievements.
    - View personal **Dashboard** and automatically updated **Portfolio**.
    - Receive verified **Certificates** upon project completion.

---

## 📂 Project Structure

```text
D:\MycoderCorps\
├── backend/            # FastAPI Application
│   ├── alembic/        # Database migrations
│   ├── app/            # Core logic
│   │   ├── api/        # API Endpoints (v1)
│   │   ├── core/       # Configuration and security
│   │   ├── db/         # Database session management
│   │   ├── models/     # SQLAlchemy Database Models
│   │   ├── schemas/    # Pydantic Schemas (Request/Response)
│   │   └── services/   # Business logic & Badge evaluation
│   └── tests/          # Pytest suite
│
├── frontend/           # Next.js Application
│   ├── src/
│   │   ├── app/        # Pages and Route Groups
│   │   │   ├── (auth)/     # Login/Register
│   │   │   ├── (marketing)/ # Landing Pages
│   │   │   └── (platform)/  # Dashboard, Projects, Mentor tools
│   │   ├── components/ # Reusable UI components
│   │   ├── hooks/      # Custom React hooks
│   │   └── lib/        # Utility functions and API clients
│   └── public/         # Static assets (Images, 3D models)
│
└── myassets/           # Raw assets and Badge images
```
---

## 🌊 Platform Architecture & User Flows

This section details the platform's user-flow dynamics, starting with a complete technical breakdown of the Mentor's capabilities and followed by concrete, step-by-step walkthroughs for each of the three platform roles.

### 👨‍🏫 The Complete Mentor Flow & Capabilities

Mentors act as technical leads (e.g., Staff Engineers, Architects) who manage project execution, validate code quality, unblock developers, and issue verifiable credentials. 

```mermaid
flowchart TD
    subgraph Phase 1: Initiation & Planning
        M1[Create Project] --> M2[Define Sprints]
        M2 --> M3[Create Tasks & Assign to Students]
    end

    subgraph Phase 2: Active Execution & Mentorship
        M4[Monitor Daily Standups] --> M5[Submit Report Feedback]
        M6[Observe Stuck Flags] --> M7[Resolve Blockers]
        M8[Real-time Workspace Chat] --> M9[Threaded Private DMs]
    end

    subgraph Phase 3: Code Audit & Review
        M10[Student Submits Task PR] --> M11[Review Code & Assign Score 0-100]
        M11 --> M12[Approve / Request Revision]
        M12 --> M13[System Updates Skill Points & Badges]
    end

    subgraph Phase 4: Project Completion
        M14[Review Final Repo + Demo URLs] --> M15[Approve Project Submission]
        M15 --> M16[Auto-Mint Verifiable Certificate]
    end

    Phase 1 --> Phase 2
    Phase 2 --> Phase 3
    Phase 3 --> Phase 4
```

#### 1. Project Initiation & Member Control
* **Action**: Projects reside inside parent **Programs** (cohorts/semesters) initialized by Admins. Mentors initialize their project workspaces and manage enrollment.
* **REST API Endpoints**:
  * `POST /api/v1/projects/` — Creates a project linked to a program.
  * `POST /api/v1/projects/{id}/members` — Enrolls/manually adds students.
  * `DELETE /api/v1/projects/{id}/members/{user_id}` — Removes a student from the project roster.
* **Frontend View**: `src/app/(platform)/mentor/students/page.tsx` displaying the enrolled developer roster, their active sprint number, tasks in-progress, and last active date.

#### 2. Sprint & Task Planning (Kanban Board)
* **Action**: Mentors set up the project’s timeline by defining sprints and task requirements. They allocate technical tasks to specific students to organize work.
* **REST API Endpoints**:
  * `POST /api/v1/projects/{id}/sprints` — Creates Sprints (e.g., "Sprint 1: Core Architecture").
  * `POST /api/v1/projects/sprints/{sprint_id}/tasks` — Creates tasks under a sprint (specifying description, estimated hours, and skill points rewards).
  * `POST /api/v1/tasks/{id}/assign` — Assigns a task to one or more enrolled students.
  * `PATCH /api/v1/projects/tasks/{task_id}` — Edits task parameters.

#### 3. Daily Standup Reviewing & Mood Tracking
* **Action**: Every morning, students state their daily checklist. Every evening, they submit a Daily Standup report. Mentors monitor these reports to catch drop-offs.
* **REST API Endpoints**:
  * `GET /api/v1/daily/reports` — Retrieves all daily standups filtered by project/date.
  * `PATCH /api/v1/daily/reports/{id}/feedback` — Mentors submit direct text feedback on a student’s daily report.
  * `GET /api/v1/daily/reports/missing` — Returns a list of students who have not checked in for the day.
* **Frontend View**: `/mentor/reports` where mentors filter standups, view completed/open checklists, read blocker descriptions, and leave review replies.

#### 4. Stuck Students & Blocker Resolution
* **Action**: When students hit technical road-blocks, they can place an explicit "Stuck Flag" on an assigned task. 
* **REST API Endpoints**:
  * `GET /api/v1/projects/{id}/stuck-flags` — Lists all open/resolved blockers for a project.
  * `PATCH /api/v1/stuck_flags/{id}/resolve` — Resolves the stuck flag (can be completed by the student or the project mentor).

#### 5. Task-Level Code Reviews & Grading
* **Action**: When a student changes a task state to `review` and submits their work, the mentor performs a line-by-line review of their pull request or code approach.
* **REST API Endpoints**:
  * `GET /api/v1/tasks/{id}/submissions` — Fetches submissions for a specific task.
  * `PATCH /api/v1/submissions/{id}/review` — Submits a grade (`mentor_score` from `0` to `100`) and written feedback.
* **Logic Rules**: 
  1. Setting a score automatically transitions the student's `TaskAssignment` status to `reviewed`.
  2. Submitting this review triggers an in-app notification to the student.
  3. The system triggers background badge evaluation algorithms: `evaluate_blocker_crusher()` and `evaluate_system_architect()`, immediately awarding unlocked achievements to the student.
* **Frontend View**: `/projects/[id]/leaderboard` under the "Submission/Review Deck", allowing the mentor to grade and save reviews.

#### 6. Project-Level Audits & Certificate Minting
* **Action**: Upon completing all milestones, students submit a final, comprehensive project delivery (Live Demo + Production GitHub Repository). Mentors evaluate this delivery.
* **REST API Endpoints**:
  * `PATCH /api/v1/submissions/{id}/review` — Submits a project-level audit status (`approved` or `needs_revision`).
* **Logic Rules**:
  * If approved, the backend automatically generates a verifiable cryptographic database `Certificate` entry containing a metadata payload (student name, project title, mentor name, approved timestamp, repository URL, demo URL, and standard audit verification messages).
  * Generates a platform-wide `certificate_issued` activity feed event.
* **Frontend View**: `/mentor/reviews` representing the Platform-wide Pending Submissions Review Board.

---

### 🌊 Role-Based End-to-End Example Flows

#### I. The Admin Flow Example: Platform Governance & Management
An administrator, **Elena**, is launching the "Fall 2026 Systems Cohort" on the platform. She needs to create the program, onboard a new mentor, and check on system activity.
1. **Admin Portal Login**: Elena logs into the platform with Admin privileges and accesses the control center dashboard.
2. **Program Creation**: She initializes a new cohort program.
   * **API Call**: `POST /api/v1/programs/`
   * **Payload**: `{ "name": "Fall 2026 Systems Cohort", "slug": "fall-2026-systems" }`
3. **User Promotion & Onboarding**: Elena locates "Marcus Vance" on the registered users directory and upgrades his access level to Mentor.
   * **API Call**: `PATCH /api/v1/dashboard/users/{user_id}/role`
   * **Payload**: `{ "role": "mentor" }`
   * **Result**: Marcus gains access to the `/mentor` management workspace.
4. **Platform-Wide Audit**: Elena views system activity highlights to track developer engagement across all cohorts.
   * **API Call**: `GET /api/v1/activity/recent`
   * **Result**: Displays recent project submissions, approved reviews, and certificates issued.

#### II. The Mentor Flow Example: Project Lifecycle Management
Marcus Vance is leading a team of 5 student developers building a project named *"LLM-Powered Code Review Bot"*.
1. **Workspace Initiation**: Marcus creates the project space.
   * **API Call**: `POST /api/v1/projects/`
   * **Payload**: `{ "title": "LLM Review Bot", "program_id": 1, "max_members": 5 }`
2. **Timeline Planning**: Marcus creates a new sprint.
   * **API Call**: `POST /api/v1/projects/{id}/sprints`
   * **Payload**: `{ "title": "Sprint 1: AST Parsers", "sprint_number": 1 }`
3. **Task Definition**: Marcus creates a highly challenging technical task under the sprint.
   * **API Call**: `POST /api/v1/projects/sprints/{sprint_id}/tasks`
   * **Payload**: `{ "title": "Write Python AST Parser", "skill_points": 120, "difficulty": "hard" }`
4. **Task Allocation**: He assigns the task directly to student "Aria Chen".
   * **API Call**: `POST /api/v1/tasks/{task_id}/assign`
   * **Payload**: `{ "user_ids": [aria_user_id] }`
5. **Active Guidance**: 
   * Marcus checks the active roster (`/mentor/students`) to see which developers have started work.
   * He monitors the daily standup checklist tracker to ensure students are updating their progress (`/mentor/reports`).
   * When Aria raises a **Stuck Flag** due to parser exceptions, Marcus discusses the issue with her in the real-time project room (`WS /ws/rooms/{project_id}`) and resolves the flag (`PATCH /api/v1/stuck_flags/{id}/resolve`).
6. **Task Submission Review**: When Aria submits her pull request, Marcus audits her codebase, inputs a grade, and leaves a comment.
   * **API Call**: `PATCH /api/v1/submissions/{submission_id}/review`
   * **Payload**: `{ "mentor_score": 95, "mentor_feedback": "Clean implementation of the NodeVisitor class." }`
   * **Result**: Aria's assignment is marked `reviewed`, and she is awarded 120 Skill Points.
7. **Certificate Graduation**: At the end of the project, Aria submits her complete project repository and demo. Marcus approves it, which mints her a public certificate of achievement.
   * **API Call**: `PATCH /api/v1/submissions/{project_submission_id}/review`
   * **Payload**: `{ "status": "approved", "feedback": "Fantastic project delivery." }`

#### III. The Student Flow Example: Implementation & Growth
**Aria Chen** is an aspiring software engineer enrolling in Marcus's project, completing tasks, building her public developer identity, and earning a shareable credential.
1. **Project Enrollment**: Aria joins the *"LLM Review Bot"* workspace.
   * **API Call**: `POST /api/v1/projects/1/join`
2. **Daily Check-In**: Every morning, Aria uses her dashboard to plan her daily milestones.
   * **API Call**: `POST /api/v1/daily/start-day`
   * **Payload**: `{ "todos": ["Draft test suite", "Configure regex patterns"] }`
3. **Execution & Support**: Aria writes her code. When she gets stuck, she raises a blocker:
   * **API Call**: `POST /api/v1/tasks/{task_id}/stuck`
   * She receives instant feedback from Marcus in the project chat, edits her logic, and they resolve the flag.
4. **Task Delivery**: Aria pushes her branch to GitHub and submits the PR link for review.
   * **API Call**: `POST /api/v1/tasks/{task_id}/submissions`
   * **Payload**: `{ "demo_url": "https://github.com/aria/review-bot/pull/3", "approach_notes": "Completed python parser" }`
5. **Daily Standup Reporting**: Every evening, Aria completes her standup report.
   * **API Call**: `POST /api/v1/daily/reports`
   * **Payload**: `{ "summary": "Finished python parser, resolved flickering test bugs.", "hours_spent": 6, "current_mood": "motivated" }`
6. **Earning Badges & Rank**: Once Marcus grades her task (95/100), she gets an in-app alert. The system processes her stats and unlocks the **System Architect** badge, updating her rank on the leaderboard.
7. **Completing Project**: Aria finishes all milestones and submits her project-level deployment.
   * **API Call**: `POST /api/v1/submissions/`
   * **Payload**: `{ "project_id": 1, "repo_url": "github.com/aria/review-bot", "demo_url": "reviewbot.dev" }`
8. **Public Showcase**: Aria shares her achievements with employers:
   * Her profile page (`/portfolio/aria-chen`) dynamically loads her contribution chart, total skill points, and unlocked badges in her 3D Galaxy.
   * Her verified certificate page (`/certify/{cert_id}`) displays public, cryptographically backed proof of her actual code contributions.

---

## 🔐 Default Credentials (Local Setup)

If you have run the database seeding script (`python app/seed.py`), you can use the following accounts to explore the platform:

| Role | Email | Password |
| :--- | :--- | :--- |
| **Admin** | `admin@codercorps.com` | `admin123` |
| **Mentor** | `mentor@codercorps.com` | `mentor123` |
| **Student** | `student1@codercorps.com` | `student123` |
| **Student (Alt)** | `student2@codercorps.com` | `student123` |

---

## 🛠 Getting Started

### Backend Setup
1. Navigate to `/backend`.
2. Create a virtual environment: `python -m venv venv`.
3. Install dependencies: `pip install -r requirements.txt`.
4. Configure `.env` (Database URL, JWT Secret).
5. Run migrations: `alembic upgrade head`.
6. Start server: `uvicorn app.main:app --reload`.

### Frontend Setup
1. Navigate to `/frontend`.
2. Install dependencies: `npm install`.
3. Configure `.env.local` (Backend API URL).
4. Start development server: `npm run dev`.
