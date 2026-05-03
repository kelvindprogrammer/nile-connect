# NileConnect Hub

**The career platform connecting Nile University students, staff, and employer partners.**

NileConnect is a full-stack, multi-role SPA built for Nile University's career services. It provides students with job discovery, AI-powered career coaching, peer networking, and application tracking — while giving staff administrative oversight and employers a recruitment hub.

---

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Environment Variables](#environment-variables)
  - [Running Locally](#running-locally)
- [User Roles & Portals](#user-roles--portals)
- [API Reference](#api-reference)
- [Frontend Guide](#frontend-guide)
- [Authentication](#authentication)
- [Database](#database)
- [AI Features](#ai-features)
- [Deployment](#deployment)
- [Contributing](#contributing)

---

## Overview

NileConnect is deployed as a **unified Vercel monorepo** containing:

- A **React 18 + Vite + TypeScript** frontend (SPA with subdomain-based role routing)
- **Go serverless functions** for all core backend API endpoints
- **Python serverless functions** (Groq/LLaMA 3.3) for AI career coaching and CV review
- **Neon PostgreSQL** as the primary database (via GORM)

All three layers deploy together from a single `vercel.json` configuration with no separate backend servers.

---

## Architecture

```
Browser
  │
  ├── student.builtbysalih.com  ─┐
  ├── staff.builtbysalih.com    ─┤──► React 18 SPA (index.html)
  └── employer.builtbysalih.com ─┘         │
                                            │ /api/* requests
                                            ▼
                                     Vercel Edge (vercel.json rewrites)
                                            │
                    ┌───────────────────────┼────────────────────────┐
                    │                       │                        │
             Go Functions             Go Functions            Python Functions
           /api/auth/*.go           /api/jobs/*.go          /api/ai/chat.py
           /api/student/*.go        /api/messages/*.go      /api/ai/review.py
           /api/staff/*.go          /api/employer/*.go
           /api/events/*.go         /api/feed/*.go
                    │
                    └──────────────────────────────────────────────────┐
                                                                       │
                                                               Neon PostgreSQL
                                                          (STORAGE_DATABASE_URL_UNPOOLED)
```

**Request flow for a protected endpoint:**

1. Browser sends `GET /api/student/profile` with `Authorization: Bearer <JWT>`
2. Vercel rewrite maps it to `GET /api/student?path=profile`
3. Go `Handler` extracts JWT via `lib/mw/mw.go → Auth()`
4. JWT parsed with `lib/jwtutil/jwtutil.go → Parse()`
5. Handler queries Neon DB via GORM and returns `{"data": payload}`
6. Frontend unwraps `response.data.data`

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite 5, TypeScript 5, Tailwind CSS 3 |
| UI Components | Lucide React, Radix UI primitives, CVA |
| State / Auth | React Context, localStorage JWT |
| HTTP Client | Axios (with interceptors for token attach + 401 handling) |
| Real-time | PeerJS (WebRTC audio/video calls), polling (messages) |
| Backend | Go 1.22 serverless functions (Vercel) |
| ORM | GORM 1.30 with PostgreSQL driver |
| Auth | HS256 JWT (`github.com/golang-jwt/jwt/v5`) |
| Password | bcrypt (`golang.org/x/crypto`) |
| AI | Python 3, Groq API (llama-3.3-70b-versatile) |
| Database | Neon PostgreSQL (serverless, direct connection) |
| Deployment | Vercel (monorepo, hobby plan — ≤ 12 functions) |
| Design System | Brutalist: nile-blue (#1E499D), nile-green (#6CBB56), offset box shadows |

---

## Project Structure

```
nile-connect/
├── api/                          # Go + Python serverless functions
│   ├── auth/index.go             # Login, register, forgot-password, delete-account
│   ├── student/index.go          # Student profile + applications
│   ├── employer/index.go         # Employer profile, jobs, applications
│   ├── staff/index.go            # Admin dashboard, employer/job approval
│   ├── jobs/index.go             # Job listing (GET) + apply (POST)
│   ├── messages/index.go         # Conversations, thread, send, user-search
│   ├── events/index.go           # Events CRUD
│   ├── feed/index.go             # Social feed posts
│   ├── health.go                 # Health-check endpoint
│   └── ai/
│       ├── chat.py               # AI career counselor (streaming)
│       └── review.py             # CV / document review
│
├── lib/                          # Shared Go packages
│   ├── db/db.go                  # Neon DB connection (GORM, direct pooling)
│   ├── jwtutil/jwtutil.go        # JWT generate + parse (HS256)
│   ├── models/models.go          # GORM models (User, Job, Application, ...)
│   ├── mw/mw.go                  # Middleware: CORS, JWT auth
│   └── respond/respond.go        # Uniform JSON response envelope
│
├── src/                          # React frontend
│   ├── App.tsx                   # Router + subdomain-based role routing
│   ├── main.tsx                  # App entry point
│   ├── index.css                 # Global styles + micro-interaction animations
│   │
│   ├── context/
│   │   ├── AuthContext.tsx       # Auth state: user, token, login/logout
│   │   └── ToastContext.tsx      # Global toast notifications
│   │
│   ├── hooks/
│   │   ├── useAuth.ts            # Re-exports useAuth from AuthContext
│   │   ├── useProfile.ts         # Extended profile (localStorage, profile strength)
│   │   └── useProfilePicture.ts  # Profile picture (base64, localStorage)
│   │
│   ├── layouts/
│   │   ├── AuthLayout.tsx        # Split-panel auth pages layout
│   │   ├── DashboardLayout.tsx   # Student portal layout (nav + main)
│   │   ├── StaffLayout.tsx       # Staff portal layout
│   │   └── EmployerLayout.tsx    # Employer portal layout
│   │
│   ├── pages/
│   │   ├── auth/                 # Login, Register, JoinAs, ForgotPassword, Onboarding
│   │   ├── onboarding/           # StudentStatus, ProfileCompletion, EmployerRegistration...
│   │   ├── student/              # Dashboard, JobBoard, JobDetail, CareerCenter, AI,
│   │   │                         # MockInterview, ApplicationTracker, Events, Profile,
│   │   │                         # EditProfile, LearningPath, Network, Messages
│   │   ├── staff/                # Dashboard, Applications, CRMManager, Events, Jobs,
│   │   │                         # Services, Reports, Profile, Messages, Settings
│   │   └── employer/             # Dashboard, Candidates, CandidateDetail, Jobs,
│   │                             # Applications, Feed, Events, Profile, Messages, Settings
│   │
│   ├── services/                 # Axios API call wrappers
│   │   ├── api.ts                # Axios instances + token interceptors
│   │   ├── authService.ts        # login, register, completeProfile, deleteAccount
│   │   ├── studentService.ts     # getStudentProfile, getApplications
│   │   ├── employerService.ts    # employer CRUD, jobs, applications
│   │   ├── staffService.ts       # staff dashboard stats, employer/job moderation
│   │   └── messageService.ts     # conversations, thread, send, searchUsers
│   │
│   ├── components/               # Reusable UI components
│   │   ├── Button.tsx            # Primary branded button (primary/outline/ghost/...)
│   │   ├── InputField.tsx        # Branded input with icon support
│   │   ├── Avatar.tsx            # Color-generated avatar with initials
│   │   ├── Modal.tsx             # Accessible modal overlay
│   │   ├── Card.tsx              # Brutalist card with shadow
│   │   ├── Feed.tsx              # Social feed component
│   │   ├── NileConnectLogo.tsx   # Animated orbital logo component
│   │   ├── ProtectedRoute.tsx    # JWT-gated route wrapper
│   │   ├── PageTransition.tsx    # Page fade/slide animation wrapper
│   │   └── ...                   # (QuickApplyModal, ConnectionModal, etc.)
│   │
│   └── utils/
│       ├── subdomain.ts          # Subdomain detection + portal URL builder
│       ├── navigation.ts         # redirectToPortal helper
│       └── formatMarkdown.tsx    # AI response markdown renderer
│
├── public/
│   ├── favicon.svg               # NileConnect SVG icon (primary)
│   └── favicon.ico               # ICO fallback for legacy browsers
│
├── index.html                    # SPA entry — meta tags, favicon links
├── vercel.json                   # Vercel config: rewrites, functions, headers
├── go.mod / go.sum               # Go module dependencies
├── package.json                  # Node dependencies
├── tailwind.config.js            # Tailwind + custom design tokens
├── vite.config.ts                # Vite build config
└── .env.example                  # Template for environment variables
```

---

## Getting Started

### Prerequisites

| Tool | Version | Purpose |
|---|---|---|
| Node.js | ≥ 18 | Frontend dev server + build |
| Go | ≥ 1.22 | Local API function testing |
| Python | ≥ 3.10 | AI function testing |
| Vercel CLI | latest | Full local emulation |

### Environment Variables

Copy `.env.example` to `.env.local` and fill in the values:

```bash
cp .env.example .env.local
```

| Variable | Required | Description |
|---|---|---|
| `STORAGE_DATABASE_URL_UNPOOLED` | **Yes** | Neon direct connection string (bypasses pgBouncer) |
| `JWT_SECRET` | **Yes** | Secret key for signing JWTs — min 32 chars |
| `GROQ_API_KEY` | Yes (AI) | Groq API key for llama-3.3-70b |

> **Note:** `STORAGE_DATABASE_URL_UNPOOLED` is the Vercel Postgres / Neon variable name used by the DB connector. Never use the pooled URL — Go functions don't support pgBouncer's `PreferSimpleProtocol`.

### Running Locally

**Option A — Vercel CLI (recommended, full stack):**

```bash
npm install -g vercel
vercel dev
```

This starts the React dev server AND all Go/Python serverless functions locally, with full rewrite support. Access at `http://localhost:3000`.

**Option B — Frontend only:**

```bash
npm install
npm run dev
```

The frontend will start at `http://localhost:5173`. All `/api/*` calls will fail unless a backend is running.

**Subdomain routing for local dev:**

The app uses subdomains for role portals. For full local testing, add entries to your `/etc/hosts` (or `C:\Windows\System32\drivers\etc\hosts` on Windows):

```
127.0.0.1   student.localhost
127.0.0.1   staff.localhost
127.0.0.1   employer.localhost
```

Then access `http://student.localhost:5173/`, `http://staff.localhost:5173/`, etc.

---

## User Roles & Portals

| Role | Subdomain | Registration | Login flow |
|---|---|---|---|
| **Student** | `student.*` | Self-register (email + password) | Direct login → student portal |
| **Staff** | `staff.*` | Register via `/join-as` → Staff option | Direct login → staff portal |
| **Employer** | `employer.*` | Full company profile registration | Staff must approve account before login |

After login, users are redirected to their role's subdomain portal automatically.

### Demo Accounts

Seed demo accounts by calling:

```
POST /api/auth/seed-demo
```

This creates (or resets) accounts:

| Role | Email | Password |
|---|---|---|
| Student | `student@demo.nileconnect.com` | `NileDemo2025!` |
| Staff | `staff@demo.nileconnect.com` | `NileDemo2025!` |
| Employer | `employer@demo.nileconnect.com` | `NileDemo2025!` |

---

## API Reference

All API endpoints follow the pattern: clean REST URL → Vercel rewrite → Go handler query param.

**Response envelope** (all success responses):
```json
{ "data": <payload> }
```

**Error response:**
```json
{ "error": "descriptive message" }
```

### Auth (`/api/auth/*`)

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/login` | — | Email + password login. Returns JWT + user. |
| POST | `/api/auth/register/student` | — | Register a new student account. |
| POST | `/api/auth/register/employer` | — | Register employer (pending staff approval). |
| POST | `/api/auth/profile/complete` | — | Set major + graduation year after student registration. |
| POST | `/api/auth/forgot-password` | — | Generate a password reset token. |
| POST | `/api/auth/reset-password` | — | Reset password using token. |
| POST | `/api/auth/delete-account` | JWT | Soft-delete the authenticated user's account. |
| POST | `/api/auth/seed-demo` | — | Create/reset demo accounts for testing. |

### Student (`/api/student/*`)

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/student/profile` | JWT (student) | Get authenticated student's profile. |
| GET | `/api/student/applications` | JWT (student) | List all applications with job + employer info. |

### Jobs (`/api/jobs`)

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/jobs` | — | List active jobs. Query params: `q`, `type`, `location`, `industry`. |
| GET | `/api/jobs/:id` | — | Get single job detail. |
| POST | `/api/jobs` | JWT (student) | Apply to a job (`{ job_id, cover_letter }`). |

### Employer (`/api/employer/*`)

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/employer/profile` | JWT (employer) | Get company profile. |
| PUT | `/api/employer/profile` | JWT (employer) | Update company profile. |
| GET | `/api/employer/jobs` | JWT (employer) | List jobs posted by this employer. |
| POST | `/api/employer/jobs` | JWT (employer) | Post a new job listing. |
| PUT | `/api/employer/jobs?id=<id>` | JWT (employer) | Update a job listing. |
| DELETE | `/api/employer/jobs?id=<id>` | JWT (employer) | Delete a job listing. |
| GET | `/api/employer/applications` | JWT (employer) | List all applications to this employer's jobs. |
| PUT | `/api/employer/applications?id=<id>` | JWT (employer) | Update application status. |

### Staff (`/api/staff/*`)

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/staff/dashboard` | JWT (staff) | Platform-wide stats (users, jobs, applications). |
| GET | `/api/staff/applications` | JWT (staff) | All student applications (latest 200). |
| GET | `/api/staff/jobs` | JWT (staff) | All job listings (pending + active). |
| PUT | `/api/staff/jobs` | JWT (staff) | Update job status (`{ job_id, status }`). |
| GET | `/api/staff/employers` | JWT (staff) | All employer accounts + profiles. |
| PUT | `/api/staff/employers` | JWT (staff) | Approve/reject employer (`{ employer_id, status }`). |
| GET | `/api/staff/students` | JWT (staff) | All student accounts. |

### Messages (`/api/messages/*`)

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/messages/conversations` | JWT | List conversations (deduped by partner). |
| GET | `/api/messages/thread/:toId` | JWT | Get message thread with a user. Marks received as read. |
| POST | `/api/messages/send/:toId` | JWT | Send a message (`{ content }`). |
| GET | `/api/users/search?q=&role=` | JWT | Search users by name/username/email. |

### AI (`/api/ai/*`) — Python

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/ai/chat` | JWT | AI career counselor chat (`{ messages: [{role, content}] }`). |
| POST | `/api/ai/review` | JWT | CV / document review (`{ content, type }`). |

---

## Frontend Guide

### Subdomain Routing

`src/App.tsx` detects the current subdomain via `src/utils/subdomain.ts` and renders the appropriate role portal. If no subdomain matches, public routes (login, onboarding) are shown.

```ts
// Get current subdomain: 'student' | 'staff' | 'employer' | null
getSubdomain()

// Build full URL for cross-subdomain navigation
getPortalUrl('student', '/jobs')  // → https://student.builtbysalih.com/jobs
```

### Adding a New Page

1. Create `src/pages/<role>/MyPage.tsx`
2. Import it in `src/App.tsx`
3. Add a `<Route path="my-page" element={<MyPage />} />` inside the appropriate subdomain block
4. If it requires a new API, add the endpoint to `vercel.json` rewrites and implement in the corresponding `api/<domain>/index.go`

### Design System

All UI follows the **NileConnect brutalist design system**:

| Token | Value | Usage |
|---|---|---|
| `nile-blue` | `#1E499D` | Primary brand color — buttons, links, headers |
| `nile-green` | `#6CBB56` | Accent — success states, hover shadows, CTAs |
| `nile-white` | `#F8F8F8` | Background |
| Border | `border-[2px] border-black` | Standard component border |
| Shadow | `shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]` | Brutalist offset shadow |
| Radius | `rounded-[20px]` / `rounded-[24px]` | Soft rounded cards |
| Type | `font-black uppercase tracking-widest` | All caps headings |

**Button variants** (see `src/components/Button.tsx`):

```tsx
<Button variant="primary">   // Black + green shadow (default)
<Button variant="outline">   // White + black border
<Button variant="ghost">     // Transparent, minimal
<Button variant="danger">    // Red, for destructive actions
<Button variant="nile">      // Nile blue + green shadow
<Button isLoading={true}>    // Shows spinner, disables interaction
```

### Animations & Micro-interactions

Key CSS utility classes (defined in `src/index.css`):

| Class | Effect |
|---|---|
| `anime-fade-in` | Fade-in page entry |
| `anime-slide-up` | Slide up entry |
| `stagger > *` | Staggered list item reveal |
| `card-lift` | Hardware-accelerated lift on hover |
| `btn-tactile` | Press-depth button feel |
| `magnetic-btn` | Smooth lift + active press |
| `skeleton-enhanced` | Premium shimmer placeholder |
| `nc-float` | Floating logo animation |
| `pulse-green` / `pulse-blue` | Live indicator pulses |
| `shake` | Notification / error shake |

---

## Authentication

NileConnect uses **JWT (HS256)** stored in `localStorage` as `nile_token`.

**Frontend:**
- `src/context/AuthContext.tsx` — stores user object and token in state + localStorage
- `src/services/api.ts` — Axios interceptor automatically attaches `Authorization: Bearer <token>` to every request
- On 401 response, token is cleared and `auth:expired` event is dispatched, triggering logout

**Backend:**
- `lib/mw/mw.go → Auth(r)` — reads `Authorization` header, extracts Bearer token, calls `jwtutil.Parse()`
- `lib/jwtutil/jwtutil.go` — `Generate(userID, role, subtype)` and `Parse(token)` using `JWT_SECRET` env var
- Token payload: `{ sub: userID, role: "student|staff|employer", subtype: "current|alumni" }`
- Token expiry: 24 hours

---

## Database

**Provider:** Neon PostgreSQL (serverless)

**Connection:** Uses `STORAGE_DATABASE_URL_UNPOOLED` (direct TCP connection, bypasses pgBouncer) with `PreferSimpleProtocol: true` for compatibility.

**Models** (`lib/models/models.go`):

| Model | Key Fields |
|---|---|
| `User` | id, full_name, username, email, password_hash, role, student_subtype, major, graduation_year, is_verified |
| `EmployerProfile` | id, user_id, company_name, industry, location, about, contact_email, website, linkedin, status |
| `Job` | id, employer_id, title, type, location, salary, description, requirements, skills, status, applicant_count, deadline |
| `Application` | id, job_id, student_id, status, applied_at |
| `Message` | id, sender_id, receiver_id, content, is_read |
| `Event` | id, organiser_id, organiser_type, title, category, date, time, location, description |
| `PasswordReset` | id, user_id, token, expires_at, used |

All models use soft-delete (`gorm.DeletedAt`) — no hard deletes.

---

## AI Features

Two Python serverless functions powered by **Groq API (llama-3.3-70b-versatile)**:

**`/api/ai/chat`** — Career Counselor  
Accepts a chat history array and returns an AI response. Used in the AI Counselor page and Mock Interview feature.

**`/api/ai/review`** — CV / Document Review  
Accepts a document string and returns structured feedback. Used in the Career Center.

Python dependencies: see `api/ai/requirements.txt`

To run AI functions locally:
```bash
pip install -r api/ai/requirements.txt
python api/ai/dev_server.py
```

---

## Deployment

NileConnect is designed for **Vercel Hobby** (≤ 12 serverless functions).

**Current function count:** 11 Go + 2 Python = 13 total
> The `health.go` file in the root `api/` directory is a handler; ensure the total count stays at or below 12 Go functions.

**Deploy steps:**

1. Connect GitHub repo to Vercel
2. Set environment variables in Vercel Dashboard → Project Settings → Environment Variables:
   - `STORAGE_DATABASE_URL_UNPOOLED`
   - `JWT_SECRET`
   - `GROQ_API_KEY`
3. Configure custom domains:
   - `builtbysalih.com` → main SPA
   - `student.builtbysalih.com` → student portal
   - `staff.builtbysalih.com` → staff portal
   - `employer.builtbysalih.com` → employer portal
4. Push to `main` → Vercel auto-deploys

The `vercel.json` handles all rewrites, function timeouts, CORS headers, and static asset caching automatically.

---

## Contributing

### Branch Strategy

- `main` — production-ready code only
- `feature/<name>` — new feature branches
- `fix/<name>` — bug fix branches

### Development Workflow

```bash
git checkout -b feature/my-feature
# ... make changes ...
git add <specific files>
git commit -m "feat: describe what and why"
git push origin feature/my-feature
# Open Pull Request → review → merge to main
```

### Code Standards

**Frontend:**
- TypeScript strict mode — no `any` without explicit comment
- All API calls must handle loading, error, and empty states
- New pages must be wrapped in `<ProtectedRoute allowedRoles={[...]}>`
- New API endpoints must be added to `vercel.json` rewrites

**Backend:**
- All protected endpoints must call `mw.Auth(r)` and check `auth.Role`
- All responses must use `respond.OK(w, payload)` or `respond.Error(w, status, msg)`
- New routes must be added to the handler's `switch` statement AND to `vercel.json`

### Testing Demo Accounts

After any auth-related change, verify the full login flow:
1. Call `POST /api/auth/seed-demo` to reset demo accounts
2. Login as student, staff, and employer
3. Verify role-based redirects land on the correct subdomain portal

---

## License

This project is the intellectual property of **Buildathon Team E** and Nile University's career services initiative. All rights reserved.

---

*Built with by Buildathon Team E — Nile University Career Hub*
