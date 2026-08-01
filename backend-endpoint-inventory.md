# Backend Endpoint Inventory — CoderCorps

> **PASS 1 & PASS 2 & PASS 3 Complete** — 2026-08-02  
> Total Endpoints: 126 | Tested: 126 | Passing: 126 | Failing: 0 | Blocked: 0

---

## Summary

| Stat | Count |
|------|-------|
| Total endpoints | 126 |
| Tested | 126 |
| PASS | 126 |
| FAIL | 0 |
| BLOCKED | 0 |
| Bugs Discovered & Fixed | 1 (BUG-001: Critical Admin Role Enforcement) |


---

## Router Prefix Map (from `backend/app/main.py`)

| Router File | Prefix |
|---|---|
| `auth.py` | `/api/v1/auth` |
| `public_apply.py` | `/api/v1` (also mounted at root `/`) |
| `admin.py` | `/api/v1/admin` |
| `admin_candidates.py` | `/api/v1/admin` |
| `programs.py` | `/api/v1/programs` |
| `projects.py` | `/api/v1/projects` |
| `submissions.py` | `/api/v1/submissions` |
| `portfolio.py` | `/api/v1/portfolio` |
| `dashboard.py` | `/api/v1/dashboard` |
| `contact.py` | `/api/v1/contact` |
| `mentors.py` | `/api/v1/mentors` |
| `activity.py` | `/api/v1/activity` |
| `certificates.py` | `/api/v1/certificates` |
| `tasks.py` | `/api/v1` (no sub-prefix) |
| `daily.py` | `/api/v1/daily` |
| `rooms.py` | `` (no prefix — routes include full path) |
| `notifications.py` | `/api/v1/notifications` |
| `badges.py` | `/api/v1/badges` |
| `messages.py` | `/api/v1/messages` |
| `reactions.py` | `/api/v1/reactions` |
| `task_comments.py` | `/api/v1/task-comments` |
| `announcements.py` | `/api/v1/announcements` |
| `stuck_flags.py` | `/api/v1/stuck-flags` |
| `peer_reviews.py` | `/api/v1/peer-review` |
| `resources.py` | `/api/v1/resources` |
| `quizzes.py` | `/api/v1/quizzes` |
| `assessments.py` | `/api/v1/assessments` |
| `webhooks.py` | `/api/v1/webhooks` |
| `recruiters.py` | `/api/v1/recruiters` |

---

## auth.py

| # | Method | Full Path | Purpose | Auth | Role | Body/Params | Status |
|---|--------|-----------|---------|------|------|-------------|--------|
| 1 | POST | `/api/v1/auth/signup` | Create new user account | None | public | `{name, email, password, role}` — students blocked unless they have a passed assessment | PASS |
| 2 | POST | `/api/v1/auth/login` | Authenticate user, return JWT | None | public | form-data `{username, password}` | PASS |
| 3 | POST | `/api/v1/auth/refresh` | Refresh access token using HttpOnly cookie | cookie `refresh_token` | any | None | PASS |
| 4 | GET | `/api/v1/auth/me` | Get current user profile | Bearer JWT | any | None | PASS |
| 5 | POST | `/api/v1/auth/logout` | Clear refresh token cookie | None | any | None | PASS |
| 6 | POST | `/api/v1/auth/forgot-password` | Send password reset email | None | public | `{email}` | PASS |
| 7 | PATCH | `/api/v1/auth/account` | Update account (name/password/avatar) | Bearer JWT | any | `{name?, password?, avatar_url?}` | PASS |

---

## public_apply.py

| # | Method | Full Path | Purpose | Auth | Role | Body/Params | Status |
|---|--------|-----------|---------|------|------|-------------|--------|
| 8 | POST | `/api/v1/apply` | Submit internship application, trigger assessment email | None | public | `{name, email, phone?, college?, why_join?, linkedin_url?, github_url?, resume_url?, instagram_url?}` | PASS |
| 9 | GET | `/api/v1/assessment/candidate/{token}/status` | Get assessment status for token | None | public (token) | path: `token` | PASS |
| 10 | POST | `/api/v1/assessment/candidate/{token}/start` | Start assessment attempt | None | public (token) | path: `token` | PASS |
| 11 | GET | `/api/v1/assessment/candidate/{token}/current-question` | Get current active question | None | public (token) | path: `token` | PASS |
| 12 | POST | `/api/v1/assessment/candidate/{token}/answer` | Submit answer to current question | None | public (token) | path: `token`, body: `{question_id, selected_option_index}` | PASS |
| 13 | GET | `/api/v1/assessment/candidate/{token}/result` | Get assessment result | None | public (token) | path: `token` | PASS |

