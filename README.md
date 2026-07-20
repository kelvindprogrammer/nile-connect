# NileConnect Hub

**The career platform connecting Nile University students, staff, and employer partners.**

NileConnect is a full-stack, multi-role SPA built for Nile University's career services. It gives students job discovery, an AI career counselor, a LinkedIn-style social feed/network, messaging, and application tracking; staff get administrative oversight, employer/job approval, and service-request handling; employers get a recruitment hub with an ATS-style pipeline.

Authentication is **Campus One SSO (OIDC)** — there is no username/password login for the platform itself.

---

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [User Roles](#user-roles)
- [Authentication (Campus One SSO)](#authentication-campus-one-sso)
- [API Reference](#api-reference)
- [Data Model](#data-model)
- [Frontend Guide](#frontend-guide)
- [Email](#email)
- [AI Features](#ai-features)
- [Deployment & Constraints](#deployment--constraints)
- [Contributing](#contributing)

---

## Overview

NileConnect is a **single Vercel monorepo** with three runtimes deployed together — there are no separate backend servers:

- **React 18 + Vite + TypeScript** SPA (`src/`)
- **Go 1.22 serverless functions** for all core API endpoints (`api/*/index.go`, shared code in `lib/`)
- **Python 3 serverless functions** (Groq/Llama 3.3) for AI career coaching and CV review (`api/ai/*.py`)
- **Neon PostgreSQL** as the database, accessed via GORM

> The `backend/` directory at the repo root is a **legacy, unused prototype** (GoFiber + DDD-style `domain/` packages) that predates the current architecture. It is not built or deployed by `vercel.json` and should not be used as a reference — the real API lives in `api/` and `lib/` at the repo root.

---

## Architecture

```
Browser
  │
  │  single origin (no subdomains) — /api/* + SPA served from the same Vercel deployment
  ▼
Vercel (vercel.json rewrites: clean URL → /api/<domain>?path=<action>)
  │
  ├── Go functions (api/*/index.go, shared code in lib/)
  │     auth · student · employer · staff · jobs · messages · feed · events
  │
  └── Python functions (api/ai/*.py)
        chat.py (career counselor) · review.py (CV/document review)
  │
  ▼
Neon PostgreSQL (STORAGE_DATABASE_URL_UNPOOLED, direct connection, GORM)
```

**Request flow for a protected endpoint:**

1. Browser sends `GET /api/student/profile` (session lives in an httponly `nile_session` cookie — no bearer token, no `Authorization` header)
2. `vercel.json` rewrites it to `GET /api/student?path=profile`
3. `mw.HandlePreflight(w, r)` runs first (CORS + OPTIONS)
4. `mw.Auth(r)` reads the `nile_session` cookie and verifies the JWT (`SESSION_SECRET`)
5. The handler's `switch r.URL.Query().Get("path")` dispatches to the matching function, which queries Neon via GORM
6. Response is wrapped as `respond.OK(w, payload)` → `{"data": payload}`
7. Frontend unwraps `response.data.data`

**Adding a new endpoint requires both:**
- a `case "xxx":` in the handler's `switch` block in `api/<domain>/index.go`
- a matching rewrite entry in `vercel.json`

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite 5, TypeScript 5, Tailwind CSS 3 |
| UI Components | Lucide React, Radix UI primitives (`dialog`, `scroll-area`, `tabs`), CVA, Tailwind Merge |
| Animation | animejs |
| State / Auth | React Context (`AuthContext`, `ThemeContext`, `ToastContext`); session via httponly cookie, not localStorage |
| HTTP Client | Axios, `withCredentials: true` (cookie-based auth, no token interceptor) |
| Real-time-ish | Polling (messages, presence, typing, notifications) |
| Backend | Go 1.22 serverless functions (Vercel) |
| ORM | GORM 1.30 with the PostgreSQL driver |
| Auth | Campus One OIDC (PKCE) → signed `nile_session` JWT cookie (`golang-jwt/jwt/v5`, HS256) |
| Email | Resend (`lib/email`), fire-and-forget |
| AI | Python 3, Groq API (llama-3.3-70b-versatile) |
| Database | Neon PostgreSQL (serverless, direct/unpooled connection) |
| Deployment | Vercel (monorepo, Hobby plan — ≤ 12 serverless functions) |

---

## Project Structure

```
nile-connect/
├── api/                            # Go + Python serverless functions
│   ├── auth/index.go                # Campus One OIDC login/callback/logout/me, webhook, dev-* role tools
│   ├── student/index.go             # profile, applications, services, documents, application-package/-detail
│   ├── employer/index.go            # profile, jobs, job-detail, applications, application-stage/-notes
│   ├── staff/index.go               # dashboard, applications, jobs, employers, students, service-requests, cleanup
│   ├── jobs/index.go                # public job listing/detail, apply, withdraw, deadline-reminders (cron)
│   ├── messages/index.go            # conversations/thread/send, presence, typing, notifications, connections,
│   │                                 #   user search, upload, profile views, endorsements
│   ├── feed/index.go                # social feed: posts, likes, comments
│   ├── events/index.go              # events CRUD
│   ├── health.go                    # health-check endpoint
│   └── ai/
│       ├── chat.py                  # AI career counselor (Groq, streaming)
│       ├── review.py                # CV / document review
│       └── dev_server.py            # local Flask dev server for the AI functions
│
├── lib/                             # Shared Go packages, imported by every handler
│   ├── db/db.go                     # Neon connection + AutoMigrate + explicit ALTER TABLE statements
│   ├── models/models.go             # GORM models (User, Job, Application, Document, Post, ...)
│   ├── mw/mw.go                     # CORS preflight handling + session-cookie auth (mw.Auth)
│   ├── respond/respond.go           # Uniform `{"data": ...}` / error envelope
│   ├── jwtutil/jwtutil.go           # Sign/verify the nile_session JWT
│   ├── jsonutil/jsonutil.go         # JSON request/response helpers
│   ├── pipeline/pipeline.go         # Application.Stage enum + ToLegacyStatus()
│   ├── notify/notify.go             # CreateAndEmail() — in-app notification + email in one call
│   ├── email/                       # email.go (Resend client), templates.go (per-event templates)
│   └── admin/cleanup.go             # dev-only account cleanup helpers
│
├── src/                             # React frontend
│   ├── App.tsx                      # Router
│   ├── main.tsx                     # Entry point
│   ├── index.css                    # Global styles + micro-interaction animations
│   │
│   ├── context/
│   │   ├── AuthContext.tsx          # Auth state — calls GET /api/auth/me on mount
│   │   ├── ThemeContext.tsx         # Light/dark theme
│   │   └── ToastContext.tsx         # Global toast notifications
│   │
│   ├── hooks/
│   │   ├── useAuth.ts                 useHeartbeat.ts        useNotifications.ts
│   │   ├── useUnreadMessages.ts        useLearningPath.ts     useProfile.ts
│   │   └── useProfilePicture.ts        useAnime.ts
│   │
│   ├── layouts/
│   │   ├── AppShell.tsx             # Shared nav/sidebar shell for all authenticated roles
│   │   └── AuthLayout.tsx           # Split-panel layout for auth/onboarding pages
│   │
│   ├── pages/
│   │   ├── auth/                    # Login, Register, JoinAs, ForgotPassword, Onboarding
│   │   ├── onboarding/              # StudentStatus, ProfileCompletion, EmployerRegistration,
│   │   │                            #   AwaitingVerification, AlumniLogin, StudentPortal
│   │   ├── student/                 # Dashboard, JobBoard, JobDetail, CareerCenter, AICounselor,
│   │   │                            #   MockInterview, ApplicationTracker, Documents, EventsCalendar,
│   │   │                            #   Profile, EditProfile, LearningPath, Network, Messages, Insights
│   │   ├── staff/                   # Dashboard, Applications, CRMManager, Events, Jobs, Services,
│   │   │                            #   Reports, StudentActivity, StudentDetail, Profile, Messages, Settings, Insights
│   │   ├── employer/                # Dashboard, Candidates, CandidateDetail, Jobs, Applications,
│   │   │                            #   Events, Profile, Messages, Settings, Insights
│   │   └── VerifyEmail.tsx, NotFound.tsx
│   │
│   ├── services/                    # Axios API wrappers (api.ts is the shared Axios instance)
│   │   ├── api.ts, authService.ts, studentService.ts, employerService.ts, staffService.ts
│   │   ├── jobService.ts, messageService.ts, feedService.ts, connectionService.ts
│   │   ├── notificationService.ts, profileService.ts, aiService.ts
│   │
│   ├── components/                  # Reusable UI (Button, InputField, Avatar, Modal, Card, Feed,
│   │                                 #   NotificationTray, ConnectionModal, QuickApplyModal,
│   │                                 #   SharePostModal, JobShareCard, ProtectedRoute, ...)
│   │   ├── home/                    # 3-column LinkedIn-style home page pieces
│   │   └── ui/                      # Low-level primitives (Radix wrappers, etc.)
│   │
│   └── utils/                       # Formatting, markdown rendering, misc helpers
│
├── backend/                         # ⚠️ Legacy prototype (GoFiber + DDD) — not built or deployed, kept for reference only
├── public/                          # Static assets (favicon, etc.)
├── index.html                       # SPA entry
├── vercel.json                      # Rewrites, function config, cron, headers
├── go.mod / go.sum                  # Go module (root — this is the real backend)
├── package.json                     # Node dependencies
├── tailwind.config.js               # Tailwind + design tokens
├── vite.config.ts                   # Vite build config (proxies /api/ai to the Flask dev server)
└── .env.example                     # Environment variable template
```

---

## Getting Started

### Prerequisites

| Tool | Version | Purpose |
|---|---|---|
| Node.js | ≥ 18 | Frontend dev server + build |
| Go | ≥ 1.22 | Serverless API functions |
| Python | ≥ 3.10 | AI functions |
| Vercel CLI | latest | Full local emulation of all three runtimes |

### Environment Variables

Copy `.env.example` to `.env.local` and fill in the values — see the full table in [`CLAUDE.md`](./CLAUDE.md#environment-variables) for descriptions of every variable (Campus One credentials, `SESSION_SECRET`, `STORAGE_DATABASE_URL_UNPOOLED`, `GROQ_API_KEY`, `RESEND_API_KEY`, `CRON_SECRET`, `ROLE_OVERRIDE_SECRET`, ...).

```bash
cp .env.example .env.local
```

> Always use `STORAGE_DATABASE_URL_UNPOOLED` (Neon's direct connection), never the pooled URL — GORM runs with `PreferSimpleProtocol: true`, which pgBouncer doesn't support.

### Running Locally

**Option A — full stack (recommended):**

```bash
npm install -g vercel
vercel dev
```

Starts the React app **and** all Go/Python serverless functions with full rewrite support, at `http://localhost:3000`.

**Option B — frontend only:**

```bash
npm install
npm run dev
```

Starts at `http://localhost:5173`. `/api/*` calls will fail unless a backend is running separately.

**Option C — AI functions only (Python/Flask):**

```bash
pip install -r api/ai/requirements.txt
python api/ai/dev_server.py   # http://localhost:5001, proxied by vite.config.ts
```

### Commands

```bash
npm run dev          # Vite dev server (frontend only)
npm run build         # Production build → dist/
npm run lint          # ESLint, max-warnings 0
npx tsc --noEmit      # Type-check without building
```

There is no automated test suite — manual verification via `vercel dev` is the test strategy.

---

## User Roles

| Role | Assigned by | Notes |
|---|---|---|
| **Student** | Campus One OIDC claims (`roles[]` / `role` / `custom_roles`) | Has a `StudentSubtype` (`current`/`alumni`), major, graduation year, Campus One student ID, faculty/department, level |
| **Staff** | Campus One OIDC claims | Administrative oversight — approves employers and jobs, manages service requests |
| **Employer** | Campus One OIDC claims | Gets an empty `EmployerProfile` row auto-created on first login (`status = "pending"`) — must complete onboarding and be approved by staff before posting jobs |

Role mapping is in `mapCampusOneRoleFromClaims()` in `api/auth/index.go` — the frontend never sets or trusts a user-supplied role.

---

## Authentication (Campus One SSO)

NileConnect delegates identity to **Campus One** via OIDC with PKCE. There is no local password login for the platform.

**Flow:**

1. `GET /api/auth/login` starts the flow — generates PKCE `code_verifier`/`code_challenge` and `state`, sets short-lived `c1_state`/`c1_verifier` cookies (`SameSite=Lax`, required to survive the cross-origin redirect back from Campus One), and redirects to Campus One's authorize endpoint.
2. Campus One redirects back to `GET /api/auth/callback` with an authorization code.
3. The handler validates `state`, exchanges the code for tokens, maps the OIDC claims to a NileConnect role via `mapCampusOneRoleFromClaims()`, upserts the `User` row (creating an `EmployerProfile` if the role is `employer`), and issues a signed `nile_session` httponly cookie (7-day JWT, `SESSION_SECRET`).
4. The frontend calls `GET /api/auth/me` on load (`AuthProvider` in `src/context/AuthContext.tsx`) to hydrate auth state — there is no token in `localStorage`.
5. `GET /api/auth/logout` clears the session cookie.

**Backend:** every protected Go handler calls `mw.Auth(r)`, which reads the `nile_session` cookie and verifies it — see `lib/mw/mw.go` and `lib/jwtutil/jwtutil.go`.

**Dev-only role override:** if `ROLE_OVERRIDE_SECRET` is set, `POST /api/auth/dev-set-role` lets you flip an existing account's role (`Authorization: Bearer <secret>`, body `{email, role, student_subtype?}`) without needing separate Campus One test accounts per role. Leave the env var unset in production — the endpoint 404s when it isn't configured. `dev-list-users` / `dev-delete-user` are similarly gated dev tools for cleaning up test accounts.

---

## API Reference

All endpoints follow the pattern: clean REST URL (matched in `vercel.json`) → `/api/<domain>?path=<action>` → Go `switch` case in `api/<domain>/index.go`.

**Success envelope:** `{ "data": <payload> }` — always via `respond.OK(w, payload)`.
**Error envelope:** `{ "error": "message" }`.
**Auth:** via the `nile_session` cookie (sent automatically by the browser); no `Authorization` header is used by the frontend.

### Auth — `/api/auth/*` (`api/auth/index.go`)

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/auth/login` | — | Starts the Campus One OIDC PKCE redirect. |
| GET | `/api/auth/callback` | — | Campus One redirects here with the auth code; sets `nile_session`. |
| GET | `/api/auth/logout` | — | Clears the session cookie. |
| GET | `/api/auth/me` | session | Returns the current authenticated user. |
| POST | `/api/auth/delete-account` | session | Soft-deletes the authenticated user's account. |
| POST | `/api/webhooks/campus-one` | HMAC (`CAMPUS_ONE_WEBHOOK_SECRET`) | Campus One webhook receiver. |
| POST | `/api/auth/verify-email` | — | Confirms an employer's contact email via a one-time token. |
| POST | `/api/auth/dev-set-role` | `Bearer ROLE_OVERRIDE_SECRET` | Dev-only: change an account's role/subtype. |
| GET | `/api/auth/dev-list-users` | `Bearer ROLE_OVERRIDE_SECRET` | Dev-only: list accounts by exact email. |
| POST | `/api/auth/dev-delete-user` | `Bearer ROLE_OVERRIDE_SECRET` | Dev-only: hard-delete a test account. |

### Student — `/api/student/*` (`api/student/index.go`)

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/student/profile` | student | Get the authenticated student's profile. |
| GET | `/api/student/applications` | student | List applications with job + employer info + stage. |
| GET/POST | `/api/student/services` | student | List/request career services (mock interview, advisory, CV review). |
| GET/POST | `/api/student/documents` | student | List / upload reusable documents (resume, cover letter, transcript, ...). |
| DELETE | `/api/student/documents/:id` | student | Delete a document. |
| GET/POST | `/api/student/application-package` | student | Build/preview the document set attached to an application. |
| GET | `/api/student/application-detail` | student | Full detail + stage history for one application. |

### Jobs — `/api/jobs/*` (`api/jobs/index.go`)

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/jobs` | — | List active jobs. Query: `q`, `type`, `location`, `industry`. |
| GET | `/api/jobs/:id` | — | Job detail. |
| POST | `/api/jobs` | student | Apply to a job (`{ job_id, cover_letter, document_ids }` — validated against the job's `RequiredDocs`). |
| POST | `/api/jobs?path=withdraw` | student | Withdraw a submitted application. |
| GET | `/api/jobs?path=deadline-reminders` | `Bearer CRON_SECRET` | Vercel Cron target (`0 8 * * *`) — sends deadline-reminder emails. |

### Employer — `/api/employer/*` (`api/employer/index.go`)

| Method | Path | Auth | Description |
|---|---|---|---|
| GET/PUT | `/api/employer/profile` | employer | Get/update the company profile. |
| GET/POST | `/api/employer/jobs` | employer | List / post jobs. |
| GET/PUT/DELETE | `/api/employer/jobs/:id` | employer | Job detail / update / delete. |
| GET | `/api/employer/applications` | employer | Applications across this employer's jobs. |
| GET | `/api/employer/application-detail` | employer | Single application detail. |
| PUT | `/api/employer/application-stage` | employer | Move an application through the pipeline (`Application.Stage`) — recorded in `ApplicationStageHistory`. |
| GET/PUT | `/api/employer/application-notes` | employer | Private note + rating on an application. |

### Staff — `/api/staff/*` (`api/staff/index.go`)

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/staff/dashboard` | staff | Platform-wide stats. |
| GET | `/api/staff/applications` | staff | All applications. |
| GET/PUT | `/api/staff/jobs` | staff | List jobs / approve-reject a job posting. |
| GET/PUT | `/api/staff/employers` | staff | List employers / approve-reject an employer account. |
| GET | `/api/staff/students` | staff | All student accounts. |
| GET | `/api/staff/student-detail` | staff | Single student detail + activity. |
| GET/PUT | `/api/staff/service-requests` | staff | List/schedule/complete/decline `ServiceRequest`s. |
| POST | `/api/staff/cleanup` | staff | Dev/admin account cleanup (`lib/admin/cleanup.go`). |

### Messages, notifications, connections, presence — `/api/messages/*`, `/api/users/*`, `/api/notifications/*`, `/api/connections/*`, `/api/profile/*`, `/api/upload` (all in `api/messages/index.go`)

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/messages/conversations` | session | Conversations, deduped by partner. |
| GET | `/api/messages/thread/:toId` | session | Message thread; marks received messages read. |
| POST | `/api/messages/send/:toId` | session | Send a message. |
| GET/PUT | `/api/messages/presence`, `/api/users/:id/presence` | session | Heartbeat + read a user's online status. |
| GET/PUT | `/api/messages/typing/:toId` | session | Typing indicator. |
| POST | `/api/upload` | session | File upload used by messages/documents. |
| GET | `/api/users/search?q=&role=` | session | Search users by name/username/email. |
| GET/PUT | `/api/notifications`, `/notifications/unread-count`, `/notifications/:id/read`, `/notifications/mark-all-read` | session | In-app notifications. |
| GET/POST/PUT | `/api/connections`, `/connections/request/:toId`, `/connections/:id/respond`, `/connections/for/:userId`, `/connections/suggestions` | session | LinkedIn-style connection requests + "people you may know". |
| GET | `/api/profile/:userId/view`, `/profile/:userId/endorsements` | session | Debounced profile-view tracking + skill endorsements. |

### Feed — `/api/feed/*` (`api/feed/index.go`)

| Method | Path | Auth | Description |
|---|---|---|---|
| GET/POST | `/api/feed` | session | List/create posts (text, job share, achievement, announcement). |
| GET/PUT/DELETE | `/api/feed/:id` | session | Post detail / update / delete. |
| POST | `/api/feed/:id/like` | session | Like/unlike a post. |
| GET/POST/DELETE | `/api/feed/:id/comments`, `/api/feed/:postId/comments/:commentId` | session | Comment CRUD. |

### Events — `/api/events/*` (`api/events/index.go`)

Events CRUD + registration, organised by staff or employers, registered for by students.

### AI — `/api/ai/*` (Python)

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/ai/chat` | session | Streaming AI career counselor chat. |
| POST | `/api/ai/review` | session | CV / document review — structured feedback. |

---

## Data Model

Core GORM models in `lib/models/models.go` (all soft-deleted via `gorm.DeletedAt`, UUID string primary keys):

| Model | Purpose |
|---|---|
| `User` | Central identity. Campus One fields (`CampusOneSub`, `StudentID`, `StudyLevel`, `Level`, `FacultyID`, `DepartmentID`) populate on first OIDC login; `PasswordHash` is unused for SSO users. |
| `EmployerProfile` | One per employer `User`. `Status` (`pending`→approved by staff) gates job posting; `IsVerified` is a separate badge. |
| `Job` | Posting. `Type` + `EmploymentCategory` (internship/siwes/nyse/graduate/full-time/...) are kept separate to avoid breaking existing filters. `RequiredDocs`/`OptionalDocs` are JSON arrays of `Document.Type`. |
| `Application` | `Stage` is the rich 9-value pipeline enum (see `lib/pipeline`); legacy `Status` is kept in sync via `pipeline.ToLegacyStatus()`. |
| `ApplicationStageHistory` | Audit trail of every stage transition. |
| `ApplicationNote` | Employer's private note + 0–5 rating on an application (one row per application+author, upserted). |
| `Document` | Reusable file a student attaches to applications instead of re-uploading — `resume\|cover_letter\|reference_letter\|transcript\|siwes_letter\|certification\|portfolio`. |
| `EmailVerification` | One-time token confirming an employer's contact email before staff review. |
| `Event` / `EventRegistration` | Career events + student sign-ups. |
| `Post` / `Comment` / `PostLike` | Social feed. A `Post` with `Kind = "job"` links to a `Job` via `JobID`. |
| `ProfileView` / `Endorsement` | Profile-view counter (debounced in the API layer, not the DB) and skill endorsements. |
| `Connection` | LinkedIn-style connection request (`pending\|accepted\|declined`). |
| `Message` / `TypingStatus` | Direct messages (with optional media) + typing indicator. |
| `Notification` | In-app notification; paired with an email via `notify.CreateAndEmail()`. |
| `ServiceRequest` | Student request for a staff-handled career service (`mock_interview\|career_advisory\|cv_review`). |
| `PasswordReset` | Legacy/unused now that auth is Campus One SSO-only — retained for backward compatibility of the schema. |

Migrations run automatically on cold start: `lib/db/db.go` calls `AutoMigrate` plus explicit `ALTER TABLE` statements. When adding a field, follow the order documented in [`CLAUDE.md`](./CLAUDE.md#adding-a-new-user-field).

---

## Frontend Guide

### Adding a New Page

1. Create `src/pages/<role>/MyPage.tsx`.
2. Register the route in `src/App.tsx`, wrapped in `<ProtectedRoute allowedRoles={[...]}>` if it requires auth.
3. If it needs a new API, add a `case` in the relevant `api/<domain>/index.go` **and** a rewrite in `vercel.json`.

### Design System

Two visual modes coexist — see [`CLAUDE.md`](./CLAUDE.md#design-system) for the full rule set:

- **Brutalist** (auth/onboarding): `border-[2px] border-black`, `shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]`, `font-black uppercase tracking-widest`
- **Modern/soft** (dashboards): `shadow-soft-*`, `border-gray-100`, standard weight text

Tailwind tokens (`tailwind.config.js`): `nile-blue` (`#1E499D`), `nile-green` (`#6CBB56`), `nile-white` (`#F8F8F8`), `shadow-soft-*`, `shadow-blue`/`shadow-green`.

`Button.tsx` variants: `primary | outline | ghost | danger | nile | nileGreen | nileBlue | subtle`, sizes `xs | sm | md | lg`.
`Avatar.tsx` sizes: `sm | md | lg | xl` only (no `xs`).

---

## Email

`lib/email` sends transactional email via **Resend**. Sends are fire-and-forget: if `RESEND_API_KEY` is unset, the call is logged and skipped rather than failing the request — local dev works without it.

`notify.CreateAndEmail()` is the standard call site: it creates the in-app `Notification` row and sends the matching email template in a single call. To add a new notification event, write a template function in `lib/email/templates.go` and call `notify.CreateAndEmail` at the relevant handler.

---

## AI Features

Two Python serverless functions powered by **Groq (llama-3.3-70b-versatile)**:

- **`POST /api/ai/chat`** — streaming career counselor chat, used by the AI Counselor page and Mock Interview feature.
- **`POST /api/ai/review`** — structured CV/document feedback, used in the Career Center.

```bash
pip install -r api/ai/requirements.txt
python api/ai/dev_server.py   # Flask dev server on :5001, proxied by vite.config.ts
```

---

## Deployment & Constraints

- **Vercel Hobby plan limit:** 12 serverless functions. Currently 8 Go `index.go` handlers + `health.go` + 2 Python files = 11 — **1 slot of headroom**. New functionality should extend an existing handler with a new `case` rather than add a new top-level `api/` folder.
- **No pgBouncer:** Go/GORM requires `STORAGE_DATABASE_URL_UNPOOLED` — the pooled URL breaks `PreferSimpleProtocol`.
- **CORS:** `mw.HandlePreflight(w, r)` must be the first call in every Go handler.
- **Response envelope:** always `respond.OK(w, payload)` → `{"data": payload}`.
- **`SameSite=Lax`:** required on the PKCE state cookies (`c1_state`, `c1_verifier`) to survive the Campus One cross-origin redirect — never change to `Strict`.

**Deploy steps:**

1. Connect the GitHub repo to Vercel.
2. Set environment variables in the Vercel Dashboard (see [`CLAUDE.md`](./CLAUDE.md#environment-variables) for the full list).
3. Push to `main` → Vercel auto-deploys. `vercel.json` handles rewrites, function config, the cron job, and headers.

---

## Contributing

### Branch Strategy

- `main` — production-ready code only
- `feature/<name>` / `fix/<name>` — topic branches

### Workflow

```bash
git checkout -b feature/my-feature
# ... make changes ...
git add <specific files>
git commit -m "feat: describe what and why"
git push origin feature/my-feature
# Open a PR → review → merge to main
```

### Code Standards

**Frontend:**
- TypeScript strict mode.
- Every API call handles loading, error, and empty states.
- Protected pages are wrapped in `<ProtectedRoute allowedRoles={[...]}>`.
- New endpoints need a matching `vercel.json` rewrite.

**Backend:**
- Every handler starts with `mw.HandlePreflight(w, r)`.
- Every protected route calls `mw.Auth(r)` and checks `auth.Role`.
- Responses use `respond.OK(w, payload)` / `respond.Error(w, status, msg)`.
- New routes need both a `case` in the handler's `switch` and a `vercel.json` rewrite.

### There are no automated tests

Manual verification via `vercel dev` is the test strategy. After any auth-related change, verify the full Campus One login flow for all three roles and confirm role-based access renders correctly.

---

## License

This project is the intellectual property of **Buildathon Team E** and Nile University's career services initiative. All rights reserved.

---

*Built by Buildathon Team E — Nile University Career Hub*
