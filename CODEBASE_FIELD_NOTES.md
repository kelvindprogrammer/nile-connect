# NileConnect Hub — Codebase Field Notes

Engineering onboarding notes and a catalogued issue ledger, compiled by reading `lib/`, `api/`, and `src/` in full, plus `git log -40` and `git show` on the most-touched recent commits. Cross-referenced against `CLAUDE.md`, `README.md`, and the two legacy `backend/*.md` files. No code was changed to produce this document — it's a snapshot as of **2026-07-25**.

> **Update 2026-08-21** — the QA remediation commit ("resolve all 8 QA findings at root cause") closed several items below. Resolved entries are struck through and annotated rather than deleted, so the original reading still makes sense. Everything not annotated is still open.

> Ongoing observations from the team's review of this document are tracked separately in the [Team Notes — Codebase Review](./README.md#team-notes--codebase-review) section of `README.md`, so they don't drift out of sync with this one.

---

## At a glance

| | |
|---|---|
| Runtimes in one deploy | 3 — Go, Python, TypeScript |
| GORM models | 21, one flat package, no ORM-level relations |
| Serverless functions used / Hobby-plan cap | 11 / 12 |
| Commits in the last 40 | 21 fix : 11 feat — stabilization mode |
| Automated tests | 18 (13 vitest + 5 Go) as of 2026-08-21, was 0. Still no CI gate on PRs |
| Stray TODO/FIXME markers | 0 — genuinely clean on that front |
| Issues catalogued below | 27, of which 4 are critical. 6 closed 2026-08-21 — all 4 critical items remain open |

---

## 1. Architecture — one deploy, three runtimes, a query-string router

It's a single Vercel project. There's no separate backend to stand up — the React app, the Go API, and the Python AI functions all ship from one repo and one deployment. The trick that makes this work under Vercel's Hobby-plan function limit is that each **domain** gets one serverless function, not one per route.

```
Browser (React SPA)
   │  same-origin fetch, cookie-based session — no token in localStorage
   ▼
vercel.json rewrite layer
   │  clean REST URL → /api/<domain>?path=<action>   (~50 rewrite rules)
   ▼
api/<domain>/index.go  (Go)  — switch path{} dispatch inside one Handler(w,r)
   │
   ▼
Neon Postgres via GORM — direct/unpooled connection, one shared
mutex-guarded *gorm.DB per warm container
```

| Layer | Path | Notes |
|---|---|---|
| Frontend | `src/` | React 18 + Vite + TS, one static bundle, no route-based code-splitting |
| Core API | `api/*/index.go` | 8 domains: auth, student, employer, staff, jobs, messages, feed, events. Shared code in `lib/` |
| AI | `api/ai/*.py` | Groq (llama-3.3-70b) for career-counselor chat and CV review — 512MB/30s and 1024MB/60s respectively |

**The single biggest thing to internalize:** `api/messages/index.go` alone is ~992 lines and covers messages, notifications, connections, presence, typing, profile views, endorsements, and file upload — 18 routes bundled into one handler, deliberately, to stay under the 12-function cap. When hunting for "where does X live," grep the sub-`switch` inside the nearest matching domain file before assuming it needs a new one. Adding a genuinely new top-level `api/` folder uses the last slot of headroom — CLAUDE.md is explicit that new functionality should extend an existing handler's `switch` instead.

**~~`events` is the one domain that breaks the convention.~~** *(Resolved 2026-08-21.)* It used to have zero `?path=` rewrites, routing on raw `?id=` plus `r.Method` alone. It now carries `?path=register|suggest|categories` rewrites like every other domain, while keeping the bare `?id=`/method dispatch for plain event CRUD. **Extend it with a new `?path=` case**, matching the rest of the repo — the earlier advice to avoid `?path=` here is obsolete.

**Ignore `backend/` entirely.** It's a second, complete Go module (GoFiber + DDD-style `domain/` packages, its own `go.mod`, 88 files) that predates the current architecture and isn't built or deployed by `vercel.json` — confirmed via grep, nothing in `vercel.json` references it. Its own `API_DOCUMENTATION.md`/`ARCHITECTURE.md` already say as much. Its domain folder names (`auth`, `employer`, `student`, `messages`, ...) closely mirror the real `api/` folders, which is exactly the trap: it's easy to edit the wrong file and have nothing change in the deployed app.

