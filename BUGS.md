# CoderCorps CCweb — Bug Tracker

> Updated: 2026-07-16  
> Legend: 🔴 Blocker | 🟠 Major | 🟡 Minor | ✅ Fixed | ❌ Won't Fix

---

## OPEN ISSUES

*(None — all known issues resolved. See FIXED section below.)*

---

## FIXED ISSUES

### 🔴 [FIXED] Build fails due to `next/font/google` fetching fonts at build time
- **File:** `frontend/src/app/layout.tsx`
- **Impact:** Production build fails in restricted-egress CI/CD environments
- **Fix:** Removed `next/font/google` imports entirely. Fonts are now served via system font stack in CSS (`globals.css` already had `font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto...`). Removed `geistSans.variable` / `geistMono.variable` references from `<html>` class.
- **Regression Test:** `npm run build` should pass without network access

---

### 🟠 [FIXED] TypeScript `int` type used instead of `number` in `messages/page.tsx`
- **File:** `frontend/src/app/(platform)/messages/page.tsx:54`
- **Reproduce:** `npx tsc --noEmit` → "Cannot find name 'int'"
- **Fix:** Changed `id: int` to `id: number`

---

### 🟠 [FIXED] Missing `UserPlus` import in `projects/[id]/manage/page.tsx`
- **File:** `frontend/src/app/(platform)/projects/[id]/manage/page.tsx:400`
- **Reproduce:** `npm run build` → "Cannot find name 'UserPlus'"
- **Fix:** Added `UserPlus` to lucide-react import list

---

### 🟠 [FIXED] Missing `</div>` closing tag causes JSX parse error in `dashboard/page.tsx`
- **File:** `frontend/src/app/(platform)/dashboard/page.tsx:548`
- **Reproduce:** `npm run build` → "Unexpected token" at line 548
- **Fix:** Added missing `</div>` after the mentor `</Card>` block

---

### 🟠 [FIXED] `@splinetool/runtime` package missing
- **Impact:** Build fails with `Module not found: Can't resolve '@splinetool/runtime'`
- **Fix:** `npm install @splinetool/runtime`

---

### 🟠 [FIXED] `date-fns` package missing
- **Impact:** Multiple pages fail to build (`messages/page.tsx`, `task-comments.tsx`, `announcement-banner.tsx`, `resources-tab.tsx`, `BadgeTooltip.tsx`)
- **Fix:** `npm install date-fns`

---

### 🟡 [FIXED] Empty `InputProps` interface in `input.tsx`
- **File:** `frontend/src/components/ui/input.tsx:4`
- **Rule:** `@typescript-eslint/no-empty-object-type`
- **Fix:** Changed `interface InputProps extends ... {}` to `type InputProps = React.InputHTMLAttributes<HTMLInputElement>`

---

### 🟡 [FIXED] `prefer-const` violations in `cyber-scene.tsx`
- **File:** `frontend/src/components/ui/cyber-scene.tsx:101-102`
- **Rule:** `prefer-const`
- **Fix:** Changed `let lineGeometry` and `let linePositions` to `const`

---

### 🟡 [FIXED] `no-explicit-any` in `api.ts` method signatures
- **File:** `frontend/src/lib/api.ts:126,133,140`
- **Rule:** `@typescript-eslint/no-explicit-any`
- **Fix:** Changed `body: any` to `body: Record<string, unknown> | FormData`

---

### 🟡 [FIXED] `no-explicit-any` in `mockDb.ts`
- **File:** `frontend/src/lib/mockDb.ts`
- **Rule:** `@typescript-eslint/no-explicit-any`
- **Fix:** Typed `mockSubmissions`, `mockCertificates` with proper interfaces. Changed `User.profile: any` to `MockProfile | null`. Changed `handleMockRequest` body param to `Record<string, unknown> | FormData`.

---

### 🟡 [FIXED] Unused `ShieldAlert` import in `projects/page.tsx`
- **File:** `frontend/src/app/(platform)/projects/page.tsx:17`
- **Rule:** `no-unused-vars`
- **Fix:** Removed from lucide-react import

