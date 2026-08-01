# Frontend Action Inventory — CoderCorps

> **PASS 1 & PASS 2 & PASS 3 Complete** — 2026-08-01  
> Total Interactive Actions Catalogued & Verified: 51 | Tested: 51 | Passing: 51 | Failing: 0 | Blocked: 0

---

## Summary

| Stat | Count |
|------|-------|
| Total actions catalogued | 51 |
| Tested | 51 |
| PASS | 51 |
| FAIL | 0 |
| BLOCKED | 0 |

---

## Complete Action Inventory Table

| # | Page/Component | Element | Trigger | Expected Behavior | Role | Line | Status |
|---|---|---|---|---|---|---|---|
| 1 | `app/(auth)/login/page.tsx` | `<form>` | `onSubmit` | `handleLogin` calls `/auth/token`, sets token, redirects to dashboard | Any | 36 | PASS |
| 2 | `app/(auth)/login/page.tsx` | `<Link>` | `onClick` | Navigate to `/signup` | Any | 71 | PASS |
| 3 | `app/(auth)/login/page.tsx` | `<Link>` | `onClick` | Navigate to `/forgot-password` | Any | 63 | PASS |
| 4 | `app/(auth)/signup/page.tsx` | `<form>` | `onSubmit` | `handleSignup` calls `/auth/signup`, sets token, redirects | Any | 37 | PASS |
| 5 | `app/(auth)/signup/page.tsx` | `<select>` | `onChange` | Updates role state (student/mentor) | Any | 85 | PASS |
| 6 | `app/(auth)/signup/page.tsx` | `<Link>` | `onClick` | Navigate to `/login` | Any | 100 | PASS |
| 7 | `app/(auth)/forgot-password/page.tsx` | `<form>` | `onSubmit` | `handleSubmit` triggers password reset flow | Any | 17 | PASS |
| 8 | `app/(auth)/forgot-password/page.tsx` | `<Link>` | `onClick` | Navigate to `/login` | Any | 51 | PASS |
| 9 | `app/(marketing)/page.tsx` | `<Link>` | `onClick` | Navigate to `/login` | Any | 72 | PASS |
| 10 | `app/(marketing)/layout.tsx` | `<button>` | `onClick` | Toggles mobile navigation menu | Any | 45 | PASS |
| 11 | `app/(marketing)/layout.tsx` | `<Link>` | `onClick` | Navigates to marketing sections (about, apply, etc.) | Any | 60 | PASS |
| 12 | `app/(marketing)/apply/page.tsx` | `<form>` | `onSubmit` | `handleApply` submits application data to backend | Any | 22 | PASS |
| 13 | `app/(marketing)/contact/page.tsx` | `<form>` | `onSubmit` | `handleSubmit` sends contact message | Any | 15 | PASS |
| 14 | `app/(marketing)/assessment/candidate/[token]/page.tsx` | `<Button>` | `onClick` | `startAssessment` begins timer and fetches questions | Candidate | 125 | PASS |
| 15 | `app/(marketing)/assessment/candidate/[token]/page.tsx` | `<button>` | `onClick` | `handleOptionSelect(idx)` records option choice | Candidate | 295 | PASS |
| 16 | `app/(marketing)/assessment/candidate/[token]/page.tsx` | `<Button>` | `onClick` | `handleNext` moves to next question | Candidate | 317 | PASS |
| 17 | `app/(marketing)/assessment/candidate/[token]/page.tsx` | `<Button>` | `onClick` | `submitAssessment` submits test and shows score | Candidate | 167 | PASS |
| 18 | `app/(pending)/mentor/pending-approval/page.tsx` | `<Button>` | `onClick` | `logout` clears token and redirects to `/login` | Mentor | 34 | PASS |
| 19 | `app/(pending)/student/pending-approval/page.tsx` | `<Button>` | `onClick` | `logout` clears token and redirects to `/login` | Student | 35 | PASS |
| 20 | `app/(platform)/layout.tsx` | `<Link>` | `onClick` | Sidebar navigation to platform sections | Authenticated | 45 | PASS |
| 21 | `app/(platform)/layout.tsx` | `<Button>` | `onClick` | `logout` triggers logout | Authenticated | 98 | PASS |
| 22 | `app/(platform)/dashboard/page.tsx` | `<Link>` | `onClick` | Navigation to projects, assessments, etc. | Authenticated | 50 | PASS |
| 23 | `app/(platform)/today/page.tsx` | `<form>` | `onSubmit` | `submitReport` posts daily standup | Authenticated | 60 | PASS |
| 24 | `app/(platform)/today/page.tsx` | `<button>` | `onClick` | `toggleTodoStatus` updates todo state | Authenticated | 88 | PASS |
| 25 | `app/(platform)/projects/page.tsx` | `<Button>` | `onClick` | `handleJoinProject` assigns user to project | Authenticated | 45 | PASS |
| 26 | `app/(platform)/projects/[id]/manage/page.tsx` | `<form>` | `onSubmit` | `handleCreateSprint` sets up new sprint | Mentor/Admin | 55 | PASS |
| 27 | `app/(platform)/projects/[id]/manage/page.tsx` | `<Button>` | `onClick` | `handleAssignTask` assigns a ticket | Mentor/Admin | 75 | PASS |
| 28 | `app/(platform)/projects/[id]/room/page.tsx` | `WebsocketProvider` | `Connection` | Initializes YJS collaboration session | Authenticated | 32 | PASS |
| 29 | `app/(platform)/projects/[id]/approval-thread/page.tsx` | `<form>` | `onSubmit` | `sendMessage` posts to thread | Mentor/Admin | 45 | PASS |
| 30 | `app/(platform)/projects/[id]/approval-thread/page.tsx` | `<Button>` | `onClick` | `handleApprove` approves project | Mentor/Admin | 88 | PASS |
| 31 | `app/(platform)/assessments/page.tsx` | `<Button>` | `onClick` | `handleStart` routes to assessment UI | Authenticated | 65 | PASS |
| 32 | `app/(platform)/assessments/[id]/take/page.tsx` | `<Button>` | `onClick` | `handleNext` advances test question | Authenticated | 120 | PASS |
| 33 | `app/(platform)/assessments/[id]/take/page.tsx` | `window` | `visibilitychange` | Tracks tab switches (anti-cheat) | Authenticated | 45 | PASS |
| 34 | `app/(platform)/portfolio/page.tsx` | `<input>` | `onChange` | `handleFileChange` uploads avatar | Authenticated | 45 | PASS |
| 35 | `app/(platform)/portfolio/page.tsx` | `<form>` | `onSubmit` | `handleSubmit` updates profile settings | Authenticated | 77 | PASS |
| 36 | `app/(platform)/portfolio/page.tsx` | `<button>` | `onClick` | `handleCopyLink` copies public URL | Authenticated | 124 | PASS |
| 37 | `app/(platform)/settings/page.tsx` | `<button>` | `onClick` | `setActiveTab` changes settings view | Authenticated | 192 | PASS |
| 38 | `app/(platform)/settings/page.tsx` | `<form>` | `onSubmit` | `handleProfileSubmit` saves portfolio | Authenticated | 99 | PASS |
| 39 | `app/(platform)/settings/page.tsx` | `<form>` | `onSubmit` | `handleAccountSubmit` updates security | Authenticated | 140 | PASS |
| 40 | `app/(platform)/admin/projects/pending/page.tsx` | `<Button>` | `onClick` | `handleApprove` approves new project | Admin | 39 | PASS |
| 41 | `app/(platform)/admin/mentors/pending/page.tsx` | `<Button>` | `onClick` | `handleReject` rejects mentor app | Admin | 53 | PASS |
| 42 | `app/(platform)/admin/candidates/page.tsx` | `<button>` | `onClick` | `setStatusFilter` updates list view | Admin | 245 | PASS |
| 43 | `app/(platform)/admin/candidates/page.tsx` | `<Button>` | `onClick` | `handleResendInvitation` sends link | Admin | 169 | PASS |
| 44 | `app/(platform)/mentor/reviews/page.tsx` | `<form>` | `onSubmit` | `handleReviewSubmit` posts review feedback | Mentor | 66 | PASS |
| 45 | `app/(platform)/mentor/reports/page.tsx` | `<select>` | `onChange` | `setSelectedProjectId` filters reports | Mentor | 240 | PASS |
| 46 | `app/(platform)/mentor/reports/page.tsx` | `<Button>` | `onClick` | `handleSaveFeedback` saves daily review | Mentor | 148 | PASS |
| 47 | `app/(platform)/mentor/assessments/page.tsx` | `<form>` | `onSubmit` | `handleCreateAssessment` saves config | Mentor/Admin | 189 | PASS |
| 48 | `app/(platform)/recruiters/page.tsx` | `<form>` | `onSubmit` | `handleSearch` searches candidates | Recruiter | 54 | PASS |
| 49 | `app/(platform)/messages/page.tsx` | `<button>` | `onClick` | Loads specific chat thread | Authenticated | 112 | PASS |
| 50 | `app/(platform)/messages/page.tsx` | `<form>` | `onSubmit` | `sendMessage` sends direct message | Authenticated | 77 | PASS |
| 51 | `app/(platform)/rooms/[id]/page.tsx` | `WebsocketProvider` | `Connection` | `handleEditorDidMount` connects collab | Authenticated | 20 | PASS |
