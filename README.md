# CoderCorps Platform 🚀

[![CI Pipeline](https://github.com/CoderCorps/CCweb/actions/workflows/ci.yml/badge.svg)](https://github.com/CoderCorps/CCweb/actions/workflows/ci.yml)

A modern engineering accelerator platform built for community-led project development, code reviews, and verifiable project completion credentials.

## 🏗️ Tech Stack

- **Frontend**: Next.js 14+ (App Router) + React + TypeScript + Tailwind CSS + Framer Motion + GSAP
- **Backend**: Python FastAPI + SQLAlchemy ORM + Pydantic v2 + SQLite/PostgreSQL (Supabase)
- **Database**: SQLite (local dev) / Supabase PostgreSQL (production)
- **Theme Support**: Complete Light/Dark Mode with local state persistence and animated toggle
- **Assets**: Animated custom GIF logo, video backgrounds, and interactive SVG-drawing loops

---

## 📁 Repository Structure

```
├── backend/                  # Python FastAPI application
│   ├── app/                  # FastAPI router, models, schemas, and logic
│   ├── alembic/              # Database migration history
│   ├── codercorps.db         # Local SQLite developer database (gitignored)
│   ├── requirements.txt      # Python package dependencies
│   └── venv/                 # Local python virtual environment (gitignored)
│
├── frontend/                 # Next.js frontend application
│   ├── src/
│   │   ├── app/              # App router (auth, marketing, platform dashboards)
│   │   ├── components/       # Reusable UI elements (cards, theme toggles, buttons)
│   │   └── lib/              # API utilities and Auth provider contexts
│   ├── public/               # Static assets (logos, mp4/gif elements)
│   ├── package.json          # Node dependency configurations
│   └── tsconfig.json         # TypeScript compiler configurations
│
└── .gitignore                # Root gitignore rules
```

---

## ⚡ Quick Start

### 1. Run the Backend (FastAPI)
```bash
cd backend
# Create and activate virtual environment
python -m venv venv
.\venv\Scripts\activate   # Windows
source venv/bin/activate  # Unix/macOS

# Install packages & run migrations
pip install -r requirements.txt
alembic upgrade head

# Start server
uvicorn app.main:app --reload --port 8000
```

### 2. Run the Frontend (Next.js)
```bash
cd frontend
npm install
npm run dev
```

Visit the app at [http://localhost:3000](http://localhost:3000).

---

## 🌟 New Features (Phase 6)

1. **Public Activity Feed**: A real-time activity feed on the homepage showing community highlights (submission reviews, project starts, certificate completions). Backed by a clean backend logging table and Framer Motion animation.
2. **Verifiable Certificates**: Public `/certify/[id]` routes displaying verified credentials without exposing private data. Includes custom Open Graph sharing templates and clipboard linking.
3. **GitHub Contribution Graphs**: Automatic SVG contribution graph embeds integrated directly into public developer portfolios, using `ghchart.rshah.org`.
4. **Mentor Availability Widget**: Allows mentors to state their office hours/mentorship availability inside settings, displayed publicly on the Core Board flip cards.
5. **Command Palette (⌘K)**: Quick, keyboard-accessible command menu (`Cmd+K`/`Ctrl+K`) for seamless navigation between platform workspaces. Role-aware dashboard routing.

---

## ⏰ Scheduled Tasks & Cron

The accountability features (carrying over uncompleted todos and triggering missing standup alerts) are executed via a scheduled background script. 

To configure this job in production (e.g., Render Cron or Railway Scheduled Jobs) or locally, schedule the following command to run daily once per evening (e.g., at 11:59 PM server time):

```bash
cd backend
# Activate virtual environment
.\venv\Scripts\activate   # Windows
source venv/bin/activate  # Unix/macOS

# Run accountability job
python -m app.cron.accountability

# Run digest jobs (Daily or Weekly)
python -m app.cron.digest --daily
python -m app.cron.digest --weekly
```

---

## 🚧 Not Yet Implemented

1. **Email Notification Dispatch**: Live email delivery (e.g. via Resend or SMTP hooks) is not yet active. Notifications (including the daily/weekly mentor digests and accountability alerts) are dispatched and stored exclusively in-app via the notifications table. Integrating an external email service provider (like Resend) remains a developer roadmap TODO.