---

## admin.py

| # | Method | Full Path | Purpose | Auth | Role | Body/Params | Status |
|---|--------|-----------|---------|------|------|-------------|--------|
| 14 | GET | `/api/v1/admin/mentors/pending` | List pending mentor applications | Bearer | admin | None | PASS |
| 15 | POST | `/api/v1/admin/mentors/{id}/approve` | Approve a mentor | Bearer | admin | path: `id` | PASS |
| 16 | POST | `/api/v1/admin/users/{id}/approve` | Approve any user | Bearer | admin | path: `id` | PASS |
| 17 | POST | `/api/v1/admin/candidates/approve` | Approve candidate application | Bearer | admin | `{email}` | PASS |
| 18 | POST | `/api/v1/admin/mentors/{id}/reject` | Reject a mentor | Bearer | admin | path: `id`, body: `{reason}` | PASS |
| 19 | GET | `/api/v1/admin/projects/pending` | List pending projects | Bearer | admin | None | PASS |
| 20 | POST | `/api/v1/admin/projects/{id}/approve` | Approve a project | Bearer | admin | path: `id` | PASS |
| 21 | POST | `/api/v1/admin/projects/{id}/reject` | Reject a project | Bearer | admin | path: `id`, body: `{reason}` | PASS |

---

## admin_candidates.py

| # | Method | Full Path | Purpose | Auth | Role | Body/Params | Status |
|---|--------|-----------|---------|------|------|-------------|--------|
| 22 | GET | `/api/v1/admin/candidate-applications` | List all candidate applications with filters | Bearer | admin | query: `status?, search?` | PASS |
| 23 | GET | `/api/v1/admin/candidate-applications/{id}` | Get full candidate application detail | Bearer | admin | path: `id` | PASS |
| 24 | POST | `/api/v1/admin/candidate-applications/{id}/resend-invitation` | Resend assessment invitation email | Bearer | admin | path: `id` | PASS |

---

## programs.py

| # | Method | Full Path | Purpose | Auth | Role | Body/Params | Status |
|---|--------|-----------|---------|------|------|-------------|--------|
| 25 | GET | `/api/v1/programs/` | List all programs | Bearer | any | None | PASS |
| 26 | GET | `/api/v1/programs/{id}` | Get single program | Bearer | any | path: `id` | PASS |
| 27 | POST | `/api/v1/programs/` | Create program | Bearer | admin/mentor | `{name, description, ...}` | PASS |

---

## projects.py

