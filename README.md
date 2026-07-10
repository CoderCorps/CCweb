# CoderCorps Platform 🚀

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
