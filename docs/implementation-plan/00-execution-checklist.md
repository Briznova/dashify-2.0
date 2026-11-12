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

- [x] Scope the Phase 4 baseline to school profile read/update, academic-year list/create, and read-only class/section listing; class/section writes were deferred and later delivered as a Phase 5 slice.
- [x] Align frontend models/adapters and API-mode screens with school-profile and academic-year responses.
- [x] Align the class frontend adapter and response mapping with `GET /api/v1/classes`; enable the capability only after the real class view is connected.
- [x] Add frontend adapter tests for class, school profile, academic-year, and attendance routes and request shapes.
- [x] Verify backend route permissions and tenant-scoped school/academic behavior with backend tests.
- [x] Show only API-provided class/section fields; omit unsupported teacher, enrollment, and schedule values.

### 4.2 Students

- [x] Scope this slice to paginated list, detail, and create; create requires an academic year/class/active section and supports up to five optional guardians.
- [x] Align frontend list/detail/create adapters and response mapping to `/students` before exposing student reads in API mode.
- [x] Align the create form to backend DTO fields and IDs, loading academic years and classes from their read endpoints; route access requires both `students.create` and `academic_structure.read`.
- [x] Defer update, archive, server-side search, and documents at the Phase 4 baseline; student editing / guardian lifecycle was later delivered as a separate Phase 5 slice.
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

**Status:** In progress — delivered staff/teacher assignment, student editing, class/section creation, School Admin/Principal/Teacher dashboards, attendance reporting, announcements, and the read-only platform directory; other Phase 5 areas still require feature-level decisions
**Reference:** [Backend capability backlog](./05-backend-capability-backlog.md)

- [x] Product approves all twelve remaining Phase 5 areas for prioritization (2026-11-13); this does not approve unresolved feature behavior, API contracts, permissions, or implementation details.
- [x] Resolve the first staff-account slice using existing user accounts only; grant Teacher role only, defer invitations/credentials and other role grants, and preserve the global account on deactivation.
- [x] Implement active-school staff profile create/update/deactivate, existing-account Teacher linkage, assignment cleanup, and audit events.
- [x] Update staff OpenAPI, implementation-plan baseline, and frontend staff management UI; verify school scoping and role behavior with focused tests.
- [x] Product confirms release scope and priority for staff/teacher assignment.
- [x] Implement the approved staff/teacher-assignment vertical slice across backend, permissions, and API-mode frontend integration.
- [x] Approve and implement student editing / guardian lifecycle as a separate school-scoped slice.
- [x] Approve and implement class/section creation; defer edits, deactivation, and deletion.
- [x] Product approves the school-administrator dashboard count slice; other role-specific data requirements remain open.
- [x] Implement the approved school-administrator current-count dashboard slice across backend and API-mode frontend.
- [x] Select the Principal daily attendance snapshot as the first additional role dashboard slice; keep other role dashboards gated.
- [x] Implement the tenant-scoped Principal attendance snapshot, separate permission, API-mode KPI cards, and contract/spec updates; do not assign the Principal role to existing users.
- [x] Select a read-only Teacher dashboard limited to active assigned classes/sections, local-day session status, and aggregate unmarked counts; require an authenticated Teacher role and a unique active staff-profile link.
- [x] Implement the Teacher dashboard endpoint, separate permission, role/assignment-scope tests, API-mode UI, and contract/spec updates; do not assign the Teacher role to existing users.
- [x] Product approves the first school-admin attendance-report slice.
- [x] Implement the read-only date-range attendance report for closed sessions; defer other report types.
- [x] Product approves CSV download of the aggregate attendance report only; no server-side export retention.
- [x] Implement client-generated CSV download from the currently displayed aggregate report.
- [x] User delegates a pragmatic next report scope; select a per-day breakdown in the existing closed-session school-admin report with no entity-level detail.
- [x] Implement per-day attendance aggregates that reconcile with report totals and include them in the CSV.
- [x] Implement the conservative school-wide in-app announcement slice: School Admin draft/publish, active-school published list for School Admin/Principal/Teacher, permission grants, audit events, and API-mode UI; defer read receipts, audience targeting, and outbound delivery.
- [x] Implement a dedicated platform grant and platform-only session; do not infer platform authority from school roles or issue platform sessions to accounts with active school memberships.
- [x] Add the audited, read-only platform school directory with only approved school metadata; deny school switching, membership listing, and school-record access from platform sessions.
- [x] Connect Super Admin API-mode navigation and directory UI to `platform.schools.read`; retain server authorization as authoritative.
- [ ] Decide MFA/recovery and production platform-grant provisioning, revocation, and break-glass controls before production use.
- [ ] Product confirms other report types, PDF export, and any server-side export retention.
- [ ] Product confirms academic assignment/submission workflows.
- [ ] Product confirms parent/student linked-record and object-access requirements.
- [ ] Product confirms broader notification delivery, read receipts, and announcement audience targeting.
- [ ] Approve finance workflows before implementing fees/payments.
- [ ] Approve storage/provider and document-access lifecycle before implementing files.
- [ ] For each approved capability, implement one tested vertical slice and update specs/contracts.

