# ⚠️ Legacy / Unused

This `backend/` directory is an early prototype (GoFiber + DDD-style `domain/` packages) that predates the current architecture. **It is not built or deployed** — `vercel.json` only builds Go functions under `api/*/index.go` at the repo root, using the shared packages in `lib/`.

For the actual, deployed backend architecture, see the root [`README.md`](../README.md#architecture) and [`CLAUDE.md`](../CLAUDE.md).

This file is kept only so the historical prototype isn't silently lost; do not use it as a reference for how the current API works.
