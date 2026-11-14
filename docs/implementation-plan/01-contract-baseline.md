# Frontend/Backend Contract Baseline

**Status:** Observed baseline; not an approved target contract  
**Last reviewed:** 2026-11-12 (live local validation)

## Current architecture snapshot

### Frontend

- Next.js App Router, TypeScript, CSS Modules.
- `src/services/auth-service.ts` and `school-service.ts` define UI-facing service contracts.
- `src/services/http/` contains HTTP adapters; `src/services/mock/` contains browser mock implementations.
- `src/services/index.ts` selects API mode using `NEXT_PUBLIC_DASHIFY_API_MODE === "api"`.
- `src/services/api-client.ts` sends `credentials: "include"` but does not attach a bearer access token.
- `src/types/auth.ts` models one `UserRole` and an optional `schoolName`; it does not model memberships, active school ID, or permissions.
- HTTP service paths are relative to the configured base URL; the documented backend prefix is not included in the adapter paths.

### Backend

- NestJS REST API; `src/main.ts` applies `API_PREFIX` defaulting to `api/v1`.
- Controllers observed for auth, schools, academic structure, students, attendance, and audit logs.
- JWT authentication reads an `Authorization: Bearer ...` header.
- School-scoped APIs require an active school ID and permission keys from the token.
- Prisma schema includes memberships, roles, permissions, refresh tokens, password-reset tokens, and multiple planned domains.
- `docs/implementation-plan.md` labels RLS, refresh rotation, password-reset delivery, finance, dashboard/comms, and other work incomplete or blocked.

## Verified local runtime and baseline checks

### Configuration and environment

- Frontend Next.js dev server defaults to port `3000`; backend defaults to port `3000` as well. The frontend README's API example uses backend port `3001`.
- Backend `API_PREFIX` defaults to `api/v1`; frontend adapter paths omit that prefix. Including the prefix in the API base URL still leaves endpoint and method mismatches.
- Backend CORS defaults to `http://localhost:5173`, while this Next.js frontend defaults to `http://localhost:3000`.
- Backend Docker Compose maps PostgreSQL host port `5433` to container port `5432`; backend `.env.example` database URLs use host port `5432`.
- Frontend README instructs copying `.env.example`, but the frontend repo has no `.env.example`. The actual mode switch is `NEXT_PUBLIC_DASHIFY_API_MODE=api`; absent/other values select the mock adapter. The API base URL variable is `NEXT_PUBLIC_DASHIFY_API_BASE_URL`.
- A temporary local verification used backend port `3001`, CORS origin `http://localhost:3000`, and database port `5433`; no `.env` files or secrets were created. These overrides prove the processes can run together but do not fix committed defaults/documentation.
- Backend `.env.example` defines database, token-secret, token TTL, API prefix, app URL, CORS origin, logging, and storage settings. Secret values were not copied into this plan.
- Docker Compose created the local `dashify-backend_dashify_pgdata` volume for checks. The container was stopped; the volume was deliberately retained.

### Baseline results

| Repository | Check | Result |
|---|---|---|
| Frontend | `npm ci --no-audit --no-fund` | Passed |
| Frontend | `npm run lint` | Passed |
| Frontend | `npm run build` | Passed; Next.js generated routes |
| Frontend | `npm run dev -- --port 3100`, GET `/` and `/auth/sign-in` | Passed; root redirects to sign-in; sign-in responds 200 with API mode unset (mock default) |
| Backend | `npm ci --no-audit --no-fund` | Passed |
| Backend | `npm run prisma:generate` | Passed |
| Backend | `npm run lint` | **Blocked:** ESLint 9.39.5 cannot find `eslint.config.*`; no ESLint config file is present |
| Backend | `npm run typecheck` | Passed |
| Backend | `npm test -- --runInBand` | Passed; 2 suites, 7 tests |
| Backend | `npm run build` | Passed |
| Backend | `npm run format:check` | **Failed baseline:** Prettier reports 42 source/test files need formatting; no files were changed |
| Backend | `npm run test:e2e -- --runInBand` with local PostgreSQL | Passed; 1 health E2E test |
| Backend | `/api/v1/health/ready` | Passed; returned `{"status":"ready"}` |
| Backend | `/docs-json` | Passed; returned OpenAPI 3.0.0, title `DASHIFY API`, version `1.0.0` |