| # | Method | Full Path | Purpose | Auth | Role | Body/Params | Status |
|---|--------|-----------|---------|------|------|-------------|--------|
| 28 | GET | `/api/v1/projects/` | List projects for current user | Bearer | any | None | PASS |
| 29 | POST | `/api/v1/projects/` | Create new project | Bearer | mentor | `{title, description, ...}` | PASS |
| 30 | GET | `/api/v1/projects/{id}` | Get project detail | Bearer | any | path: `id` | PASS |
| 31 | POST | `/api/v1/projects/{id}/join` | Student joins a project | Bearer | student | path: `id` | PASS |
| 32 | POST | `/api/v1/projects/{id}/assign` | Mentor assigns student to project sprint/task | Bearer | mentor | path: `id`, body: `{student_id, sprint_id?, ...}` | PASS |
| 33 | GET | `/api/v1/projects/{id}/assignable-students` | Get students eligible to assign | Bearer | mentor | path: `id` | PASS |
| 34 | POST | `/api/v1/projects/{id}/members` | Add member to project | Bearer | mentor | path: `id`, body: `{student_id}` | PASS |
| 35 | DELETE | `/api/v1/projects/{id}/members/{user_id}` | Remove member from project | Bearer | mentor | path: `id`, `user_id` | PASS |
| 36 | GET | `/api/v1/projects/{id}/members` | List project members | Bearer | any | path: `id` | PASS |
| 37 | POST | `/api/v1/projects/{id}/sprints/{sprint_id}/tasks` | Create task in sprint | Bearer | mentor | path: `id`, `sprint_id` | PASS |
| 38 | GET | `/api/v1/projects/{id}/leaderboard` | Get project leaderboard | Bearer | any | path: `id` | PASS |
| 39 | GET | `/api/v1/projects/{id}/sprints` | List sprints for project | Bearer | any | path: `id` | PASS |
| 40 | POST | `/api/v1/projects/{id}/sprints` | Create sprint for project | Bearer | mentor | path: `id` | PASS |
| 41 | GET | `/api/v1/projects/sprints/{sprint_id}/tasks` | Get tasks for sprint | Bearer | any | path: `sprint_id` | PASS |
| 42 | POST | `/api/v1/projects/sprints/{sprint_id}/tasks` | Create task (alt route) | Bearer | mentor | path: `sprint_id` | PASS |
| 43 | PATCH | `/api/v1/projects/tasks/{task_id}` | Update task | Bearer | mentor | path: `task_id` | PASS |
| 44 | GET | `/api/v1/projects/{id}/announcements` | List project announcements | Bearer | member | path: `id` | PASS |
| 45 | POST | `/api/v1/projects/{id}/announcements` | Create announcement | Bearer | mentor | path: `id` | PASS |
| 46 | GET | `/api/v1/projects/{id}/stuck-flags` | Get stuck flags for project | Bearer | mentor | path: `id` | PASS |
| 47 | GET | `/api/v1/projects/{id}/resources` | List project resources | Bearer | member | path: `id` | PASS |
| 48 | POST | `/api/v1/projects/{id}/resources` | Create resource link | Bearer | mentor | path: `id` | PASS |
| 49 | GET | `/api/v1/projects/{id}/approval-thread` | Get approval thread messages | Bearer | member | path: `id` | PASS |
| 50 | WS | `/api/v1/projects/{id}/approval-thread/ws` | Approval thread WebSocket | token param | member | path: `id`, query: `token` | PASS |

---

## submissions.py

| # | Method | Full Path | Purpose | Auth | Role | Body/Params | Status |
|---|--------|-----------|---------|------|------|-------------|--------|
| 51 | POST | `/api/v1/submissions/` | Submit a PR/work | Bearer | student | `{project_id, pr_url, description}` | PASS |
| 52 | GET | `/api/v1/submissions/{id}` | Get submission by ID | Bearer | any | path: `id` | PASS |
| 53 | PATCH | `/api/v1/submissions/{id}/review` | Mentor reviews submission | Bearer | mentor | path: `id`, body: `{status, feedback}` | PASS |

---

## portfolio.py

| # | Method | Full Path | Purpose | Auth | Role | Body/Params | Status |
|---|--------|-----------|---------|------|------|-------------|--------|
| 54 | GET | `/api/v1/portfolio` | List public portfolio usernames | None | public | None | PASS |
| 55 | GET | `/api/v1/portfolio/{username}` | Get public portfolio for username | None | public | path: `username` | PASS |
| 56 | PATCH | `/api/v1/portfolio/me` | Update own profile (bio, skills, github, etc.) | Bearer | any | `{bio?, skills?, github_url?, linkedin_url?, resume_url?}` | PASS |

---

## dashboard.py

| # | Method | Full Path | Purpose | Auth | Role | Body/Params | Status |
|---|--------|-----------|---------|------|------|-------------|--------|
| 57 | GET | `/api/v1/dashboard/summary` | Get dashboard stats summary | Bearer | any | None | PASS |
| 58 | PATCH | `/api/v1/dashboard/users/{user_id}/role` | Change user role (admin) | Bearer | admin | path: `user_id`, body: `{role}` | PASS |

---

## contact.py

| # | Method | Full Path | Purpose | Auth | Role | Body/Params | Status |
|---|--------|-----------|---------|------|------|-------------|--------|
| 59 | POST | `/api/v1/contact/` | Submit contact form | None | public | `{name, email, subject, message}` | PASS |

---

## mentors.py

| # | Method | Full Path | Purpose | Auth | Role | Body/Params | Status |
|---|--------|-----------|---------|------|------|-------------|--------|
| 60 | POST | `/api/v1/mentors/me/notify-admin` | Mentor sends admin notification | Bearer | mentor | `{message}` | PASS |
| 61 | GET | `/api/v1/mentors/{id}/students` | Get students for mentor | Bearer | mentor/admin | path: `id` | PASS |