---

## 2. Auth & request lifecycle — Campus One SSO, step by step

Every user — student, staff, employer — authenticates through Campus One's OIDC provider via Authorization Code + PKCE. `User.PasswordHash` exists in the schema but is vestigial; nothing writes or checks it anymore.

1. **Login starts** (`api/auth/index.go:175`) — canonicalizes the request host to `APP_URL` *before* setting any cookies. Campus One always redirects back to that fixed host, so a preview-domain or www-mismatch would otherwise drop the state cookie silently (a real, repeatedly-patched bug — see §4).
2. **Campus One redirects back** to `/api/auth/callback` (`:250`) with an auth code.
3. **Token exchange + role mapping** — the id_token JWT is verified against Campus One's remote JWKS. Role comes from a 3-tier fallback: id_token claims → `/oauth2/userinfo` → raw `role` field, because role claims are frequently scope-gated and missing from the id_token alone. `mapCampusOneRoleFromClaims()` (`:930`) fuzzy-matches against Campus One's vocabulary and only overwrites an existing user's role if a real signal was found *this* login — so a returning employer isn't silently demoted to "student" just because one login's token happened to omit the claim (the bug fixed in `8c01157`).
4. **First-time employer bootstrap** — an empty `EmployerProfile` (status `pending`) is created automatically; staff and the employer are both notified.
5. **Session issued** — a signed, httponly `nile_session` cookie (7-day JWT, `SameSite=Lax` — required to survive the cross-origin redirect back from Campus One, never change to `Strict`) carries UserID/Role/Subtype/Email/Name.
6. **Every subsequent request** is verified by `mw.Auth(r)` (`lib/mw/mw.go:52`): parse the cookie, then **re-fetch the user row from the DB by ID** and trust those values over the JWT's — so a role change or soft-delete takes effect immediately rather than waiting out the cookie's 7 days. If the DB is unreachable at that moment, it falls back to trusting the JWT claims (documented as deliberate cold-start tolerance).

Role checks *after* that point are not centralized — three different idioms coexist for "is this caller staff" (see the role-idioms issue below), so copy the pattern from the domain you're closest to rather than assuming one canonical way exists yet.

---

## 3. Data model — 21 models, one table each, joins done by hand

Every model uses a string UUID primary key and soft-delete via `gorm.DeletedAt`. There are no GORM associations anywhere — every relationship is a bare foreign-key column plus a manual `Where(...)` query in the handler. Don't look for `Preload()`.

| Model | What it's for | Worth knowing |
|---|---|---|
| `User` | Single table for all three roles | Discriminated by `Role` + `StudentSubtype`. Carries dead local-auth fields alongside the full Campus One field set. |
| `EmployerProfile` | 1:1 with an employer `User` | `Status` (approval gate) is separate from `IsVerified` (cosmetic badge). |
| `Job` | Posting | `RequiredDocs`/`OptionalDocs` are JSON-array strings in a TEXT column, not a real array or join table. |
| `Application` | A student's application | Two parallel status fields — see below. |
| `ApplicationStageHistory` | Append-only audit trail | Written manually at 3 call sites, not via a GORM hook. |
| `Document` | Reusable student file library | resume / cover_letter / reference_letter / transcript / siwes_letter / certification / portfolio — attach once, reuse across applications. |
| `Post` / `Comment` / `PostLike` | Social feed | `Post.Kind='job'` links a share post back to a `Job` via `JobID`. |
| `Event` / `EventRegistration` | Career events | `EventRegistration` is live as of 2026-08-21: unique `(event_id, student_id)` index, and `Event.RegistrationsCount` is always recomputed from those rows, never incremented. |
| `Connection` / `Message` / `Notification` | Networking + messaging | Real-time-*ish* only — polling, no websockets, throughout the frontend. |