Install-session correction: the first `npm ci` attempt ran from the unrelated Briznova website working directory and failed with `EPERM` while attempting to clean its existing `node_modules`. A follow-up check found 16 declared direct dependencies missing from that directory. They were restored with `bun install --frozen-lockfile`; all 73 declared direct dependencies are present now, and the website Git worktree remains clean. Both Dashify installs were then run with explicit repository working directories. No tracked dependency manifests or lockfiles changed.

### Observed role/workspace behavior

| Frontend role | Home path | Current sidebar baseline |
|---|---|---|
| Super Admin | `/dashboard` | Overview, Schools, Students, Staff, Classes, Attendance, Fees, Academics, Analytics, Reports |
| School Admin | `/dashboard` | Same as Super Admin except Schools |
| Principal | `/dashboard` | Same as School Admin |
| Teacher | `/dashboard/teacher` | Home, Attendance, Results, Assignments / Exam, School notices |
| Accountant | `/dashboard/accountant` | Overview, Finance overview, Fees, Reports |
| Parent | `/dashboard/parent` | Overview, My child |
| Student | `/dashboard/student` | Overview, My learning, Academics |

Settings is currently allowed to Super Admin, School Admin, and Principal. The Teacher workspace now uses the same feature pages in mock and API modes; other unsupported portal roles remain gated. This table records UI behavior only, not authorization truth.

### Live OpenAPI route inventory

OpenAPI was retrieved from the running local backend's `/docs-json` endpoint. The document had 19 path entries:

| Method(s) | Path |
|---|---|
| GET | `/api/v1/health/live`, `/api/v1/health/ready` |
| POST | `/api/v1/auth/login`, `/api/v1/auth/logout`, `/api/v1/auth/active-school` |
| GET | `/api/v1/auth/me`, `/api/v1/auth/schools` |
| GET, PATCH | `/api/v1/schools/current` |
| GET, POST | `/api/v1/academic-years`, `/api/v1/classes` |
| POST | `/api/v1/sections` |
| GET, POST | `/api/v1/students` |
| GET | `/api/v1/students/{id}` |
| POST | `/api/v1/students/{id}/archive` |
| GET, POST | `/api/v1/attendance/sessions` |
| PUT | `/api/v1/attendance/sessions/{id}/records` |
| POST | `/api/v1/attendance/sessions/{id}/close` |
| GET | `/api/v1/audit-logs` |

The inventory above is the live OpenAPI snapshot taken before the Phase 4 attendance roster and Phase 5 dashboard/report additions. Current backend controllers also expose `GET /api/v1/attendance/sessions/{id}/roster`, `GET /api/v1/dashboard`, `GET /api/v1/dashboard/principal`, `GET /api/v1/dashboard/teacher`, and `GET /api/v1/reports/attendance`. The current Teacher workspace routes are documented in the [Teacher workspace contract](../api-contracts/teacher-workspace.openapi.yaml): academic years and assigned sections; date-scoped attendance read/draft/submit; assessment list/create/publish; and result read/save/publish. School Admin grade scales are documented in the [academic structure contract](../api-contracts/academic-structure.openapi.yaml), explicit class-teacher designation in the [staff contract](../api-contracts/staff.openapi.yaml), and authenticated-user notifications in the [notifications contract](../api-contracts/notifications.openapi.yaml). Parent APIs, student submissions, and family visibility remain deferred.

## Endpoint comparison