---

## activity.py

| # | Method | Full Path | Purpose | Auth | Role | Body/Params | Status |
|---|--------|-----------|---------|------|------|-------------|--------|
| 62 | GET | `/api/v1/activity/recent` | Get recent activity events | Bearer | any | None | PASS |

---

## certificates.py

| # | Method | Full Path | Purpose | Auth | Role | Body/Params | Status |
|---|--------|-----------|---------|------|------|-------------|--------|
| 63 | GET | `/api/v1/certificates/{cert_id}` | Get public certificate by ID | None | public | path: `cert_id` | PASS |

---

## tasks.py (prefix: `/api/v1`)

| # | Method | Full Path | Purpose | Auth | Role | Body/Params | Status |
|---|--------|-----------|---------|------|------|-------------|--------|
| 64 | POST | `/api/v1/external/google-form-submission` | Google Forms webhook to create task | None/secret | external | form payload | PASS |
| 65 | POST | `/api/v1/tasks/{id}/assign` | Assign task to student(s) | Bearer | mentor | path: `id`, body: `{student_ids}` | PASS |
| 66 | GET | `/api/v1/tasks/{id}/assignments` | Get assignments for task | Bearer | any | path: `id` | PASS |
| 67 | PATCH | `/api/v1/task-assignments/{id}` | Update assignment status | Bearer | student/mentor | path: `id` | PASS |
| 68 | POST | `/api/v1/tasks/{id}/submissions` | Submit work for task | Bearer | student | path: `id`, body: `{pr_url, description}` | PASS |
| 69 | GET | `/api/v1/tasks/{id}/submissions` | Get submissions for task | Bearer | mentor | path: `id` | PASS |
| 70 | PATCH | `/api/v1/task-submissions/{id}/review` | Mentor reviews task submission | Bearer | mentor | path: `id`, body: `{status, feedback}` | PASS |
| 71 | POST | `/api/v1/task-submissions/{id}/ai-review` | Trigger AI code review | Bearer | mentor | path: `id` | PASS |
| 72 | GET | `/api/v1/tasks/{id}/comments` | Get task comments | Bearer | member | path: `id` | PASS |
| 73 | POST | `/api/v1/tasks/{id}/comments` | Post comment on task | Bearer | member | path: `id`, body: `{content}` | PASS |
| 74 | POST | `/api/v1/tasks/{id}/stuck` | Flag task as stuck | Bearer | student | path: `id`, body: `{reason}` | PASS |
| 75 | POST | `/api/v1/tasks/{id}/peer-review` | Submit peer review for task | Bearer | student | path: `id`, body: `{...}` | PASS |

---

## daily.py

| # | Method | Full Path | Purpose | Auth | Role | Body/Params | Status |
|---|--------|-----------|---------|------|------|-------------|--------|
| 76 | GET | `/api/v1/daily/todos` | Get daily todos for date | Bearer | any | query: `date` | PASS |
| 77 | POST | `/api/v1/daily/start-day` | Start day with todos | Bearer | any | `{project_id, date, todos[]}` | PASS |
| 78 | PATCH | `/api/v1/daily/todos/{id}` | Update todo status | Bearer | any | path: `id`, body: `{status}` | PASS |
| 79 | POST | `/api/v1/daily/reports` | Submit daily standup report | Bearer | student | `{project_id, date, summary, blockers?, links?, hours_spent?}` | PASS |
| 80 | GET | `/api/v1/daily/reports` | Get daily reports | Bearer | mentor | query: `project_id, date?` | PASS |
| 81 | PATCH | `/api/v1/daily/reports/{id}/feedback` | Add mentor feedback to report | Bearer | mentor | path: `id`, body: `{feedback}` | PASS |
| 82 | GET | `/api/v1/daily/reports/missing` | Get students missing reports | Bearer | mentor | query: `project_id, date` | PASS |

---

## rooms.py (no prefix — full paths defined in router)

| # | Method | Full Path | Purpose | Auth | Role | Body/Params | Status |
|---|--------|-----------|---------|------|------|-------------|--------|
| 83 | GET | `/api/v1/rooms/{project_id}/messages` | Get room message history | Bearer | member | path: `project_id` | PASS |
| 84 | WS | `/ws/rooms/{project_id}` | Real-time chat WebSocket | token param | member | path: `project_id`, query: `token` | PASS |
| 85 | WS | `/ws/yjs/{project_id}` | Y.js collaborative editing WebSocket | token param | member | path: `project_id`, query: `token` | PASS |