**The one pattern worth memorizing:** `Application.Stage` vs `.Status`. `Stage` is the real, 9-value ATS pipeline (`submitted → under_review → shortlisted → interview_scheduled → assessment_sent → offer_extended → accepted`, plus terminal `rejected`/`withdrawn`). `Status` is the legacy 4-bucket field older dashboards still read. `pipeline.ToLegacyStatus(stage)` maps one to the other — **there's no DB constraint enforcing they stay in sync.** Every write path that changes `Stage` has to remember to also write `Status` through that helper. Done correctly at the two places that mutate an *existing* application's stage (`api/employer/index.go:536`, `api/jobs/index.go:355`), but the *initial* `Status:"applied"`/`Stage:"submitted"` pair is hardcoded directly at creation (`api/jobs/index.go:295`) rather than going through the helper — a third place that could drift.

---

## 4. Where it's been fragile

The last 40 commits run roughly **21 fixes to 11 features** — a codebase actively being stabilized, not one in steady feature growth. Two areas account for almost all of it.

**Campus One SSO integration — by far the hottest area.** Well over a dozen dedicated fix commits: host-canonicalization for state-cookie loss, issuer/OAuth URL corrections, five separate iterations on employer role-claim mapping, PKCE cookie domain fixes, EdDSA signature acceptance, bypassing OIDC discovery to hardcode endpoints directly, 403/stale-JWT auto-logout fixes, and one full revert-then-reintegrate cycle (`c5e5377` ripped SSO out, `39bb77b` brought it back). `api/auth/index.go` is the single most-touched file in the repository — test the full login flow for all three roles before merging anything there.

**Null-crash bugs in the apply flow & profile pages.** `b9e6545` and `38391d4` — both root-caused to Go's `encoding/json` marshaling a nil slice as `null`, which the frontend then crashed on (`.find()`/spread over `null`). Fixed at 5+ call sites with `?? []` fallbacks, but not uniformly — see the issue ledger.

**Two smaller, resolved incidents worth knowing about:** a pooled-vs-unpooled Neon connection string caused prepared-statement errors in production (`6eeb4f1`) — this is why `STORAGE_DATABASE_URL_UNPOOLED` is non-negotiable. And a devDependency change to ESLint briefly broke the Vercel build itself (`df75c9f`) — there's no CI to catch that class of break before it reaches deploy.

---

## 5. Issue ledger

27 items found reading the code directly — there are no in-code TODOs and no issue backlog to inherit this from. Ranked by real impact: critical items are live security/reliability gaps, high items will bite the team soon, medium/low are quality and maintenance debt. Every item cites exact `file:line`.

### Critical

**The AI endpoints have no authentication at all.**
`api/ai/chat.py`, `api/ai/review.py` — both are plain `BaseHTTPRequestHandler` classes with `Access-Control-Allow-Origin: *` and no check of the `nile_session` cookie or any token, unlike every Go endpoint which requires `mw.Auth`. Anyone who finds the URL can call it directly and consume the shared `GROQ_API_KEY` budget for free, with no rate limiting. **The single highest-priority fix in the codebase.**

**Session-signing secrets fall back to a hardcoded literal.**
`lib/jwtutil/jwtutil.go:19-25`, `:74-84` — if `SESSION_SECRET`/`JWT_SECRET` are unset, both JWTs sign with a literal string baked into the source. A misconfigured environment doesn't fail — it silently starts issuing sessions forgeable with a publicly-known secret. Compare `api/auth/index.go:139`, which correctly hard-fails with a 503 when `CAMPUS_ONE_CLIENT_ID` is missing.

**DB connection string silently falls back to localhost.**
`lib/db/db.go:31` — if no DB env var is set at all, the DSN defaults to `postgres://localhost:5432/nile_connect` rather than failing fast. Paired with the secret fallback above, a bad deploy config fails silently and insecurely instead of erroring loudly.

**PII is logged in plaintext on every login.**
`api/auth/index.go` — `:266` logs the first 8 characters of the PKCE state cookie; `:335` logs the full raw id_token claims JSON (name, email, student ID, role, department); `:345` logs the full raw userinfo response JSON. Every login writes a user's identity claims to log storage in plaintext — a real compliance/privacy exposure, not just noise. These read like leftover debugging aids from chasing the state-cookie bug (§4) that were never cleaned up.

### High