| Capability | Frontend expectation | Backend observed | Status / next action |
|---|---|---|---|
| API prefix | Frontend base URL documentation describes backend URL; adapters call paths such as `/auth/sign-in` | Global prefix defaults to `/api/v1` | **Mismatch.** Define one base URL convention and test it. |
| Login | `POST /auth/sign-in` with `SignInInput` including `rememberMe`; expects `AuthSession` | `POST /api/v1/auth/login`; `LoginDto` requires email/password (minimum 10 chars); returns access + refresh tokens and a partial user | **Mismatch.** Current frontend body includes `rememberMe`, which the backend global validation pipe rejects as non-whitelisted. Agree request/response and remember-me semantics. |
| Session restore | `GET /auth/session`, expects `AuthSession | null` | `GET /api/v1/auth/me`, requires Bearer access token, returns a partial user profile | **Mismatch.** Define token renewal and session shape. |
| Logout | `POST /auth/sign-out`, no body | `POST /api/v1/auth/logout`, expects refresh token in body | **Mismatch.** Align revocation and client credential lifecycle. |
| Sign-up | `POST /auth/sign-up` | No signup route found in inspected auth controller | **Not implemented / confirm scope.** |
| Password reset | `/auth/password-reset/request` and `/confirm` | No password-reset routes found; schema has token model | **Not implemented.** Delivery, enumeration behavior, expiry, and one-time use need a spec. |
| Authenticated password change | Account popup posts current and new passwords to `/auth/change-password` in API mode. | `POST /api/v1/auth/change-password` requires an active session and the current password, enforces 12–1024 characters for the new password, and revokes other sessions. | **Aligned.** Cookie requests require Origin/CSRF; incorrect current passwords return 400. Preview mode explicitly does not change passwords. Email recovery remains separate and unavailable. |
| Membership selection | API-mode frontend models memberships and sends school/workspace selection | `GET /api/v1/auth/schools`; `POST /api/v1/auth/active-school` returns a school-scoped cookie session | **Aligned for school accounts.** Platform-only sessions receive no memberships and both routes deny school selection/listing. |
| Platform Super Admin | Directory and selected-school detail use `GET /api/v1/platform/schools` and `GET /api/v1/platform/schools/{id}` with `platform.schools.read`; creation uses the same collection's POST with explicit `platform.schools.create`. A separately granted administrator creation route is documented in the platform school contract. | Dedicated `PlatformAdminGrant`; optional access comes from explicit unrevoked grants. Platform requests cannot select a school or access school records. | **Aligned for directory, detail and school creation.** Shared-password administrator accounts are not invitation delivery and do not enforce a password change. School Admin confirmation records `COMPLETED`; see [school onboarding contract](../api-contracts/school-onboarding.openapi.yaml). Invitations, MFA/recovery and grant lifecycle remain open; see [platform school contract](../api-contracts/platform-schools.openapi.yaml). |
| Platform audit | API-mode audit reads `GET /api/v1/platform/audit-events` only with `platform.audit.read` | Platform-only guard and explicit unrevoked audit grant; whitelisted platform-origin events and safe fields only | **Aligned for redacted platform audit reads.** Each read is audited; tenant events, failure-event collection, export and retention enforcement remain excluded. See [platform audit contract](../api-contracts/platform-audit.openapi.yaml). |
| Platform settings | API-mode settings reads `GET /api/v1/platform/settings` with `platform.settings.read` | Platform-only guard and explicit unrevoked settings grant; token lifetime values use the same configuration as authentication | **Aligned for read-only token lifetimes.** Each read is audited; changing settings and other security controls remain unavailable. See [platform settings contract](../api-contracts/platform-settings.openapi.yaml). |
| Platform support | API-mode queue and detail use `GET/POST /api/v1/platform/support-tickets` and ticket detail/actions; the overview uses `GET /api/v1/platform/support-tickets/summary` | Platform scope, explicit support read/update grants, versioned actions, transactional history and redacted audit; summary counts OPEN and IN_PROGRESS with read permission | **Aligned for internal tickets.** Resolution/reopen, priority and self-claim are supported; cleanup runs while the backend is active. School-facing tickets, attachments and notifications remain deferred. See [platform support contract](../api-contracts/platform-support.openapi.yaml). |
| Dashboard overview | API mode calls `GET /api/v1/dashboard` for School Admin counts, `GET /api/v1/dashboard/principal` for the Principal attendance snapshot, and `GET /api/v1/dashboard/teacher` for assignment-scoped Teacher data | School Admin requires `dashboard.read`; Principal requires `dashboard.principal.read`; Teacher requires the Teacher workspace role and `dashboard.teacher.read`. All derive school from authenticated active-school context. Principal and Teacher use the school's local date and return aggregate counts only; Teacher assignment scope comes from exactly one active staff profile linked to the authenticated user. | **Aligned for School Admin, Principal, and Teacher dashboard slices.** Teacher data includes active enrollment counts and the active academic year label when available; no student identifiers or unsupported class-teacher designation is returned. Principal and Teacher role grants do not assign those roles to any membership. Other role dashboards, trends, and finance aggregates remain unimplemented; see [dashboard contract](../api-contracts/dashboard.openapi.yaml). |
| Teacher workspace | API mode uses the Teacher dashboard, assigned sections, current-day attendance draft/submit, assignment/exam/test publish lifecycle, numeric results with partial publication, and notifications for published school-wide announcements | Standard Teacher role grants dashboard, announcement, and `teacher.*` permissions; active-school context, exactly one active staff profile, current active assignment checks, school-local write dates, date-scoped enrolments, and transactional writes/audits | **Aligned for the approved Teacher slice.** Historical attendance is read-only; active-year assessments/results remain Teacher-owned. School Admins configure academic-year grade scales and explicit class-teacher designations. Publishing a school-wide announcement creates an in-app notification for each active Teacher account; notification reads/updates are user- and school-scoped. Parent APIs, student submissions, attachments, and family visibility remain excluded; see the [Teacher workspace contract](../api-contracts/teacher-workspace.openapi.yaml), [academic structure contract](../api-contracts/academic-structure.openapi.yaml), [staff contract](../api-contracts/staff.openapi.yaml), and [approved spec](./10-teacher-workspace-spec.md). |
| Students list | API-mode directory uses `POST /api/v1/students/search` for school-wide search, filters and pagination; the existing `GET /api/v1/students` remains available | `{ data, meta }`; matching active enrolments include academic year, section, and class | **Directory slice aligned.** See [student directory contract](../api-contracts/student-directory.openapi.yaml). List payload does not include guardians or attendance; structure selectors require `academic_structure.read`. |
| Student detail | `GET /api/v1/students/:id` backs the read-only profile and maps guardian records; placement is displayed only when exactly one returned enrolment has `isActive=true` | School-scoped student with guardians and enrolments, including history | **Read aligned.** Active placement is a stored flag, not an effective-date policy. Attendance, fees, academic records, and documents are labelled unavailable in API mode. |
| Student create | `POST /api/v1/students` accepts the new admission contract and generates the ID server-side; the API-mode form collects required identity, guardians, emergency contact and initial placement | School-scoped transactional create enforces ID uniqueness, roll uniqueness and section capacity; School Admins configure the prefix separately | **Create aligned after coordinated migration/deployment.** This replaces the earlier manual-ID contract; see [student admission contract](../api-contracts/student-admission.openapi.yaml). |
| Student update | API-mode edit UI is hidden and no update request is sent | No update endpoint found | **Deferred/not implemented.** |
| Student archive | No API-mode archive action | `POST /api/v1/students/:id/archive` | **Deferred.** Archive workflow and permission/UI behavior have not been approved. |
| Staff | School Admin Staff UI creates a new Teacher login or links an existing account, and manages departments, assignments, and explicit class-teacher designation | `POST /api/v1/staff/teacher-accounts` requires active School Admin workspace and `staff.manage`; `/staff` can link an existing account; `/departments` uses School Admin workspace and `staff.read`/`school.update`; `/teacher-assignments` requires `staff.read`/`staff.manage` | **Aligned for Teacher onboarding, assignment, and class-teacher designation.** New and linked Teacher accounts receive the standard dashboard, announcement, and `teacher.*` role grants; the migration backfills existing standard Teacher roles. Class data still requires an active assignment. A designation requires a specific section and is unique per active section. Teacher invitations and other staff roles remain deferred. See [staff contract](../api-contracts/staff.openapi.yaml). |
| Classes and sections | Directory uses `GET /api/v1/classes` and `POST /api/v1/classes/with-section`. Class details use the same read, `POST /api/v1/sections`, `PUT /api/v1/classes/:id` and `PUT /api/v1/classes/:classId/sections/:sectionId`. | Authenticated active-school scope; writes require `academic_structure.manage`. Combined creation and audits are transactional; section capacity edits serialize with admissions and enforce per-year occupancy. | **Read, creation, and editing aligned.** Teacher assignments can be class- or section-scoped; the class-teacher designation is section-specific. See the [academic structure](../api-contracts/academic-structure.openapi.yaml) and [staff](../api-contracts/staff.openapi.yaml) contracts. |
| Academic years and grade scales | School Admins create draft years, activate an eligible draft, and complete an active year; Teacher pages list and select years; School Admins read and replace a grading scale per year | Lifecycle routes require `academic_structure.manage`, run in the authenticated active-school tenant, serialize transitions per school, and compare dates in the school's timezone; grade-scale routes use `academic_structure.read` and `academic_structure.manage` | **Aligned.** Only one year can be active; activation requires the school-local date to be within the inclusive range, and completing the active year is allowed only after its end date. Completed years are terminal/read-only. A usable grade scale covers 0-100 without gaps or overlaps; see [academic structure contract](../api-contracts/academic-structure.openapi.yaml). |
| School directory | Platform API mode uses `GET /api/v1/platform/schools` and maps only ID/name/code/status/creation time; `GET /api/v1/platform/schools/onboarding-summary` returns recorded-state counts and unknown count | Requires active platform grant and `platform.schools.read`; directory reads are audited | **Aligned for directory and onboarding summaries.** It does not expose school records or lifecycle controls. |
| School settings | `GET /schools/current`, `PATCH /schools/current` with name, email, phone, timezone, and locale | Same active-school profile routes; API mode maps these fields directly and gates edits on `school.update` | **Aligned.** The mock-only notification and school-type fields are not sent to the backend. |
| Attendance | School-level session workflow plus a separate Teacher assigned-section current-day register | School-level `GET/POST /attendance/sessions`, roster, record and close routes; Teacher `GET /teacher/attendance`, `PUT /teacher/attendance/draft`, and `POST /teacher/attendance/submit` | **Aligned.** Teacher registers are partial, support remarks, and may be submitted with unmarked students. Only the owner can edit the current day's draft or submitted register; historical and future dates are read-only. No family-read route is available. |
| Reports | API mode calls `GET /api/v1/reports/attendance?fromDate=&toDate=` for aggregate and chronological per-day counts and can generate a CSV download from that response | `GET /api/v1/reports/attendance` requires `reports.read`, derives the active school from the authenticated session, and aggregates only closed sessions | **Aligned for the approved school-admin attendance summary, daily breakdown, and client-generated CSV slices.** Other report types, PDF export, server-side retention, and student-level detail remain out of scope; see [attendance report contract](../api-contracts/attendance-report.openapi.yaml). |
| Announcements and notifications | API mode lists published active-school notices; publishing creates in-app notifications for active Teacher accounts; users can list and mark their own notifications read | Published notices use `announcements.read`; management uses `announcements.manage`; notifications derive active school and user from the authenticated session | **Aligned for school-wide in-app notices and user-owned notification status.** Drafts are hidden from readers, audit events omit message content, and parent/student access, email, SMS, and audience targeting remain deferred. See the [announcements](../api-contracts/announcements.openapi.yaml) and [notifications](../api-contracts/notifications.openapi.yaml) contracts. |
| Fees | `GET /school/fees` | No finance controller found; finance phase blocked pending decisions | **Blocked/not implemented.** |
| Assignments and results | Teacher UI lists/creates/publishes assignments, exams, and scheduled tests; saves and partially publishes numeric scores and optional feedback | Teacher assessment/results routes under `/teacher`; tenant, teacher, assignment, enrollment-date, publication-state, active academic-year, and score-range checks | **Aligned for teacher-created assessments and Teacher-only results.** Results remain editable by the owner while the year is active; pass status is calculated from the assessment pass mark and grade labels from the configured year scale. Student submissions, family publication, and attachments remain out of scope; see the [Teacher workspace contract](../api-contracts/teacher-workspace.openapi.yaml). |

