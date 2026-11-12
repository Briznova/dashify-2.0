# Dashify Full-Stack Execution Checklist

**Status:** Phase 0 complete; Phase 1 blocked pending decisions  
**Execution rule:** Complete the next unchecked task in order. Do not start a later phase while its prerequisites or gate are incomplete. Check an item only after its evidence is recorded.

Use the [execution roadmap](./00-execution-roadmap.md) for phase context and the linked specs for details. Keep this checklist as the progress tracker; update `Status` and add evidence as tasks are completed.

## Phase 0 — Repository and runtime baseline

**Status:** Complete — baseline captured; issues documented  
**Gate:** Both repositories have reproducible setup instructions, baseline checks are recorded, and the live OpenAPI/route inventory is reconciled with the contract baseline.

### 0.1 Workspace and toolchain

- [x] Confirm the frontend and backend working-tree state; identify existing changes to preserve.
- [x] Record the Node version, package manager, and install command used by each repository.
- [x] Confirm required environment variables and local service dependencies without exposing secrets.
- [x] Confirm backend/frontend ports, `API_PREFIX`, frontend API base URL convention, and CORS origin.

### 0.2 Frontend baseline

- [x] Install dependencies only if required by the repository state or validation failures.
- [x] Run frontend lint and production build; record command and result.
- [x] Verify mock mode starts and document how to select API mode.
- [x] Record current role landing routes/navigation and note any pre-existing failures.

### 0.3 Backend baseline

- [x] Confirm database and Prisma setup needed for local execution; do not reset or modify shared data.
- [x] Run backend Prisma generation if needed, lint, typecheck, unit tests, build, and relevant e2e tests.
- [x] Record which checks need a database or environment secrets and whether they ran.
- [x] Start the backend only with an explicitly configured local/test environment.

### 0.4 API and contract inventory

- [x] Generate or retrieve the current OpenAPI document from the backend.
- [x] Compare OpenAPI operations with controllers, DTOs, guards, and service implementations.
- [x] Verify actual auth response, protected-request credential transport, and active-school flow.
- [x] Compare frontend HTTP adapter paths, methods, headers, request bodies, response shapes, and pagination to OpenAPI.
- [x] Update [contract baseline](./01-contract-baseline.md) with verified facts and date.
- [x] List any discrepancies between OpenAPI and implementation as explicit backend issues/spec questions.

**Phase 0 evidence:** setup notes, command results, live OpenAPI route inventory in the contract baseline, and test environment outcomes. The OpenAPI document was retrieved from the temporary local `/docs-json` endpoint and not retained as a generated file.

| Date | Checklist item | Evidence / result | Owner |
|---|---|---|---|
| 2026-11-12 | Phase 0 baseline | Frontend lint/build and mock-mode route smoke check passed. Backend Prisma generation, typecheck, unit tests (7), build, health E2E (1), live readiness, and OpenAPI retrieval passed. Backend lint is blocked by missing ESLint 9 config; formatting check reports 42 files. Local DB and both temporary servers were stopped after checks; local Compose volume remains. Full details and configuration mismatches are in [contract baseline](./01-contract-baseline.md). | Copilot |

## Phase 1 — Approve identity, auth, and tenancy

**Status:** In progress — product directions recorded; API/security details remain open  
**Gate:** Required decision records and the auth/session API contract are reviewed and approved.

- [x] Review the [identity/auth/tenancy spec](./02-identity-auth-tenancy-spec.md).
- [x] Record selected product direction for cookie authentication and current-session logout in [ADR-001](./decisions/ADR-001-browser-authentication.md).
- [x] Record password-reset-in-scope and signup-deferred direction in [ADR-005](./decisions/ADR-005-signup-and-password-reset-scope.md).
- [x] Record school selection, selectable workspace role, union permission, and distinct platform-scope direction in [ADR-002](./decisions/ADR-002-school-and-role-scope.md).
- [x] Record that frontend role navigation/actions are filtered using backend permission keys; API authorization remains authoritative.
- [x] Approve cookie names/scope, deployed Secure behavior, same-site default, CSRF Origin+token direction, 15-minute access / 30-day rotating refresh defaults, and current-session revocation.
- [x] Confirm Platform Super Admin session is platform-only, with no school switching from that session.
- [x] Approve login, refresh, logout, session, and active-school/workspace schema direction; record it in [auth-session OpenAPI](./contracts/auth-session.openapi.yaml).
- [x] Approve platform-only session representation; record exact platform permission implementation for backend design review.
- [x] Approve the 60-minute one-time reset token, request limits (3 per email and 10 per IP per 15 minutes), audit/secret-redaction policy, all-session revocation, and 12-character password minimum.
- [ ] Select password-reset delivery provider; decide confirmation-attempt throttling, token storage details, provider configuration, and final request/confirmation schemas.
- [x] Approve auth/session/school OpenAPI planning contract direction and cookie/CSRF/error requirements.
- [ ] Approve password-reset OpenAPI behavior after provider and abuse-control decisions.