**Staff-posted jobs are silently unowned by any employer.**
`api/staff/index.go:208-209` — when staff post a job, `Job.EmployerID` is set to the staff member's own `User.ID`. Everywhere else that field means "the employer's user id, used to look up `EmployerProfile`" (`api/jobs/index.go:141`). A staff-created job shows a blank employer card on job detail, never appears in `GET /api/employer/jobs`, and can't be edited through the normal employer routes. No `PostedByStaff`/`OnBehalfOfEmployerID` field exists to disambiguate — looks like an oversight, not intentional design.

**The deadline-reminder cron doesn't scope its audience.**
`api/jobs/index.go:387-398` — for every active job with a deadline in the next 48h, loops over *every student on the platform* and emails each one who hasn't applied, with a `COUNT` query per (job, student) pair inside the nested loop. O(jobs × students), no batching — a spam problem and a real risk of exceeding the 30s Vercel function timeout as volume grows.

**Staff's application list has no pagination.**
`api/staff/index.go:128-147` — `staffApplications` loads every application in the system on every dashboard load with no limit, plus N+1 queries per row to hydrate student/job/employer names. The batched `IN`+map alternative already exists in the codebase (`employerOwnedJobIDs`, `api/employer/index.go:331-341`) but isn't reused here or at the other N+1 sites (`api/jobs/index.go:141`, `api/employer/index.go:392`, `api/student/index.go:181`).

**Email templates interpolate user input into raw HTML, unescaped.**
`lib/email/templates.go` — every template function. `studentName`, `jobTitle`, `companyName` all originate from user-editable fields and go into `fmt.Sprintf`-built HTML with no escaping anywhere on the write path. A latent stored-content-injection vector in transactional email.

**No client-side check that a user's role matches the page they've navigated to.**
`src/components/ProtectedRoute.tsx` (fully built, `allowedRoles` gating, unused) vs `src/layouts/AppShell.tsx:176-240` (the real gate — checks only "is someone logged in," not role-vs-route). `AppShell` derives its sidebar role from `user.role`, not the URL, so a student who manually navigates to `/staff/crm` renders the staff page shell before any API call 403s and bounces them. Not a data leak — the backend still enforces role — but fragile.

**~~The exact null-crash bug class from git history is still open in one service.~~** *(Closed 2026-08-21 — `?? []` added to the four list-returning functions. `getJobDetails` returns a single object, where a null is a genuine "not found" for the caller to handle, so it is intentionally not guarded.)*
`src/services/studentService.ts:19-55` — `getJobs`, `searchJobs`, `getJobDetails`, `getSavedJobs`, `getMyApplications` all lacked the `?? []` fallback every sibling service function uses (`jobService.ts:8`, `employerService.ts:95`, `staffService.ts:83`, etc.) because Go marshals a nil slice as JSON `null`. Precisely the pattern behind `b9e6545` and `38391d4` (§4). Current callers happen to swallow the crash inside `.catch()` chains, but that's incidental, not structural.

### Medium

| Issue | Where | Why it matters |
|---|---|---|
| Three different "is this caller staff" idioms coexist, no shared `mw.RequireRole()` | `api/staff/index.go:40`, `api/events/index.go:42`, `api/feed/index.go:132` | New contributors adding a staff-only route have no single obvious pattern to copy |
| N+1 hydration is the default pattern across list endpoints | `api/jobs/index.go:141`, `api/employer/index.go:392`, `api/student/index.go:181` | Will degrade as volume grows; the fix is already written once, just not shared |
| Account cascade-delete leaves orphaned rows — **partially closed 2026-08-21** | `lib/admin/cleanup.go` | Event registrations now hard-delete and recount the affected events. Still open: history rows, other students' applications on employer delete, authored-post comments/likes. |
| GORM errors checked on Create but not on Update | `api/employer/index.go:131`, `api/staff/index.go:260`, `lib/notify/notify.go:19` | A failed profile/status update returns 200 with stale data |
| ~~`EventRegistration` has zero API surface~~ **CLOSED 2026-08-21** | `api/events/index.go` | Finished, not removed. `POST`/`DELETE /api/events/register` behind a unique index, with confirmation email, in-app notification and organiser notification. |
| Notification coverage stops at the job/application lifecycle | `api/messages/index.go`, `api/feed/index.go`, `api/staff/index.go:644` | Messages, connections, likes/comments, endorsements, service-request status are in-app only, never emailed — inconsistent with the fully double-covered job/application flows |
| ~~`.env.example` is stale~~ **CLOSED 2026-08-21** | `.env.example` (root) | All five missing vars added and cross-checked against the `CLAUDE.md` table. |
| Three near-identical ~650-line Messages pages | `src/pages/{student,staff,employer}/Messages.tsx` | A bugfix in one has to be manually ported to the other two — easy to miss one |
| The same endpoint is polled from two places at two cadences | `src/pages/student/Messages.tsx:23,81` | `/api/messages/conversations` polled every 15s (global badge) and every 5s (page-local); redundant traffic, unnamed magic-number literal |