## Cross-cutting mismatches and concerns

1. **Auth response/session mismatch:** frontend expects cookie-backed `AuthSession`; backend returns bearer tokens. The selected storage/refresh mechanism is a blocking decision.
2. **No automatic bearer header:** current frontend API client cannot call protected backend endpoints as implemented.
3. **No refresh route observed:** schema stores refresh token hashes, but refresh rotation is explicitly listed as pending.
4. **Role semantics differ:** frontend has seven role strings; backend authorization is based on membership roles and permission keys. Mapping is not established by the current UI session type.
5. **Tenant context is absent from frontend types:** no active school ID or membership context exists; school-scoped APIs require it in the backend token.
6. **DTOs are domain-shaped, not UI-shaped:** examples include student creation and school settings. Avoid pretending the shapes are interchangeable.
7. **Environment examples need reconciliation:** backend and frontend both default to port 3000; backend CORS defaults to 5173; frontend README examples use backend port 3001; Compose database port differs from the backend env template; frontend env example is missing; API base URL must include the prefix if adapter paths remain prefix-relative.
8. **Security readiness is separate from connectivity:** backend docs say RLS policies are absent in the initial migration and production use is blocked pending RLS and isolation tests.

## Contract rules

- Use generated OpenAPI as a verification artifact, not as a substitute for approved product behavior.
- Keep UI view models separate from wire DTOs where the shapes differ.
- Every adapter transformation must be typed, tested, and explicit; do not cast unknown API responses directly to UI types.
- Document status codes and error envelopes, including validation, unauthorized, forbidden, not-found, conflict, and rate-limit responses.
- Prefer additive/versioned API changes; breaking changes require coordinated frontend/backend rollout notes.

