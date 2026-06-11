# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Frontend
npm run dev          # Vite dev server at http://localhost:5173 (frontend only)
npm run build        # Production build → dist/
npm run lint         # ESLint (max-warnings 0 — must be clean)
npx tsc --noEmit     # Type-check without building

# Full stack (recommended)
vercel dev           # Starts React + all Go/Python serverless functions at localhost:3000

# AI functions only (Python)
pip install -r api/ai/requirements.txt
python api/ai/dev_server.py   # Flask dev server on port 5001 (proxied by vite.config.ts)

# Go (no dedicated test runner — verify by running vercel dev)
```

There are no automated tests. Manual verification is the only test strategy.

## Architecture

**Vercel monorepo** — single repo, single deployment, three runtimes:

| Layer | Path | Runtime |
|---|---|---|
| React SPA | `src/` | Browser (built by Vite) |
| Core API | `api/*/index.go` | Go 1.22 serverless |
| AI | `api/ai/*.py` | Python 3 serverless |
| Shared Go | `lib/` | imported by all Go handlers |

**Routing pattern:** Every Go handler lives at `api/<domain>/index.go` and exports a single `Handler(w, r)` function. Vercel maps clean URLs to handlers via `vercel.json` rewrites, passing the sub-action as a `?path=` query param:

```
GET /api/employer/profile  →  /api/employer?path=profile  →  employerProfile()
GET /api/employer/jobs     →  /api/employer?path=jobs     →  employerJobs()
```

Adding any new endpoint requires **both** a `case "xxx":` in the handler's `switch r.URL.Query().Get("path")` block **and** a matching rewrite in `vercel.json`.

**Authentication:** Campus One OIDC (not username/password). The PKCE flow is in `api/auth/index.go`. After successful auth, a signed `nile_session` httponly cookie is issued (7-day JWT, signed with `SESSION_SECRET`). All protected Go handlers call `mw.Auth(r)` which reads this cookie. The frontend reads auth state via `GET /api/auth/me` on load — there is no token in localStorage.

**User roles:** `student`, `staff`, `employer`. Role is determined from Campus One OIDC claims (`roles[]` > `role` > `custom_roles`), not user-supplied. Role mapping lives in `mapCampusOneRoleFromClaims()` in `api/auth/index.go`. Employers auto-get an empty `EmployerProfile` row created on first login (status=`pending`; staff must approve).

**Database:** Neon PostgreSQL via GORM. `lib/db/db.go` runs `AutoMigrate` + explicit `ALTER TABLE` statements on every cold start. The connection uses `STORAGE_DATABASE_URL_UNPOOLED` (direct, not pooled) with `PreferSimpleProtocol: true`. All models use soft-delete (`gorm.DeletedAt`).

**Frontend auth flow:**
1. `AuthProvider` in `src/context/AuthContext.tsx` calls `GET /api/auth/me` on mount
2. Response maps to the `User` type via `mapBackendUser()` in `authService.ts`
3. `signIn()` redirects to `GET /api/auth/login` which starts the Campus One redirect
4. After Campus One redirects back, `/api/auth/callback` sets the session cookie and redirects to the role dashboard

**Adding a new user field:**
Must update in this exact order: `lib/models/models.go` → `lib/db/db.go` (explicit ALTER TABLE) → `api/auth/index.go:userToResponse` → `src/services/authService.ts:BackendUser` → `src/context/AuthContext.tsx:User` + `mapBackendUser`.

## Key Constraints

- **Vercel function limit:** The hobby plan allows 12 serverless functions. Currently at 10 Go + 1 `health.go` + 2 Python = 13 (health is a single-file handler, not counted by Vercel the same way). Do not add new top-level `api/` files without removing another.
- **No pgBouncer:** Go GORM needs `STORAGE_DATABASE_URL_UNPOOLED`. The pooled URL will cause prepared-statement errors.
- **CORS:** `mw.HandlePreflight(w, r)` must be the first call in every Go handler — it sets CORS headers for all responses and handles OPTIONS preflight.
- **Response envelope:** All Go API responses must use `respond.OK(w, payload)` → `{"data": payload}`. Frontend unwraps as `response.data.data`.
- **SameSite=Lax cookies:** PKCE state cookies (`c1_state`, `c1_verifier`) rely on `SameSite=Lax` to survive the cross-origin redirect from Campus One. Do not change this to `Strict`.

## Design System

NileConnect has two visual modes that coexist:

- **Brutalist** (auth pages, onboarding): `border-[2px] border-black`, `shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]`, `font-black uppercase tracking-widest`
- **Modern/soft** (dashboards, layouts): `shadow-soft-*`, `border-gray-100`, standard weight text

The Tailwind config (`tailwind.config.js`) extends with `nile-blue` (full scale, default `#1E499D`), `nile-green` (full scale, default `#6CBB56`), `nile-white` (`#F8F8F8`), `shadow-soft-*` variants, and `shadow-blue`/`shadow-green` glow utilities.

`Button.tsx` exports variants: `primary | outline | ghost | danger | nile | nileGreen | nileBlue | subtle` and sizes `xs | sm | md | lg`. `Avatar.tsx` sizes: `sm | md | lg | xl` only — `xs` is not valid.

## Environment Variables

Required (Vercel + local `.env.local`):

| Variable | Purpose |
|---|---|
| `CAMPUS_ONE_CLIENT_ID` | OAuth2 client ID from Campus One developer dashboard |
| `CAMPUS_ONE_CLIENT_SECRET` | OAuth2 client secret |
| `CAMPUS_ONE_WEBHOOK_SECRET` | HMAC secret for webhook signature verification |
| `APP_URL` | Full app base URL (e.g. `https://nile-connect.vercel.app`) — used for cookie domain + redirect URI |
| `SESSION_SECRET` | Signs the `nile_session` JWT cookie (falls back to `JWT_SECRET`) |
| `STORAGE_DATABASE_URL_UNPOOLED` | Neon direct connection string (preferred) |
| `DATABASE_URL` | Fallback Postgres connection string |
| `GROQ_API_KEY` | Groq API key for AI functions |