Phase 5 implementation evidence (2026-11-12): Class and section creation uses the active-school context, `academic_structure.manage`, duplicate-code conflict handling, and audit events. Frontend: 16 focused tests, TypeScript, targeted ESLint, and production build passed. Backend: 12 focused tests, typecheck, and build passed. No live API/database integration was run.

Phase 5 dashboard scope decision: school-administrator counts and the Principal daily snapshot were implemented first. The user then asked to proceed and delegated a pragmatic choice when unavailable to answer the scope question. The selected Teacher slice is read-only and limited to active assignments resolved from the authenticated user and active school, with school-local attendance-session status and unmarked counts only when a session exists. It uses a separate `dashboard.teacher.read` permission and does not assign Teacher roles to existing memberships. Parent/student linked-record dashboards, trends, finance, and caching remain gated. The later Super Admin request was implemented as a minimum-privilege read-only school directory; it does not include school lifecycle management, impersonation, or cross-school records.

Phase 5 report scope decision: the user approved an aggregate school-admin attendance report for closed sessions over an inclusive date range, then delegated a pragmatic next report addition. The added per-day aggregates expose no entity identifiers and reconcile to the summary; CSV is generated client-side and not stored by Dashify. Other report types, PDF export, server-side retention, and academic assignment/submission workflows remain open.

Phase 5 staff-account implementation evidence (2026-11-13): School Admin can create/update/deactivate active-school staff profiles and link an existing account by email to the Teacher role. No production user credentials or invitations are created. The optional local synthetic seed provisions a dedicated demo Teacher login and linked staff profile for development preview only. Deactivation disables active teacher assignments, removes only the Teacher role, and revokes the school membership only when no other roles remain. Backend focused service tests, typecheck, and Prisma validation passed; frontend adapter/UI tests, typecheck, and targeted ESLint passed. The added unique profile-link migration has not yet been applied to the local database.

Phase 5 announcement scope decision (2026-11-13): Implemented a conservative in-app, school-wide first slice. School Admin can create drafts and publish; School Admin, Principal, and Teacher can read published announcements for their authenticated active school. Audience targeting, read receipts, attachments, parent/student access, email, and SMS remain deferred. The exact permission mapping and endpoints are in [announcements API contract](../api-contracts/announcements.openapi.yaml).