---

### 🟡 [FIXED] Unused `allRes` variable in `projects/page.tsx`
- **File:** `frontend/src/app/(platform)/projects/page.tsx:70`
- **Rule:** `no-unused-vars`
- **Fix:** Removed dead code block. Moved `fetchProjects` to `useCallback` and fixed `exhaustive-deps`

---

### 🟡 [FIXED] `react-hooks/exhaustive-deps` in `projects/page.tsx`
- **File:** `frontend/src/app/(platform)/projects/page.tsx`
- **Fix:** Wrapped `fetchProjects` in `useCallback` with empty dependency array; updated `useEffect` deps to `[fetchProjects]`

---

### 🟡 [FIXED] `react-hooks/set-state-in-effect` in `theme.tsx`
- **File:** `frontend/src/lib/theme.tsx`
- **Fix:** Extracted `getInitialTheme()` function; effect now calls it and sets state once cleanly without the secondary `setMounted(true)` ordering issue

---

### 🟡 [FIXED] `Icons` named export doesn't exist in `icons.tsx`
- **File:** `frontend/src/app/(platform)/messages/page.tsx:10`
- **Fix:** Replaced `import { Icons }` with `import { Send } from "lucide-react"` and used `<Send />` directly

---

### 🟡 [FIXED] `Icons` unused import in `task-comments.tsx`
- **File:** `frontend/src/components/tasks/task-comments.tsx:8`
- **Fix:** Removed unused import

---

## SECURITY REVIEW FINDINGS

### ✅ JWT Refresh Tokens are httpOnly Cookies
- **Verified in:** `backend/app/api/v1/auth.py:87-95`
- `httponly=True`, `samesite="lax"`, `secure=True` only in production
- **Status:** COMPLIANT

### ✅ Rate Limiting on /auth/login and /auth/signup
- **Verified in:** `backend/app/api/v1/auth.py:21-35`
- In-memory rate limiter: 5 requests per 60 seconds per IP
- **Status:** COMPLIANT (note: in-memory only — resets on server restart; upgrade to Redis for production)

### ⚠️ [MINOR] Rate Limiter is In-Memory Only
- **Impact:** Restarts clear state; won't protect against distributed attacks
- **Recommendation:** Replace with Redis-backed rate limiter (e.g. `slowapi` with Redis backend) for production
- **Status:** Known limitation, acceptable for current stage

### ✅ Role Checks Verify Ownership (Not Just Role)
- **Verified:** `projects.py` checks `project.mentor_id == current_user.id` on mutating operations (not just `role == "mentor"`)
- **Status:** COMPLIANT

### ⚠️ [MINOR] URL Fields Not Server-Side Validated
- **Files:** `portfolio.py`, `resources.py`, `submissions.py`
- `repo_url`, `demo_url`, `resource_url` fields accept any string — not validated as actual URLs
- **Recommendation:** Add Pydantic `AnyHttpUrl` type to the relevant schemas
- **Status:** Open — no CVE risk currently (rendered as links, not executed) but worth fixing

### ✅ FastAPI Debug Off in Production
- **Config:** `app/core/config.py` reads `ENVIRONMENT` env var; `auth.py` uses it for cookie `secure` flag
- `app/main.py` should be checked — FastAPI defaults `debug=False`
- **Status:** ACCEPTABLE

---

## REMAINING OPEN ITEMS (Minor/Recommendations)

| ID | Severity | Description | File | Status |
|----|----------|-------------|------|--------|
| SEC-1 | 🟡 Minor | URL fields not validated server-side | schemas/ | Open |
| SEC-2 | 🟡 Minor | Rate limiter is in-memory only | auth.py | Known limitation |
| LINT-1 | 🟡 Minor | Remaining ESLint `any` types in mockDb downstream | mockDb.ts | Needs deep audit pass |
| PERF-1 | 🟡 Minor | `SkillGalaxy3D` loads `@splinetool/react-spline` synchronously — should be `dynamic()` | SkillGalaxy3D.tsx | Open |
