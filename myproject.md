# CoderCorps: Developer Onboarding Guide

Welcome to **CoderCorps**! This guide is designed to help new developers understand the platform end-to-end, so you can start contributing quickly and effectively.

> [!NOTE]
> CoderCorps is a collaborative platform designed to bridge the gap between academic learning and real-world software engineering. It connects student developers with experienced mentors to build production-grade projects in simulated sprint cycles.

---

## 🏗️ Architecture & Tech Stack

The platform is split into a modern decoupled architecture: a React-based frontend and a Python-based asynchronous backend.

### Frontend
- **Framework:** Next.js 16 (App Router)
- **Language:** TypeScript
- **State Management:** Zustand (used for global caching and instant UI updates without redundant network requests)
- **Styling:** Tailwind CSS + Shadcn UI components
- **Live Collaboration:** Yjs + Monaco Editor (for real-time pair programming)
- **Build Tool:** Turbopack

### Backend
- **Framework:** FastAPI (Python 3)
- **Database:** PostgreSQL (accessed via SQLAlchemy ORM)
- **Concurrency:** Fully asynchronous. We use `asyncio.to_thread` for blocking DB operations to prevent event loop blocking.
- **Real-Time Communication:** WebSockets (for live chat, pair programming, and notifications)
- **Authentication:** JWT-based stateless auth (Tokens are stored securely in-memory on the frontend)

---

## 🚀 Core Features & Workflows

### 1. Role-Based Dashboards
The platform has three primary user roles:
- **Students:** Can join projects, view assigned tasks, submit PRs, and track their gamified progression (XP/Certificates).
- **Mentors:** Can create sprint cycles, assign tasks to multiple students, review code submissions, and issue verifiable certificates.
- **Admins:** Oversee platform analytics and manage global resources.

### 2. Project Workspaces & Sprints
Every project operates like a real-world agile team:
- **Sprints:** Mentors define 2-week sprint cycles with specific goals.
- **Task Management:** A Kanban board (To Do, In Progress, Review, Done) tracks engineering tickets.
- **Multi-Assign:** A single task can be assigned to multiple students (e.g., for pair programming or collaborative tickets).

### 3. Live Pair Programming Room
- A dedicated route (`/projects/[id]/pair`) provides a real-time collaborative code editor.
- Powered by **Yjs** (CRDTs) and **Monaco Editor** (the engine behind VS Code).
- WebSockets synchronize keystrokes instantly across all connected clients in the room.

### 4. Code Review & Auditing
- Students submit their work (GitHub Repo + Demo URLs) for a final audit.
- Mentors review the submission and can provide feedback or approve it.
- Approvals automatically generate a **Verifiable Certificate** that students can display on their public portfolio.

### 5. Gamified Progression & "Skill Galaxy"
A core feature designed to motivate students and provide recruiters with a verifiable "Proof-of-Work".
- **Skill Points (SP):** Students earn SP by completing tasks. The amount awarded depends on task difficulty, AI-evaluated PR code quality, and Mentor scores.
- **Skill Galaxy:** Technical domains (e.g., React, PostgreSQL, Docker) are mapped as interconnected nodes in a constellation map on the UI.
- **Unlocking Nodes:** Students start with locked nodes. As they submit audited, merged code related to those skills, the nodes illuminate.
- **Recruiter Flow:** Hiring managers can filter candidates by exactly which `SkillNodes` they have proven competency in (e.g., "Show me students who unlocked AWS and Python").

---

## 📂 Project Directory Structure

### Frontend (`frontend/`)
```
frontend/
├── src/
│   ├── app/             # Next.js App Router (pages & layouts)
│   │   ├── (auth)/      # Login/Signup routes
│   │   └── (platform)/  # Dashboard, Projects, Pair Room, etc.
│   ├── components/      # Reusable UI components (Shadcn + Custom)
│   ├── hooks/           # Custom React hooks (e.g., useRoomSocket)
│   ├── lib/             # Utilities (api.ts, auth.tsx, mockDb.ts)
│   └── stores/          # Zustand global state (e.g., useProjectWorkspaceStore)
```

### Backend (`backend/`)
```
backend/
├── app/
│   ├── api/v1/          # FastAPI Route endpoints (projects, sprints, etc.)
│   ├── core/            # Config, security, and JWT logic
│   ├── db/              # Database connection and session management
│   ├── models/          # SQLAlchemy ORM definitions (SQL tables)
│   ├── schemas/         # Pydantic models (Request/Response validation)
│   └── services/        # Business logic and external API integrations
├── tests/               # Pytest suite
└── requirements.txt     # Python dependencies
```

---

## 🗄️ Core Database Schema Overview
- **Users**: Core identity table storing Students, Mentors, and Admins.
- **Projects & ProjectMembers**: Many-to-many relationship defining who works on what.
- **Sprints & Tasks**: Sprints belong to Projects. Tasks belong to Sprints.
- **TaskAssignments**: A many-to-many junction table allowing a single task to be assigned to multiple students.
- **TaskSubmissions**: Tracks PRs, Demo URLs, and stores both the AI evaluation score and Mentor score.
- **Certificates**: Immutable records issued to students upon successful deliverable audits.
- **SkillNodes & UserSkills**: Tracks the Gamified Progression mapping for the Skill Galaxy.

---

## 🛠️ State Management (Zustand)

We use **Zustand** extensively to optimize frontend performance and eliminate redundant loading spinners. 
If you are building a new feature that fetches data, you should create or use a Zustand store in `src/stores/`.

**Key Stores:**
- `useProjectWorkspaceStore`: Caches project details, sprints, and tasks with a 30-second TTL.
- `useDashboardStore`: Caches dashboard metrics and recent submissions.
- `useNotificationStore`: Manages real-time alerts and unread counts.

> [!TIP]
> When mutating data (like changing a task status), apply **optimistic updates** directly to the Zustand store state so the UI reacts instantly, rather than waiting for the backend to respond.

---

## 🔌 WebSocket Implementation

WebSockets are heavily utilized for live features.
- Connections are authenticated using the JWT token passed as a query parameter (`?token=...`).
- Because tokens are stored in-memory (not in cookies), the frontend uses `getToken()` from the `useAuth()` context to securely grab the active token before establishing a WebSocket connection.

---

## 🚦 Local Development Setup (Quickstart)

1. **Clone the repository** and ensure you have Node.js 20+ and Python 3.11+ installed.
2. **Backend:**
   - Navigate to the `backend/` directory.
   - Install dependencies: `pip install -r requirements.txt`
   - Start FastAPI: `uvicorn app.main:app --reload`
3. **Frontend:**
   - Navigate to the `frontend/` directory.
   - Install dependencies: `npm install`
   - Start Next.js with Turbopack: `npm run dev`
4. **Mock Database:**
   - For rapid UI prototyping without running Postgres, the frontend has a mock database interceptor in `src/lib/mockDb.ts`. You can toggle `FORCE_MOCK = true` in `api.ts` to bypass the backend entirely.

> [!IMPORTANT]
> Always run `npx tsc --noEmit` on the frontend and `pytest` on the backend before submitting a Pull Request. We maintain strict type safety across the entire stack.
