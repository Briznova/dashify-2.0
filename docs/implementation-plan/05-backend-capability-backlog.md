# Backend Capability and Gap Backlog

**Status:** Inventory based on the 2026-11-12 repository snapshot; priorities are proposals  
**Source of truth:** Backend OpenAPI and approved feature specs must be rechecked before work starts.

## Release blockers and foundations

| ID | Gap | Current evidence | Recommended next step |
|---|---|---|---|
| B0-1 | Tenant RLS absent/incomplete | Backend implementation plan says policies and least-privilege app role remain; security doc says production is blocked | Complete policies and two-school isolation tests before production |
| B0-2 | Auth refresh rotation incomplete | Refresh token hashes exist; implementation plan lists rotation pending; no refresh route observed | Approve auth spec, implement rotation/replay handling |
| B0-3 | Auth frontend contract mismatch | Backend uses Bearer JWT/login/me/logout; frontend expects cookie session/sign-in/sign-out | Resolve auth/session decision before protected frontend API integration |
| B0-4 | Permission matrix incomplete | School Admin has the school-management baseline; Principal and Teacher have explicit dashboard and announcement-read grants. Teacher workspace permissions are now dedicated and assignment-scoped. Accountant, Parent, Student, and platform-wide grants remain incomplete, and school onboarding/platform administration are not implemented. Frontend permission filtering is presentation-only. | Define remaining role grants and object scopes, then test endpoint and object-level authorization before enabling further API-mode capabilities |
| B0-5 | API prefix/config mismatch | Backend defaults `api/v1`, port 3000, CORS origin 5173; frontend docs show 3001 and its adapter paths omit prefix | Standardize local and deployed config |

## Core functional gaps

| Area | Present | Missing/mismatched work |
|---|---|---|
| Auth | Login, logout, me, membership list, active school | Refresh, signup, password reset, email delivery/verification, frontend auth adaptation |
| Schools | Current school read/update; memberships list | Platform-wide school directory/creation/onboarding lifecycle; role scope clarification |
| Academic structure | Academic-year and active class/section read/create; frontend uses the backend class/section read model | Update/archive lifecycle; teacher assignment and schedule representations |
| Students | Paginated list/detail/create/update with guardian lifecycle | Archive, server-side search/filter, documents, and additional roster/grade representation |
| Staff | School-scoped profile create/update/deactivate, existing-account Teacher linkage, teacher assignments, permissions, frontend integration | Invitation/credential setup and non-Teacher role grants |
| Attendance | Session read/create/mark/close; closed-session daily reports and client-generated aggregate CSV | Corrections with reason and any additional report types |
| Finance | Schema work planned | Blocked until finance decisions in backend planning are approved; no financial APIs should be fabricated |
| Academic workflows | Teacher-created assignments/exams with one-way publish and Teacher-only score entry/update are implemented with assignment and enrollment-date checks | Student submissions, attachments, notifications, grading scales, and student/parent result publication |
| Dashboards | School-admin `GET /api/v1/dashboard` returns active student/staff/class/section counts; Principal `GET /api/v1/dashboard/principal` returns school-local daily attendance totals. Each has a separate permission and active-school scoping. | Teacher, parent, and platform aggregates; finance metrics; performance and cache/refresh semantics remain gated |
| Reports | School-admin `GET /api/v1/reports/attendance` returns closed-session summary and per-day counts for an inclusive date range; the frontend can download those aggregates as CSV | Other report types, PDF/server-generated exports, student-level detail, and performance reports remain gated |
| Communications | School-wide in-app announcement list, management list, draft creation, and publish APIs; School Admin manages and School Admin/Principal/Teacher can read | Notifications, read receipts, audience targeting, attachments, delivery channels, and user preferences |
| Files/documents | Schema includes file object model | Private storage adapter, upload/download authorization, malware/content policy, object-level checks |
| Operations | Health endpoints and logging foundations | Backups/restore drill, operational alerting, storage adapter, staging/UAT/release readiness |

## Proposed priority bands

### P0 — Required before live multi-tenant API release

- Auth contract and secure refresh/session behavior.
- Complete role/permission assignments and denial tests.
- Tenant RLS/least-privilege runtime role and cross-tenant tests.
- School selection and scoped API requests.
- Error and validation contract; production CORS/environment configuration.

### P1 — Minimum useful school operations

- Academic structure read APIs and school profile integration.
- Student list/detail/create, pagination, and compatible form/view mapping.
- Staff APIs if staff navigation remains in the first product release.
- Attendance session flow with timezone and correction/audit decisions.

### P2 — Role workspaces and reporting

- Backend dashboard aggregates per selected role/workspace; School Admin current counts, the Principal daily attendance snapshot, and the Teacher assigned-class attendance snapshot are implemented and documented in the [dashboard contract](../api-contracts/dashboard.openapi.yaml). Principal and Teacher membership assignment is not included.
- Remaining report types/exports and academic assignment submission/grading workflows.
- Parent/student-specific linked-record APIs with object-level authorization.
- Notifications and broader announcement features; the school-wide in-app first slice is implemented.

### P3 — Explicitly decision-gated

- Finance/fees/payment collection and reconciliation.
- File/document storage and sharing.
- Platform-wide school management and custom role/permission administration.

Priorities are not approval to build. Product must confirm release scope, data needs, and workflows.

## Backlog item readiness

Do not open implementation work from an inventory row alone. Create an approved feature spec with:

- User story, scope, non-goals, and role matrix.
- API operations, DTOs, permissions, tenant scope, and errors.
- Data lifecycle, audit/privacy requirements, and migration impact.
- Frontend states and wire-to-view mapping.
- Acceptance tests including authorization and isolation.
- Dependencies, owner, and rollout strategy.