Phase 1 update: auth/session/school direction and password-reset security policy are recorded. The password-reset delivery provider is deferred; confirmation-attempt throttling, token storage details, provider configuration, and final reset contract approval remain open, so Phase 1 remains in progress.

## Phase 2 — Implement the auth/session vertical slice

**Status:** Complete — core auth/session/school flow verified; password reset remains separately gated  
**Gate:** A real API login → session restore → school selection → protected request → logout flow passes tests. Password reset is excluded and disabled in API mode until its provider and final contract are approved.

- [x] Implement the approved backend auth/session contract.
- [x] Add or complete refresh rotation, revocation, and replay handling if approved.
- [x] Update frontend auth types and adapters to match approved wire contracts.
- [x] Implement credential transport without unsafe persistence or silent mock fallback.
- [x] Implement active-school selection; no shared client-side data cache exists to invalidate on selection.
- [x] Keep password reset unavailable in API mode; do not silently fall back to mock behavior.
- [x] Add backend tests for invalid credentials, token expiry/revocation, permissions, and membership rejection.
- [x] Add frontend tests for session states, school/workspace selection, protected requests, and logout failures.
- [x] Run an integration test against the backend using the frontend adapter or an equivalent HTTP contract flow.
- [x] Update the contract baseline and auth spec with implementation evidence.

Phase 2 scope decision: the user approved proceeding with core auth/session/school implementation while deferring password reset. Reset remains a separate gated feature; do not implement or present it as available in API mode.

Phase 2 implementation evidence (2026-11-12): Backend unit tests passed (22 tests / 6 suites), TypeScript typecheck, production build, and Prisma schema validation passed. Frontend lint, TypeScript check, production build, and auth tests passed (12 tests across 2 suites). The two migrations were applied to the empty local Compose database and the synthetic demo account was seeded. A live HTTP contract flow passed login/cookie checks, session restore, membership listing, CSRF rejection, school selection, protected school read, refresh rotation/context preservation, replay rejection/family revocation, and logout/cookie clearing/access invalidation. Generated Swagger contains all six auth routes and documents HTTP 200 for school selection. Backend ESLint remains blocked by the baseline missing ESLint 9 configuration. Platform-only login remains unavailable because the current schema has no approved platform-grant model; the backend fails closed for users without an active school membership. Password reset remains outside this completed core scope and separately gated on its provider and final contract.

## Phase 3 — Approve and centralize role/workspace policy

**Status:** Complete — policy, workspace composition, and API-mode capability gating implemented and verified  
**Gate:** Policy/workspace tests pass; unsupported or unaligned API features remain hidden until their Phase 4 contracts and adapters are delivered. Backend authorization remains independently authoritative.

- [x] Review the original [frontend User-Type Modular Structure Plan](../../apps/frontend/docs/user-type-modular-structure-plan.md).
- [x] Record conservative data scopes, read/write defaults, and denied states after the user delegated the decision; see [access/workspace spec](./03-access-and-workspace-spec.md).
- [x] Preserve current route/navigation behavior in mock mode; API mode intentionally hides unintegrated capabilities until their contracts and adapters are ready.
- [x] Add a pure centralized frontend access policy and route decisions for the approved UX baseline, including explicit data-scope metadata.
- [x] Update the dashboard shell, home resolver, and dashboard route helper to use that policy.
- [x] Add tests for all seven roles, nested routes, settings, aliases, and unknown roles.
- [x] Extract a workspace-home entry module while keeping role dashboards and domain features shared; role-specific composition is selected in one closed role switch.
- [x] Filter API-mode navigation/routes using backend-returned permission keys and adapter readiness; hide unsupported capabilities, student write screens with unaligned DTOs, and demo-only notifications/counts. This is presentation-only; backend enforcement remains authoritative.
- [x] Verify direct-route UX does not imply or replace backend authorization; see the access-policy spec.

Phase 3 implementation evidence (2026-11-12): 54 frontend tests, lint, TypeScript check, and production build passed; tests cover all seven role policies/compositions, API permission and adapter-readiness filtering, read-vs-write route checks, and suppression of mock dashboard data in API mode. API-mode data capabilities whose adapters are not aligned remain hidden. Backend role grants and object-scope enforcement are not claimed complete.

## Phase 4 — Deliver core school-data API slices

**Status:** Complete — school profile, academic structure reads/year creation, student, and attendance slices implemented and verified  
**Rule:** Approve a feature spec and contract before implementing each slice.

### 4.1 School profile and academic structure

- [x] Scope the slice to school profile read/update, academic-year list/create, and read-only class/section listing; defer class/section writes.
- [x] Align frontend models/adapters and API-mode screens with school-profile and academic-year responses.
- [x] Align the class frontend adapter and response mapping with `GET /api/v1/classes`; enable the capability only after the real class view is connected.
- [x] Add frontend adapter tests for class, school profile, academic-year, and attendance routes and request shapes.
- [x] Verify backend route permissions and tenant-scoped school/academic behavior with backend tests.
- [x] Show only API-provided class/section fields; omit unsupported teacher, enrollment, and schedule values.

### 4.2 Students