## Revalidation checklist

- [x] Re-run controller/route inventory.
- [x] Generate current OpenAPI and diff it against the inspected controllers and frontend adapters.
- [x] Verify `API_PREFIX`, frontend base URL, port, and CORS origins; mismatches are recorded above.
- [x] Confirm observed auth and permission guards for the inventoried protected endpoints.
- [x] Compare service response types with controller and DTO contracts; mismatches are recorded above.
- [ ] Update this table after each approved API change.

## Phase 2 implementation snapshot

**Reviewed:** 2026-11-12  
**Status:** Live database/API integration and generated Swagger verification passed; frontend auth interaction tests remain open. The baseline above is the pre-implementation inventory and should be treated as historical where it conflicts with this snapshot.

### Auth/session contract now implemented

- Backend routes provide login, refresh, logout, current-session lookup, membership listing, and active-school/workspace selection. Login/session responses do not include credentials; the backend sets HttpOnly access/refresh cookies and a readable double-submit CSRF cookie.
- Access JWTs expire after 15 minutes by default. Refresh credentials are random, stored as SHA-256 hashes, rotated on refresh, and revocable by session lineage. Guards consult active session and membership state and derive the union of current school permissions from assigned roles.
- Unsafe cookie-authenticated requests require an allowed Origin and matching CSRF cookie/header. API CORS and default port are aligned to the frontend at `http://localhost:3000` and backend port `3001`.
- Frontend API mode uses `credentials: include`, attaches the CSRF header, attempts one shared refresh for eligible 401 responses, and retries the original request once. Auth wire responses are mapped into the UI session type; authenticated password change is available, while signup and email password reset fail closed and remain unavailable in API mode.
- School memberships/workspace roles are selected before entering a school session. Platform authority is not inferred from school membership; platform-only login is not issued because no approved platform-grant model exists in the current schema.
- The database migration adds nullable session lineage and selected-school/workspace fields to refresh-token records. Both migrations were applied to the empty local Compose database and the synthetic demo account was seeded; no reset was performed. The current frontend has no shared query/data cache to invalidate on workspace selection.