---

## notifications.py

| # | Method | Full Path | Purpose | Auth | Role | Body/Params | Status |
|---|--------|-----------|---------|------|------|-------------|--------|
| 86 | GET | `/api/v1/notifications/` | List user notifications | Bearer | any | None | PASS |
| 87 | PATCH | `/api/v1/notifications/{id}/read` | Mark notification as read | Bearer | any | path: `id` | PASS |
| 88 | PATCH | `/api/v1/notifications/read-all` | Mark all notifications as read | Bearer | any | None | PASS |

---

## badges.py

| # | Method | Full Path | Purpose | Auth | Role | Body/Params | Status |
|---|--------|-----------|---------|------|------|-------------|--------|
| 89 | GET | `/api/v1/badges/` | List all badges | Bearer | any | None | PASS |
| 90 | GET | `/api/v1/badges/my` | Get current user's badges | Bearer | any | None | PASS |
| 91 | GET | `/api/v1/badges/user/{user_id}` | Get badges for specific user | Bearer | any | path: `user_id` | PASS |
| 92 | POST | `/api/v1/badges/` | Create badge (admin) | Bearer | admin | `{name, description, image_url, criteria_type, criteria_value}` | PASS |

---

## messages.py

| # | Method | Full Path | Purpose | Auth | Role | Body/Params | Status |
|---|--------|-----------|---------|------|------|-------------|--------|
| 93 | GET | `/api/v1/messages/threads` | List DM thread previews | Bearer | any | None | PASS |
| 94 | GET | `/api/v1/messages/thread/{user_id}` | Get DM thread with user | Bearer | any | path: `user_id` | PASS |
| 95 | POST | `/api/v1/messages` | Send DM to user | Bearer | any | `{recipient_id, content}` | PASS |
| 96 | PATCH | `/api/v1/messages/{id}/read` | Mark DM as read | Bearer | any | path: `id` | PASS |

---

## reactions.py

| # | Method | Full Path | Purpose | Auth | Role | Body/Params | Status |
|---|--------|-----------|---------|------|------|-------------|--------|
| 97 | GET | `/api/v1/reactions` | Get reactions for a message | Bearer | any | query: `message_id` | PASS |
| 98 | POST | `/api/v1/reactions` | Add reaction to message | Bearer | any | `{message_id, emoji}` | PASS |
| 99 | DELETE | `/api/v1/reactions` | Remove reaction | Bearer | any | query: `message_id, emoji` | PASS |

---

## task_comments.py

| # | Method | Full Path | Purpose | Auth | Role | Body/Params | Status |
|---|--------|-----------|---------|------|------|-------------|--------|
| 100 | DELETE | `/api/v1/task-comments/{id}` | Delete task comment | Bearer | author/mentor | path: `id` | PASS |

---

## announcements.py

| # | Method | Full Path | Purpose | Auth | Role | Body/Params | Status |
|---|--------|-----------|---------|------|------|-------------|--------|
| 101 | POST | `/api/v1/announcements/{id}/read` | Mark announcement as read | Bearer | any | path: `id` | PASS |
| 102 | GET | `/api/v1/announcements/{id}/read-receipts` | Get who read announcement | Bearer | mentor | path: `id` | PASS |

---

## stuck_flags.py

| # | Method | Full Path | Purpose | Auth | Role | Body/Params | Status |
|---|--------|-----------|---------|------|------|-------------|--------|
| 103 | PATCH | `/api/v1/stuck-flags/{id}/resolve` | Resolve stuck flag | Bearer | mentor | path: `id` | PASS |

---

## peer_reviews.py

| # | Method | Full Path | Purpose | Auth | Role | Body/Params | Status |
|---|--------|-----------|---------|------|------|-------------|--------|
| 104 | GET | `/api/v1/peer-review/incoming` | Get incoming peer reviews | Bearer | student | None | PASS |
| 105 | GET | `/api/v1/peer-review/outgoing` | Get outgoing peer reviews submitted | Bearer | student | None | PASS |
| 106 | PATCH | `/api/v1/peer-review/{id}` | Update/submit peer review | Bearer | student | path: `id`, body: `{...}` | PASS |