- [x] Scope this slice to paginated list, detail, and create; create requires an academic year/class/active section and supports up to five optional guardians.
- [x] Align frontend list/detail/create adapters and response mapping to `/students` before exposing student reads in API mode.
- [x] Align the create form to backend DTO fields and IDs, loading academic years and classes from their read endpoints; route access requires both `students.create` and `academic_structure.read`.
- [x] Defer update (no backend endpoint), archive, server-side search, and documents; hide unsupported edit UI in API mode.
- [x] Add frontend adapter and form tests for pagination, student mapping, guardian detail, and create request shape.
- [x] Add/run backend service tests for school-scoped student reads and same-school academic references.
- [x] Verify controller read/create permission guards and request DTO validation in dedicated tests.

### 4.3 Attendance

- [x] Approve the session workflow and school-timezone date semantics; defer post-mark corrections and correction audit UX.
- [x] Align attendance frontend adapter and response mapping to backend routes/DTOs before exposing this capability in API mode.
- [x] Align UI to session-based backend operations; do not invent aggregate attendance rows.
- [x] Implement list/create/mark/close flow and explicit conflict/error states, with existing records read-only.
- [x] Test route permissions and cross-school session/student identifiers.

## Phase 5 — Prioritize and implement remaining capabilities

**Status:** Not started; individual features require approved specs  
**Reference:** [Backend capability backlog](./05-backend-capability-backlog.md)

- [ ] Product confirms release scope and priority for staff/teacher assignment.
- [ ] Product confirms dashboard aggregates and role-specific data requirements.
- [ ] Product confirms reports and academic assignment/submission workflows.
- [ ] Product confirms parent/student linked-record and object-access requirements.
- [ ] Product confirms announcements and notifications.
- [ ] Approve finance workflows before implementing fees/payments.
- [ ] Approve storage/provider and document-access lifecycle before implementing files.
- [ ] For each approved capability, implement one tested vertical slice and update specs/contracts.

## Phase 6 — Security hardening, staging, and release

**Status:** Not started  
**Gate:** [Verification and release criteria](./06-verification-and-release.md) have evidence and owners.

- [ ] Implement and verify RLS policies for all tenant-owned data.
- [ ] Use a least-privilege runtime database role without owner or `BYPASSRLS` privileges.
- [ ] Pass two-school cross-tenant read/write/reference tests.
- [ ] Pass pooled-connection tenant-context leak tests.
- [ ] Verify endpoint permission and object-level authorization coverage.
- [ ] Complete dependency, configuration, secret, logging, CORS, and TLS review.
- [ ] Run full frontend/backend checks and staging end-to-end smoke tests.
- [ ] Complete synthetic-data UAT, backup/restore and rollback rehearsal, and operational handoff.
- [ ] Record release evidence, known limitations, and explicit go/no-go approval.

## Progress log

| Date | Checklist item | Evidence / result | Owner |
|---|---|---|---|
| 2026-11-12 | 0.1 — Worktree state | Frontend `main`: modified `AGENTS.md`; backend `main`: untracked `AGENTS.md`; Briznova website worktree clean. Existing changes preserved. | Copilot |
| 2026-11-12 | 0.1 — Toolchain | Both repos use npm (`package-lock.json`, lockfile v3); both READMEs say `npm install`. Current environment: Node 24.20.0, npm 11.19.0. Backend declares Node >=20 and README requires npm 10+; frontend does not pin Node/npm. `npm.cmd` works in PowerShell; `npm` is blocked by local script execution policy. No dependencies installed. | Copilot |
| 2026-11-12 | 0.1 — Environment/dependencies | Backend env template names include `DATABASE_URL`, `DIRECT_URL`, auth secrets, API/CORS/runtime settings, and storage settings; no secret values copied. Backend README requires PostgreSQL 16 via Docker Compose. Docker is installed; neither repo has `node_modules`; no `.env`/`.env.local` files exist. Frontend README references `.env.example`, but that file is absent. Backend Compose publishes PostgreSQL on host port 5433 while the env template DB URLs specify localhost:5432; resolve in the ports/config task before starting DB. Docker/services were not started. | Copilot |
| 2026-11-12 | 4.2 — Student list/detail/create | Frontend adapter/form tests (student list pagination, detail guardian mapping, create body, academic-year endpoint), 61 frontend tests, lint, type-check, and production build passed. Backend student service tests passed (8 tests), including cross-school reads and rejected cross-school/missing academic-year, class, and section references. Controller permission-guard/DTO validation tests remain open. No live API/database integration was run. | Copilot |
| 2026-11-12 | Phase 4 — School profile, academic years, and attendance | Added active-school profile read/update, academic-year list/create, timezone-derived attendance dates, session list/create/roster/mark/close, and a tenant-scoped roster endpoint. Existing attendance records are immutable through the mark route; correction workflow remains deferred. Frontend adapter coverage and backend tenant/permission/DTO tests added. Frontend: 64 tests, lint, TypeScript, and production build passed. Backend: 38 tests, typecheck, and build passed. No live API/database integration was run. | Copilot |

## Blockers / decisions needed

| Blocker | Related item/spec | Owner | Resolution |
|---|---|---|---|
| | | | |