### Verification and remaining contract gates

| Repository | Check | Result |
|---|---|---|
| Backend | `npm test -- --runInBand` | Passed; 6 suites, 22 tests, including auth service, cookie, CSRF, and JWT-guard tests |
| Backend | `npm run typecheck` / `npm run build` | Passed |
| Backend | `prisma validate` with local dummy URLs | Passed; validation only, no database connection or migration |
| Backend | `npm run lint` | Still blocked by the pre-existing missing ESLint 9 configuration |
| Frontend | `npm run lint` | Passed |
| Frontend | TypeScript check / `npm run build` | Passed |
| Local PostgreSQL | Initial and browser-session migrations / synthetic seed | Passed against the empty local Compose database; no reset was performed |
| Backend HTTP API | Login through school selection, protected read, refresh, replay revocation, and logout | Passed against the local API using the synthetic seeded account |
| Backend HTTP API | CSRF rejection, auth cookie attributes/clearing, and immediate access invalidation | Passed |
| Generated Swagger | Six auth routes and active-school response status | Passed; `POST /api/v1/auth/active-school` documents HTTP 200 |
| Frontend | Auth interaction tests | Passed; 12 tests across 2 suites covering session state, workspace selection, protected request refresh, API-mode gating, and logout failures |

Phase 2's live API integration gate is satisfied for the synthetic local school-admin account. The manual HTTP integration probe was not retained as a persistent test; automated frontend tests cover the UI and HTTP adapter behavior. Platform-only login remains deliberately unavailable pending a dedicated platform grant model.