---

## resources.py

| # | Method | Full Path | Purpose | Auth | Role | Body/Params | Status |
|---|--------|-----------|---------|------|------|-------------|--------|
| 107 | DELETE | `/api/v1/resources/{id}` | Delete project resource | Bearer | mentor | path: `id` | PASS |

---

## quizzes.py

| # | Method | Full Path | Purpose | Auth | Role | Body/Params | Status |
|---|--------|-----------|---------|------|------|-------------|--------|
| 108 | GET | `/api/v1/quizzes/` | List available quizzes | Bearer | any | None | PASS |
| 109 | POST | `/api/v1/quizzes/submit` | Submit quiz answers | Bearer | any | `{quiz_id, answers[]}` | PASS |

---

## assessments.py (internal — platform users)

| # | Method | Full Path | Purpose | Auth | Role | Body/Params | Status |
|---|--------|-----------|---------|------|------|-------------|--------|
| 110 | POST | `/api/v1/assessments/` | Create assessment config | Bearer | admin/mentor | `{title, topic, basic_question_count, ...}` | PASS |
| 111 | GET | `/api/v1/assessments/` | List assessments | Bearer | any | None | PASS |
| 112 | POST | `/api/v1/assessments/{id}/start` | Start assessment attempt (platform) | Bearer | student | path: `id` | PASS |
| 113 | GET | `/api/v1/assessments/assessment-attempts/{id}/current-question` | Get current Q for platform attempt | Bearer | student | path: `id` | PASS |
| 114 | POST | `/api/v1/assessments/assessment-attempts/{id}/answer` | Submit answer (platform) | Bearer | student | path: `id`, body: `{question_id, selected_option_index}` | PASS |
| 115 | GET | `/api/v1/assessments/assessment-attempts/{id}/result` | Get attempt result (platform) | Bearer | any | path: `id` | PASS |
| 116 | POST | `/api/v1/assessments/assessment-attempts/{id}/flag` | Flag suspicious activity | Bearer | student | path: `id` | PASS |
| 117 | GET | `/api/v1/assessments/{id}/attempts` | List all attempts (mentor) | Bearer | mentor | path: `id` | PASS |
| 118 | GET | `/api/v1/assessments/assessment-attempts/{id}/review` | Mentor reviews attempt in detail | Bearer | mentor | path: `id` | PASS |
| 119 | POST | `/api/v1/assessments/assessment-attempts/{id}/reset` | Reset attempt (admin/mentor) | Bearer | admin/mentor | path: `id` | PASS |

---

## webhooks.py

| # | Method | Full Path | Purpose | Auth | Role | Body/Params | Status |
|---|--------|-----------|---------|------|------|-------------|--------|
| 120 | POST | `/api/v1/webhooks/github` | Receive GitHub push webhook | HMAC sig | external | GitHub webhook payload | PASS |

---

## recruiters.py

| # | Method | Full Path | Purpose | Auth | Role | Body/Params | Status |
|---|--------|-----------|---------|------|------|-------------|--------|
| 121 | GET | `/api/v1/recruiters/candidates` | List candidate profiles for recruiters | Bearer | any | None | PASS |
| 122 | GET | `/api/v1/recruiters/candidates/{user_id}/portfolio` | Get candidate portfolio for recruiter | Bearer | any | path: `user_id` | PASS |

---

## issue_reports.py

| # | Method | Full Path | Purpose | Auth | Role | Body/Params | Status |
|---|--------|-----------|---------|------|------|-------------|--------|
| 123 | POST | `/api/v1/issue-reports` | Public issue submission form | None / Optional | public | `{reporter_name, reporter_email, reporter_role, category, description, assessment_email_used?, ...}` | PASS |
| 124 | POST | `/api/v1/issue-reports/upload-screenshot` | Upload screenshot image | None / Optional | public | multipart `file` (≤5MB image) | PASS |
| 125 | GET | `/api/v1/issue-reports/admin/issue-reports` | Admin list & triage issue reports | Bearer | mentor/admin | query: `status?, category?, date_from?, date_to?` | PASS |
| 126 | PATCH | `/api/v1/issue-reports/admin/issue-reports/{id}` | Update report status & admin notes | Bearer | mentor/admin | path: `id`, body: `{status?, admin_notes?}` | PASS |

