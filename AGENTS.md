# Agent Guidelines

Instructions for AI agents working in this repository. Read [README.md](./README.md) for the product overview, API map, setup steps, and deployment details; read [DEPLOYMENT.md](./DEPLOYMENT.md) for platform-specific deployment instructions.

## Before making changes

- Inspect the relevant implementation and existing patterns before editing. Verify request and response shapes in routes, controllers, services, repositories, models, and the frontend API client as applicable.
- Keep changes focused and preserve existing behavior unless the task explicitly asks to change it. Do not invent endpoints, fields, status values, or environment variable names.
- Never claim a test, build, deployment, or runtime behavior was verified unless you ran the corresponding check.
- Do not revert unrelated user changes or commit unless asked.

## Architecture

- `frontend/` is a React/Vite client. Keep API calls in `frontend/src/api/`; use `VITE_API_BASE_URL`, not hard-coded service URLs.
- `backend/` is a CommonJS Express API. Preserve the existing routes → controllers → services → repositories → Mongoose models separation.
- MongoDB is the durable source of truth. Upstash Redis is only an optional comparison cache.
- Gemini output is draft content, not authoritative data or approval. Human review is required.

## Domain rules

- A release groups immutable, numbered package versions and associated brief versions. Do not overwrite prior package or brief history.
- A brief belongs to a release and a source package version. If one already exists for that package version, return it rather than creating a duplicate; enforce this in the backend/database, not only in the UI.
- Saving changed source notes creates a new package version and can make prior briefs stale. Preserve stale briefs in history and visibly identify their stale state.
- Enforce stale-state restrictions server-side. Do not weaken established rules for editing, approving, or rejecting stale briefs.
- Preserve original AI-generated content separately from reviewer-edited content. Record reviewer actions and feedback using the existing review-history design.
- Approval must always be a deliberate human action; never auto-approve generated content.

## AI, evidence, and comparisons

- Validate Gemini output before persisting it. Handle provider failures without corrupting records.
- Preserve warnings, citations, and QA evidence checks. An exact quote match only confirms that the quote occurs in the referenced source; it does not prove the full claim.
- Keep deterministic field/package/citation diffs distinct from AI-generated analysis. Preserve heuristic citation match method and confidence; do not present heuristic matches as verified facts.
- Render comparison results as readable sections rather than a raw JSON dump. Raw JSON, if provided, is secondary/debug output.
- Redis cache keys must scope results by release, revision, and compared versions. Invalidate or version cache entries when relevant source or review data changes, apply the configured TTL, and preserve the existing cache-miss/failure fallback behavior.
- Never make Redis the only store for releases, packages, briefs, approvals, or review history.

## Backend and frontend conventions

- Validate incoming values at the API boundary and enforce business rules in backend services/database constraints.
- Use the existing `ApplicationError`, response shape, and structured logger patterns. Do not log credentials, tokens, or sensitive payloads.
- Keep UI responsibilities separated across the existing forms, workspace, brief details/history, and comparison components.
- For asynchronous UI flows, maintain clear loading, empty, success, and error states; prevent duplicate submissions while requests are in progress.
- Use accessible controls, visible labels, useful validation messages, and clear action text. Do not present a reviewer ID as authenticated identity.
- CORS is not authentication. Do not claim authentication or authorization exists unless it has been implemented.

## Environment and security

- Never commit `.env` files, API keys, database credentials, or Redis tokens.
- Never place backend secrets in `VITE_*` variables; Vite exposes them in the browser bundle.
- Keep environment variable names aligned with backend configuration and `.env.example` files. Production must use a hosted MongoDB URI, not the local development fallback.

## Validation

Run checks relevant to the changes, using scripts that actually exist:

```powershell
# Frontend
Set-Location frontend
npm run lint
npm run build

# Backend syntax check (from the repository root)
Get-ChildItem backend/src -Recurse -Filter *.js | ForEach-Object { node --check $_.FullName }
```

The backend's current `npm test` script is a placeholder, not an automated test suite. Do not report it as passing tests. For changes to lifecycle, comparison, or caching behavior, also validate the affected state transitions and cache hit/miss/invalidation/fallback paths when a suitable test or local setup is available.

## Completion summary

Summarize what changed, checks actually run and their results, and any unverified assumptions or remaining limitations.
