<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Dashify spec-driven delivery

- For cross-system Dashify work, consult `../../docs/implementation-plan/`. Start with `00-execution-roadmap.md` and the relevant approved feature spec.
- Treat `Draft` specs and decision records as proposals. Do not implement unresolved API, auth, role, tenancy, or product behavior by assumption; record the question and request approval.
- Before changing an API adapter or UI flow, verify the backend OpenAPI/controller contract. Keep wire DTOs distinct from UI view models and test their mapping.
- Implement vertical slices against the real service boundary. API mode must not silently fall back to mock data; client-side role checks are UX only, never authorization.
- When a contract changes, update the shared spec/baseline and coordinate the backend change. Add focused tests for success, errors, authorization UX, and relevant role/workspace behavior.
