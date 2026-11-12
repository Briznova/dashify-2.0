# Backend Capability and Gap Backlog

**Status:** Inventory based on the 2026-11-12 repository snapshot; priorities are proposals  
**Source of truth:** Backend OpenAPI and approved feature specs must be rechecked before work starts.

## Release blockers and foundations

| ID | Gap | Current evidence | Recommended next step |
|---|---|---|---|
| B0-1 | Tenant RLS absent/incomplete | Backend implementation plan says policies and least-privilege app role remain; security doc says production is blocked | Complete policies and two-school isolation tests before production |
| B0-2 | Auth refresh rotation incomplete | Refresh token hashes exist; implementation plan lists rotation pending; no refresh route observed | Approve auth spec, implement rotation/replay handling |
| B0-3 | Auth frontend contract mismatch | Backend uses Bearer JWT/login/me/logout; frontend expects cookie session/sign-in/sign-out | Resolve auth/session decision before protected frontend API integration |
| B0-4 | Permission matrix incomplete | Current seed assigns all existing school permissions to School Admin only; role grants for Principal, Teacher, Accountant, Parent, and Student are absent. Platform grant and school-onboarding APIs are not implemented. The frontend now filters API-mode navigation/routes using returned permission keys for known capabilities and hides unsupported screens/actions, but this is not enforcement. Student/class/attendance adapter paths and DTOs still do not match backend routes. | Implement the delegated least-privilege scope defaults in [access/workspace spec](./03-access-and-workspace-spec.md), define role grants, align adapters, then test endpoint and object-level authorization before enabling API-mode UI capabilities |
| B0-5 | API prefix/config mismatch | Backend defaults `api/v1`, port 3000, CORS origin 5173; frontend docs show 3001 and its adapter paths omit prefix | Standardize local and deployed config |

## Core functional gaps

| Area | Present | Missing/mismatched work |
|---|---|---|
| Auth | Login, logout, me, membership list, active school | Refresh, signup, password reset, email delivery/verification, frontend auth adaptation |
| Schools | Current school read/update; memberships list | Platform-wide school directory/creation/onboarding lifecycle; role scope clarification |
| Academic structure | Academic-year and class/section read/create | Update/archive lifecycle and frontend-compatible class/section read model as needed |
| Students | List/detail/create/archive | Update/search/filter; guardian linking lifecycle; documents; pagination UX; roster/grade representation |
| Staff | Prisma staff-related model exists | Staff APIs, staff lifecycle, teacher assignments, permissions, frontend service integration |
| Attendance | Session read/create/mark/close | Corrections with reason, timezone-safe behavior, daily/student reports and UI aggregate contract |
| Finance | Schema work planned | Blocked until finance decisions in backend planning are approved; no financial APIs should be fabricated |
| Academic workflows | Schema/domain foundations exist | Assignment lifecycle, submissions/grading, grade/report workflows and role-scoped access |
| Dashboards | School-admin `GET /api/v1/dashboard` returns active student/staff/class/section counts with `dashboard.read` and active-school scoping | Teacher, parent, principal, and platform aggregates; attendance/finance metrics; performance and cache/refresh semantics remain gated |
| Reports | School-admin `GET /api/v1/reports/attendance` returns closed-session counts for an inclusive date range | Other report types, CSV/PDF exports, student-level detail, and performance reports remain gated |
| Communications | Schema includes announcement/notification-related models | Announcement and notification APIs, delivery/read state, user preferences |
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

- Backend dashboard aggregates per approved role/workspace; the first school-admin current-count slice is implemented and documented in the [dashboard contract](../api-contracts/dashboard.openapi.yaml).
- Remaining report types/exports and academic assignment/submission workflows.
- Parent/student-specific linked-record APIs with object-level authorization.
- Announcement/notification APIs.

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
