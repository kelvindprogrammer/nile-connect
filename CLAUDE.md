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

# Go
# (no dedicated runner for the handlers — verify those by running vercel dev)
```

```bash
# Tests
npm test             # Vitest (frontend unit tests, *.test.ts next to the source)
go test ./...        # Go unit tests
```

Coverage is deliberately narrow: it guards the two contracts that silently broke
in production — the event-category vocabulary shared across Go and TypeScript,
and the profile-completeness calculation. Everything else is still verified by
running the app.

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

**Applications pipeline / ATS:** `Application.Stage` (rich 9-value enum: submitted, under_review, shortlisted, interview_scheduled, assessment_sent, offer_extended, accepted, rejected, withdrawn — see `lib/pipeline`) drives the ATS UI; the legacy 5-value `Application.Status` is kept in sync via `pipeline.ToLegacyStatus()` so older readers still work. Every stage change is recorded in `ApplicationStageHistory`. Students attach reusable `Document` rows (resume/cover_letter/reference_letter/transcript/siwes_letter/certification/portfolio) to applications instead of re-uploading each time — see `api/student/index.go` (`documents`, `application-package` cases) and `api/jobs/index.go` (`apply` case validates `document_ids` against a job's `RequiredDocs`).

**Events:** `Event.Category` is always one of the canonical slugs in `lib/eventcat`
(`career_fair`, `workshop`, `networking`, `webinar`, `seminar`, `info_session`,
`alumni_meetup`, `hackathon`, `tech_talk`, `other`). `eventcat.Normalize()` runs
on every write and every read, and `lib/db` re-normalises existing rows on cold
start. The frontend mirror is `EVENT_CATEGORIES` in `src/services/eventService.ts`
— **the two lists must stay identical**; `src/services/eventService.test.ts`
parses the Go file and fails the build if they drift. Three divergent spellings
of the same category ("Career Fair" / "career_fair" / "FAIR") is what made
category filtering return nothing.

Event visibility is role-scoped in `listEvents`: staff see every row, employers
see published events plus their own, students see published events plus their
own suggestions, anonymous callers see published only. Registration is a real
`EventRegistration` row behind a unique `(event_id, student_id)` index;
`registrations_count` is always recomputed from those rows, never incremented.
Sub-routes are `?path=register|suggest|categories` (see `vercel.json`).

**Extended profile:** bio, location, phone, LinkedIn, portfolio, GitHub, skills
and experiences are **columns on `users`**, served by `/api/student/profile`.
They previously lived only in browser localStorage seeded with placeholder
values, which made Profile Strength read 100% on an empty profile. `useProfile`
treats an untouched profile as genuinely empty and keeps localStorage only as a
render cache. Compute strength via `useProfileCompletion()` — never re-derive it
per page, or different screens will disagree.

## Social layer

The social domain lives in `lib/` packages with one thin HTTP dispatcher at
`api/social/index.go` (`?path=` routing, like `api/messages`). The single
function is a **platform constraint** — the Hobby plan caps the project at 12
serverless functions and all 12 are now in use — not an architectural choice.
Domain rules belong in the `lib/` packages; the handler only parses, authorises
and delegates.

| Package | Owns |
|---|---|
| `lib/socialgraph` | follows, blocks, mutes, close friends; `Relation` resolution |
| `lib/privacy` | audience + interaction gates; the server-side visibility engine |
| `lib/moderation` | reports, sanctions, the immutable audit log |
| `lib/reactions` | the 6-reaction vocabulary and toggle semantics |
| `lib/feedrank` | feed scoring, suppression and author diversity |
| `lib/textparse` | @mention / #hashtag extraction |
| `lib/mediaguard` | upload byte-sniffing and the format allowlist |
| `lib/ratelimit` | per-user quotas, counted from durable rows |
| `lib/analytics` | privacy-conscious product events |

**Rules that must not be broken:**

- **Every visibility decision goes through `privacy.CanView`.** Blocks are
  checked before everything else, including the "everyone" audience, and an
  unrecognised audience value denies. Never add a read path that filters
  visibility in the client.
- **Blocks are filtered in SQL, not in Go.** `socialgraph.BlockedIDs` feeds a
  `NOT IN` on the query. Filtering after the fetch returns short pages and
  makes `has_more` wrong.
- **Counters are recomputed, never incremented.** Reactions, reposts, comments
  and tag counts all `UPDATE ... SET x = (SELECT COUNT(*) ...)`. A retried
  request must not be able to drift them.
- **Uploads are identified by their bytes.** `mediaguard.Detect` ignores the
  client's Content-Type; the stored MIME type and extension both come from the
  sniff. SVG and HTML are deliberately not on the allowlist — they execute.
- **User text is never rendered as HTML.** `PostBody.tsx` tokenises and returns
  React elements. `dangerouslySetInnerHTML` on user content is how a feed gets
  stored XSS, and it is structurally absent here.
- **Moderation writes its audit row in the same transaction as its effect.** If
  the `ModerationAction` insert fails, the effect rolls back with it.
- **Analytics uses a key allowlist** (`lib/analytics.allowedProps`), not a
  length heuristic. A short sentence is still content; only reviewed dimension
  names are stored.

### Stories, Groups, Communities, Polls

All four are built end-to-end (domain package -> `api/social?path=` route ->
service -> UI). Notes worth carrying:

- **Stories** (`lib/stories`) expire after 24h but are FILTERED on read, never
  deleted — a story reported minutes before expiry must stay reviewable.
  Viewer lists and completion rate are author-only, enforced server-side.
- **Groups** (`lib/groups`) enforce a strict role hierarchy
  (owner > admin > moderator > member). A member can never act on someone at or
  above their own rank, and **the owner cannot leave without transferring
  ownership** — a group with no owner is unadministrable. Visibility and join
  policy are separate axes: "restricted" is findable but unreadable until you
  join; "private" is invisible and returns 404, not 403, to non-members.
- **Polls** (`lib/polls`) enforce one vote per person for single-choice in a
  transaction — the unique index alone cannot express "at most one option".
  `total_votes` counts DISTINCT VOTERS, not rows, or multi-choice percentages
  are wrong. Anonymous polls never expose voters through any path, including
  to the author.

### Real-time and push

- **SSE, not WebSockets** (`api/social?path=stream`). Vercel serverless cannot
  hold a WebSocket. The handler streams for ~25s (inside the 30s function
  limit), then emits a `reconnect` event carrying the resume cursor;
  `useRealtime` reconnects immediately, so the seam loses nothing. Polling
  remains as a fallback — if the stream cannot connect the app behaves exactly
  as it did before.
- **Web Push** (`lib/webpush`) is a from-scratch RFC 8291 + RFC 8292
  implementation, so there is no new dependency. It needs `VAPID_PUBLIC_KEY`,
  `VAPID_PRIVATE_KEY` and `VAPID_SUBJECT`; **without them push silently no-ops**
  exactly like `lib/email` without a Resend key. Generate a keypair with
  `webpush.GenerateKeys()`. Push fans out from `notify.Create`/`notify.Grouped`
  so a new notification type gets push automatically — and only on the FIRST
  notification of a group, or the device buzzes once per actor.

**Feed ranking** is a closed-form sum of named signals in `lib/feedrank`, not a
learned model — deliberately, so it can be audited by reading it. Engagement is
log-compressed and capped so virality cannot dominate; author diversity is a
hard post-ranking pass; and negative signals (`not_interested`, `hide_post`,
mute, block) remove content outright rather than down-weighting it. `?mode=latest`
is a real chronological escape hatch and must stay.

**Email:** `lib/email` sends transactional email via Resend (fire-and-forget, logs and continues if `RESEND_API_KEY` is unset — never blocks the request). `notify.CreateAndEmail()` is the standard call site: it creates the in-app `Notification` row and sends the matching email template in one call. Add new events by writing a template function in `lib/email/templates.go` and calling `notify.CreateAndEmail` at the relevant handler site.

## Key Constraints

- **Vercel function limit: FULL.** The hobby plan allows 12 and all 12 are used: 9 Go `index.go` folders (auth, employer, events, feed, jobs, messages, social, staff, student) + `api/health.go` + 2 Python AI files. `api/dev_server.py` is local-only tooling and is excluded via `.vercelignore` — do not remove that line or the build exceeds the cap. **There is no headroom**: new functionality MUST extend an existing handler's `?path=` switch. Also note Vercel's Go builder treats every `.go` file under `api/` as an entrypoint, so each `api/*/` folder must contain exactly one file, and that file must export `Handler`.
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
| `RESEND_API_KEY` | Resend API key — powers all transactional email (`lib/email`). Sends are skipped (logged only) when unset, so local dev works without it |
| `RESEND_FROM` | Optional sender address override, e.g. `Nile Connect <notifications@yourdomain.com>` (falls back to a default) |
| `CRON_SECRET` | Bearer token Vercel Cron sends to `/api/jobs?path=deadline-reminders`; the endpoint rejects requests without a matching `Authorization: Bearer <secret>` header |
| `ROLE_OVERRIDE_SECRET` | Optional. If set, enables `POST /api/auth/dev-set-role` (`Authorization: Bearer <secret>`, body `{email, role, student_subtype?}`) for flipping an existing account's role during testing without needing separate Campus One accounts per role. Leave unset in real production to keep the endpoint disabled (404) |