### Low / cleanup

| Issue | Where | Why it matters |
|---|---|---|
| Four hand-rolled O(n²) insertion sorts, `sort.Slice` never imported | `api/employer/index.go:422-444`, `api/messages/index.go:716` | Good first cleanup PR — small, contained, easy to verify |
| `ThemeContext.tsx` is an empty stub | `src/context/ThemeContext.tsx` | Will confuse anyone who tries to `import { useTheme }` expecting it to exist |
| Unused shadcn/Radix scaffold ships in the bundle graph | `components.json`, `package.json:14-17,23` | No `@` alias even configured in tsconfig/vite — 4 Radix packages + CVA support code nothing imports |
| 9 orphaned legacy auth/onboarding pages | `src/pages/auth/*`, `src/pages/onboarding/*` | Every route to them hard-redirects to `/login` now that auth is SSO-only — files look alive but aren't wired in |
| ~~`AppShell.handleLogout` double-navigates~~ **CLOSED 2026-08-21** | `src/layouts/AppShell.tsx` | Dead `navigate()` removed. `logout()` now also takes the destination as an argument and clears per-user localStorage. |
| No shared `ApiEnvelope<T>` type | `jobService.ts`, `studentService.ts`, `employerService.ts`, … | Redeclared identically in ~10 service files |
| Two different `getJobs` functions, different shapes, same endpoint | `jobService.ts:6`, `studentService.ts:19` | A genuine "which one do I import" trap |
| `backend/` legacy module still tracked in git | repo root | See §1 — worth a team conversation about deleting it outright |

---

## 6. Where to start

Three tiers, roughly by how much context you need before touching the code. There's no CI, so `vercel dev` plus manual verification of the affected role's flow is the actual test suite — good instinct to pick something from the first tier before taking on the third.

**Quick, contained, low-risk**
- ~~Add the missing `?? []` guards in `studentService.ts`~~ — done 2026-08-21
- ~~Fix `.env.example` to match `CLAUDE.md`~~ — done 2026-08-21
- Replace the four hand-rolled insertion sorts with `sort.Slice`
- Delete `ThemeContext.tsx`, the unused shadcn/Radix scaffold, and the 9 orphaned legacy auth pages — independent cleanup PRs
- ~~Remove the redundant `navigate()` call in `AppShell.handleLogout`~~ — done 2026-08-21

**A focused week — needs a bit of design**
- Add `mw.RequireRole(role)` and migrate the three existing idioms onto it
- Extract the batched `IN`+map hydration pattern from `employerOwnedJobIDs` into a shared helper and apply it at the four N+1 sites
- Consolidate `ApiEnvelope<T>` into one shared type; reconcile the two `getJobs` implementations
- Escape user-controlled strings in `lib/email/templates.go` before interpolation

**Bigger or riskier — discuss with the team first**
- Add auth to `api/ai/chat.py` / `review.py` — highest priority in this whole document
- Fail loudly (not silently) when `SESSION_SECRET`/`JWT_SECRET`/DB DSN are unset
- Strip the PII-logging `Printf` calls from the OIDC flow, or route them through a redacting logger
- Decide what a staff-posted job's ownership should mean, then fix `EmployerID` accordingly
- Scope the deadline-reminder cron (by saved job / major / opt-in) before it hits real student volume
- ~~Either finish `EventRegistration` or remove it~~ — finished 2026-08-21
- Merge the three Messages pages into one component parameterized by role
- Decide whether `backend/` gets deleted