Phase 5 platform administration scope decision: The request for a Super Admin with proper access is implemented conservatively as a dedicated platform-only identity and read-only school directory. Platform authority is a separate `PlatformAdminGrant`, never a school role; the platform session receives only `platform.schools.read`, cannot list/select school memberships, and is revalidated on login, refresh, session restore, and guarded requests. The school-admin staff slice continues to support active-school staff profile management and existing-account Teacher linkage only. No platform user was created because no dedicated credentials were provided; local bootstrap is optional via `SEED_PLATFORM_ADMIN_EMAIL` and `SEED_PLATFORM_ADMIN_PASSWORD`. MFA/recovery and production grant lifecycle are open.

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
| 2026-11-12 | 5.0 — Staff/teacher assignment approval | Product approved the Phase 5 staff/teacher-assignment slice. Backend staff schema, permission keys, and list/create/assignment endpoints were added and route-validation coverage was recorded. | Copilot |
| 2026-11-12 | Phase 4 — School profile, academic years, and attendance | Added active-school profile read/update, academic-year list/create, timezone-derived attendance dates, session list/create/roster/mark/close, and a tenant-scoped roster endpoint. Existing attendance records are immutable through the mark route; correction workflow remains deferred. Frontend adapter coverage and backend tenant/permission/DTO tests added. Frontend: 64 tests, lint, TypeScript, and production build passed. Backend: 38 tests, typecheck, and build passed. No live API/database integration was run. | Copilot |
| 2026-11-12 | Phase 5 — School administrator dashboard | Added tenant-scoped active counts with `dashboard.read`, the API-mode KPI adapter/rendering, and the dashboard contract. Backend: 4 focused tests, typecheck, and build passed; frontend: 18 focused tests, targeted ESLint, TypeScript, and production build passed. No live API/database integration was run. | Copilot |
| 2026-11-12 | Phase 5 — Dashboard permission rollout | Confirmed the local database was missing `dashboard.read` and its `SCHOOL_ADMIN` role grant. Added and applied an idempotent migration; verified the permission and grant in the local database. Dashboard authorization and JWT permission tests: 4 passed. | Copilot |
| 2026-11-12 | Phase 5 — Principal attendance dashboard | Added `GET /api/v1/dashboard/principal` with school-local date semantics, active enrolled session-roster aggregates, and the separate `dashboard.principal.read` permission. Backend focused tests (8), typecheck, and build passed; frontend focused tests (30), TypeScript/build, targeted lint, and `git diff --check` passed. Applied the migration to the confirmed local `dashify` database and verified one Principal role, its permission grant, and zero memberships assigned to it; Prisma reports all six migrations applied. | Copilot |
| 2026-11-12 | Phase 5 — Teacher assigned-class dashboard | Added `GET /api/v1/dashboard/teacher`, requiring the Teacher workspace role, `dashboard.teacher.read`, and exactly one active staff profile linked to the authenticated user in the active school. It returns active assigned class/section attendance-session status and aggregate unmarked counts for the school-local date, with null counts when no session exists and no student identifiers. Backend: all 69 unit tests, typecheck, build, and Prisma validation passed. Frontend: all 97 tests, typecheck, targeted ESLint, and production build passed; repository-wide lint still reports an unrelated existing error in `student-record.tsx`. Applied the additive migration to the confirmed local `dashify` database and verified one Teacher role/grant and zero memberships assigned to it. No live API request with a linked Teacher fixture was run. | Copilot |
| 2026-11-12 | Phase 5 — School attendance report | Added the tenant-scoped closed-session attendance aggregate endpoint and API-mode date-range report UI. Backend: 10 focused tests including attendance regression, typecheck, build, and report-file formatting passed; frontend: 57 focused tests, targeted ESLint, typecheck, and production build passed. No live API/database integration was run. | Copilot |
| 2026-11-12 | Phase 5 — Attendance CSV export | Added an on-demand frontend CSV download of the aggregate report; no server-generated file or retained export. Frontend: 7 focused tests, targeted ESLint, TypeScript check, production build, and `git diff --check` passed. No live API/database integration was run. | Copilot |
| 2026-11-12 | Phase 5 — Daily attendance breakdown | Added chronological per-day counts within the same tenant-scoped closed-session report; CSV includes the daily rows. Backend: 6 focused tests, typecheck, build, Prettier check, and read-only SQL smoke test passed; frontend: 10 focused tests, targeted ESLint, typecheck, and production build passed. No schema migration was needed. | Copilot |

## Blockers / decisions needed

| Blocker | Related item/spec | Owner | Resolution |
|---|---|---|---|
| | | | |
