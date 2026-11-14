# Phase 5 Proposed Feature Specs

**Status:** Mixed — implemented slices are recorded below; all remaining Phase 5 areas are approved for prioritization, with feature-level decisions and implementation gates still open
**Last updated:** 2026-11-13
**Source of truth:** [execution checklist](./00-execution-checklist.md), [execution roadmap](./00-execution-roadmap.md), and [backend capability backlog](./05-backend-capability-backlog.md)

This file records completed Phase 5 slices and proposals for remaining work. Product approved all remaining Phase 5 areas for prioritization on 2026-11-13. That approval does not settle feature-level behavior or make Draft paths, permission names, or contracts implementation-ready; these remain design candidates, not existing API contracts, grants, or authorization behavior.

## Phase 5 proposal index

1. Student edit and guardian lifecycle
2. Staff directory and teacher assignment
3. Academic structure management (classes, sections, years)
4. Attendance workflow and rollups
5. Dashboard and role-based metrics
6. Reports and exports
7. Announcements and communications
8. Finance and fee workflows
9. Documents and files
10. Platform administration and global school management

## Product prioritization approval (2026-11-13)

Product approved all twelve remaining Phase 5 items for prioritization:

1. Staff account creation/invitations, school-role assignment, and staff lifecycle management.
2. Class/section update, archive, and delete behavior.
3. Teacher attendance authorization by assignment, plus corrections with reasons and audit history.
4. Remaining role dashboards and their data boundaries.
5. Additional report types, PDF export, and any server-side export retention.
6. Academic assignment and submission workflows.
7. Parent/student linked-record identity and object-level access.
8. Announcements and notifications.
9. Finance and fee workflows.
10. Documents/files, including storage and access lifecycle.
11. Platform administration and global school management.
12. Delivery of each approved capability as a tested vertical slice with updated specifications and API contracts.

This is approval to include and prioritize these areas in Phase 5, not approval of unresolved product behavior, API contracts, permission grants, or implementation details. Each feature must still pass the implementation-readiness gate below. No implementation order or delivery date was set.

## Readiness and next decisions

| Section | Current state | Next gate |
|---|---|---|
| 1. Student and guardians | Profile and guardian-link update, primary-guardian validation, and PII-free update audit delivered | Decide parent linked-record identity and object-access requirements separately |
| 2. Staff and assignments | Active-school directory, assignments, existing-account Teacher linkage, and profile update/deactivation delivered | Decide whether to add invitation/credential setup or non-Teacher role grants |
| 3. Academic structure | Academic-year read/create, class/section read/create delivered | Decide campus model and lifecycle/locking behavior |
| 4. Attendance | Session list/create/roster/mark/close delivered; corrections are deferred | Approve teacher assignment scope and correction/audit workflow |
| 5. Dashboards | School Admin, Principal, and Teacher read-only slices implemented; other role cards remain proposals | Select and approve the next role slice with its identity/data boundary |
| 6. Reports | Closed-session summary, daily breakdown, and client-generated aggregate CSV delivered | Approve any additional report types or export/retention behavior |
| 7. Announcements | Draft proposal for school-wide in-app publishing | Decide channels, audience, publishers, and read receipts |
| 8. Finance | Blocked; aggregate Accountant dashboard is only a candidate | Approve financial definitions, transaction lifecycle, and payment/reconciliation policy |
| 9. Documents | Blocked on provider and access lifecycle | Select storage provider, document classes, retention, and authorized roles |
| 10. Platform administration | Read-only directory, platform-only session, dedicated grant, and audited metadata endpoint delivered | Decide MFA/recovery and ongoing grant-provisioning/revocation controls; school lifecycle tools remain separate |

---

# 1) Student edit and guardian lifecycle

**Status:** Implemented — student profile and guardian-link updates, primary-guardian validation, and PII-free update audit
**Owner:** Product + backend + frontend
**Target release:** TBD

## Problem and user outcome

School staff need to update a student record and reconcile guardian relationships without breaking the roster. Parent access remains a separate, unimplemented linked-record capability.

## Personas and authorization

| Persona / backend role | Scope | Allowed actions | Denied actions |
|---|---|---|---|
| School Admin | Active school from authenticated session | Read/create students; update profile and guardian links; archive a student | Cross-school mutation; reinstate is not implemented |
| Teacher | No student-write grant in this slice | No write action through this slice | Edit student or guardian data |
| Parent/Guardian | No self-service lifecycle in this slice | None | Read or update records without a separately authorized linked-record feature |

Frontend visibility is UX only; backend authorization is authoritative.

## Scope

### In scope
- Partially update supported student profile fields in the active school.
- Reconcile guardian links when a `guardians` array is supplied: update linked guardians, create new guardian records, and unlink omitted guardians without deleting the guardian records.
- Allow zero or one primary guardian; reject a request with multiple primary guardians.
- Record a `STUDENT_UPDATED` audit event in the same tenant transaction for a non-empty update.
- Leave guardian links unchanged when the `guardians` property is omitted.
- Keep school scope derived from authenticated active-school context.
- Archive through the existing archive route; there is no reinstate route.

### Out of scope
- Guardian account creation, parent self-service, and parent-child authorization.
- Reinstate, enrollment transfer/history management, and document or consent workflows.

## API contract

| Method and path | Auth/context | Permission | Request | Response | Errors |
|---|---|---|---|---|---|
| `GET /api/v1/students/{id}` | Cookie auth + active school | `students.read` | UUID path parameter; no query parameters | Student detail with guardian links and enrolments | 400/401/403/404 |
| `PATCH /api/v1/students/{id}` | Cookie auth + active school | `students.update` | Partial `CreateStudentDto`; `guardians`, when present, is the replacement guardian-link set; supplied IDs must already be linked to this student | Updated student detail | 400/401/403/404/409 |
| `POST /api/v1/students/{id}/archive` | Cookie auth + active school | `students.archive` | No body | `{ success: true }` | 401/403/404 |

## Data and privacy
- Student and guardian records stay within the active school tenant.
- Guardian contact data is sensitive and must be redacted in logs.
- Removing a guardian link does not delete the guardian record.
- A non-empty update writes `STUDENT_UPDATED` atomically with the mutation. Its summary contains submitted field names and guardian-link action counts only; it excludes student and guardian values and identifiers.
- An empty update does not write an audit event. Audit-write failures propagate so the tenant transaction can roll back.

## Acceptance criteria
- [x] School administrators can update student fields and guardian links in the active school.
- [x] Duplicate admission numbers and invalid/missing student references return explicit errors.
- [x] Student and guardian mutations are scoped to the active school.
- [x] The API-mode edit flow uses the backend contract and surfaces failures without mock fallback.
- [x] Student updates produce a PII-free audit event in the same tenant transaction.

## Test plan
- Backend: unit tests for update DTO validation and tenant scoping
- Frontend: adapter and form tests for edit flow
- Integration: PATCH + verify downstream read result

## Guardian and audit verification

- [x] Reject more than one primary guardian and permit zero.
- [x] Omitted `guardians` leaves links unchanged; an empty supplied array unlinks all links without deleting guardian records.
- [x] Record the authenticated actor, submitted field names, and guardian-link action counts for a non-empty update.
- [x] Keep student and guardian PII out of the update audit summary.
- [x] Propagate audit-write failures within the tenant transaction.
- [x] Reject supplied guardian IDs not already linked to the active-school student without exposing another record's existence.
- [x] Cover these behaviors with focused backend service tests.

Audit `changedFields` lists request fields supplied to the update, not a computed comparison of persisted before/after values. Existing guardian records may be updated only when already linked to this student; a new guardian is created when no ID is supplied.

---

# 2) Staff directory and teacher assignment

**Status:** Implemented — school-scoped staff directory and assignments, existing-account Teacher linkage, and staff profile management; invitations and non-Teacher role grants remain gated
**Owner:** Product + backend + frontend
**Target release:** TBD

## Problem and user outcome

Administrators need a staff directory and teacher assignment model that maps teachers to sections and classes.

The following baseline describes the original delivered slice. The approved
Teacher onboarding and departments section below supersedes its exclusions and
extends the contract.

## Personas and authorization

| Persona / backend role | Scope | Allowed actions | Denied actions |
|---|---|---|---|
| School Admin | Active school from authenticated session | Read/create/update/deactivate staff profiles, link an existing account as Teacher, list assignments, assign a staff profile to a class/section | Cross-school staff operations; new credentials/invitations; non-Teacher role grants |
| Principal | No staff grant in the current seed | No access implied by the role label | Manage staff/assignments until explicitly granted |
| Teacher | No self-scoped assignment-read API in this slice | None through these routes | Read other staff or manage assignments |

## Scope

### In scope
- List/get active-school staff profiles and create a staff profile.
- Update and deactivate staff profiles in the active school.
- Optionally link an existing user account to a staff profile and grant only the Teacher workspace role for the active school.
- List assignments and create/reactivate an assignment for a staff profile to a class, optionally narrowed to a section.
- Validate that the staff profile, class, and optional section belong to the active school and that the section belongs to the selected class.

### Out of scope
- Platform-wide staff administration
- Payroll or HR workflows
- Teacher evaluation and performance scoring
- New user creation, invitation delivery, credential setup/reset, non-Teacher role grants, and teacher self-service views

## API contract

| Method and path | Auth/context | Permission | Request | Response | Errors |
|---|---|---|---|---|---|
| `GET /api/v1/staff` | Cookie auth + active school | `staff.read` | None | Active-school staff list | 400/401/403 |
| `GET /api/v1/staff/{id}` | Cookie auth + active school | `staff.read` | UUID path parameter | Staff profile | 400/401/403/404 |
| `POST /api/v1/staff` | Cookie auth + active school + CSRF | `staff.manage` | `{ employeeCode, firstName, lastName?, userId? \| accountEmail?, email?, phone?, designation?, department? }` | Created staff profile; existing account link grants only the active-school Teacher role | 400/401/403/404/409 |
| `PATCH /api/v1/staff/{id}` | Cookie auth + active school + CSRF | `staff.manage` | Editable staff profile fields | Updated active-school staff profile | 400/401/403/404/409 |
| `POST /api/v1/staff/{id}/deactivate` | Cookie auth + active school + CSRF | `staff.manage` | No body | Inactive profile; linked Teacher role and assignments revoked | 401/403/404 |
| `GET /api/v1/teacher-assignments` | Cookie auth + active school | `staff.read` | None | Active-school assignments | 400/401/403 |
| `POST /api/v1/teacher-assignments` | Cookie auth + active school + CSRF | `staff.manage` | `{ staffId, classId, sectionId?, subject? }` | Created/reactivated assignment | 400/401/403/404 |

## Data and privacy
- Staff records are school-scoped and require tenant isolation.
- PII such as personal contact details must be limited to authorized roles.

## Acceptance criteria
- [x] School administrators can list/get/create staff and list/create class or section assignments for the active school.
- [x] A repeated assignment reactivates the existing assignment instead of creating a duplicate.
- [x] Cross-school staff, class, or section references are rejected by the backend.
- [x] The read-only Teacher dashboard derives assignment scope from the linked active staff profile; broader teacher self-service and attendance actions remain gated.
- [x] School administrators can update/deactivate active-school staff profiles; deactivation removes only the Teacher role granted through this workflow and preserves the global user account.
- [x] Linking an existing user is active-school scoped, grants only the Teacher role, and rejects inactive users or suspended/revoked memberships.

## Test plan
- Backend permission tests and DTO validation
- Frontend route and directory view integration tests

## Open questions
- Which approved email provider and credential-setup workflow should create/invite new user accounts? Until decided, this slice links existing accounts only.
- Who may grant school roles other than Teacher?
- Which additional staff lifecycle operations, if any, need approval beyond profile update/deactivation?
- Which additional teacher self-service views or attendance actions should be approved after this dashboard slice?

## Approved teacher onboarding and departments (2026-11-14)

School Admin creates new Teacher accounts from Staff using an individual
password entered by the administrator. The email is a new, globally unique
login; existing accounts are rejected rather than automatically linked.
Creation is atomic across the user, school membership, Teacher role and staff
profile. Passwords are at least 12 characters, hashed, never returned or
audited, and must be communicated separately. This is not an invitation:
email verification, forced password change and delivery are not implemented.
Existing-account linking remains a separate existing API; provisioning accounts
for existing staff is out of scope.

The staff designation selector offers Teacher only. Departments are optional,
school-scoped, and configured in School Admin Settings. Administrators may add,
rename and deactivate departments; deactivation preserves associated staff.
Creation and edits only accept active departments from the active school, while
existing inactive department assignments remain visible. Legacy free-text values
remain readable. Staff accounts and department mutations are limited to the
active School Admin workspace and their respective backend permissions.

New schools need the standard Teacher role and the previously approved
`dashboard.teacher.read` and `announcements.read` grants. Existing roles that
do not match the standard must not be silently expanded. No other workspace,
role grants, invitation system or Teacher workspace functionality is included.
Verify login, authorization, duplicate-email races, CSRF, tenant isolation,
department validation and safe deactivation in isolated PostgreSQL tests.

Verification (2026-11-14): focused frontend tests, TypeScript, lint and
production build passed. Backend staff unit tests and typecheck passed; isolated
PostgreSQL HTTP tests verified Teacher login and revocation, exact role grants,
school/workspace authorization, CSRF, department isolation and lifecycle,
duplicate-email concurrency and redacted audit. The additive migration was
applied locally with approval. Browser smoke checks used synthetic intercepted
responses; production isolation and operational hardening remain release gates.

**Delegated account-scope decision (2026-11-13):** Use existing accounts only because no invitation/password-setup endpoint or email delivery provider is configured. School Admin may link an existing account to an active-school staff profile and grant only the Teacher role; creating credentials and granting other roles remain gated. Deactivation preserves the global user and other school roles while revoking this staff-linked Teacher access. Profile update audits record changed field names, not submitted PII values.

**Implementation evidence (2026-11-13):** Staff profile creation/update/deactivation and existing-account Teacher linkage are implemented across backend and API-mode frontend. Deactivation also disables class/section assignments and revokes the Teacher membership role; a membership is revoked only when no other school roles remain. Added a uniqueness constraint for one linked staff profile per school user, with a migration precheck that fails rather than silently resolving duplicate links.

---

# 3) Academic structure management

**Status:** Partially implemented — academic-year list/create and class/section read, create and edit are delivered; deactivation and deletion remain Draft
**Owner:** Product + backend + frontend
**Target release:** TBD

## Problem and user outcome

Schools need durable academic-year, class, and section definitions that can be used across student and teacher workflows.

## Personas and authorization

| Persona / backend role | Scope | Allowed actions | Denied actions |
|---|---|---|---|
| School Admin | Active school from authenticated session | Read/create academic years; read/create/edit classes and sections | Cross-school access; archive/delete is not implemented |
| Teacher | No academic-structure grant in this slice | None through these routes | Manage academic structure |

## Scope

### In scope
- List and create academic years in the active school.
- List classes with sections in the active school.
- Create classes and sections in the active school (the approved Phase 5 write slice).
- Edit class and section fields from the class details page (approved follow-up).

### Out of scope
- Editing academic years; deactivating or deleting academic years, classes, or sections.
- Timetable optimization and scheduling conflict resolution.
- Multi-campus structure; campus scope remains undecided.

## First approved slice: create classes and sections

This slice exposes the existing school-scoped class and section creation routes
in the frontend. It does not include editing, deactivation, deletion, or changes
to academic-year lifecycle behavior.

### Permissions and tenant scope

- Read class and section data with `academic_structure.read`.
- Create classes and sections with `academic_structure.manage`.
- The backend derives the school from the authenticated active-school context;
  client-supplied school IDs are not accepted.
- Frontend permission checks control visibility only. Backend guards remain
  authoritative.

### API contract

| Method and path | Auth/context | Permission | Request | Response | Errors |
|---|---|---|---|---|---|
| `GET /api/v1/classes` | Cookie auth + active school | `academic_structure.read` | None | Classes with sections | 401/403 |
| `POST /api/v1/classes` | Cookie auth + active school | `academic_structure.manage` | `{ name, code, sortOrder? }` | Created class | 400/401/403/409 |
| `POST /api/v1/sections` | Cookie auth + active school | `academic_structure.manage` | `{ classId, name, code, capacity? }` | Created section | 400/401/403/404/409 |

Class codes are unique within a school; section codes are unique within their
class. Creates are audit-logged. No school or tenant identifier is accepted in
either request body.

### Acceptance criteria

- [x] An authorized school administrator can create a class and then add sections.
- [x] Classes and sections appear in the active-school directory after creation.
- [x] Duplicate codes and invalid parent-class references produce explicit API errors.
- [x] Users without `academic_structure.manage` cannot create data, even if they invoke the API directly.
- [x] Cross-school class IDs cannot be used to create sections.

### Test plan

- Backend: DTO validation, permission metadata, tenant-scoped parent lookup, and audit-log tests.
- Frontend: HTTP method/body/response mapping and permission-gated form submission tests.

**Implementation evidence (2026-11-12):** Class and section forms are integrated with the authenticated API service. Backend service and DTO/permission tests, frontend adapter and form tests, both app typechecks, and both production builds passed. No live API/database integration was run.

### Approved combined creation follow-up

The School Admin creates a new class and its first section in one form and one
atomic transaction. Adding sections to existing active classes remains available
as a separate action. The existing class-only and section APIs remain compatible.
The new `POST /api/v1/classes/with-section` requires
`academic_structure.manage`, cookie authentication, an active school and the
standard CSRF protections. It accepts `{ name, code, sortOrder?, section:
{ name, code, capacity? } }`; it returns the created class with a one-element
`sections` array. The validation constraints match the existing class and
section DTOs. A duplicate class code is a 409; invalid input is a 400.
Both creation audit entries and both records commit or roll back together.
See [academic structure contract](../api-contracts/academic-structure.openapi.yaml).
Focused backend tests cover DTO validation, permission metadata, tenant-scoped
writes and propagated transaction failures; frontend tests cover the combined
request, error display and the separate section action. PostgreSQL rollback and
live HTTP behavior were not exercised for this follow-up.

### Approved class details and editing follow-up (2026-11-14)

The class directory keeps the combined class/first-section form; individual
class links open a details page. Managers can edit class name, code and sort
order, add sections, and edit each section's name, code and capacity there.
Readers can view the page but cannot mutate it. Deactivation and deletion are
not included. Existing active-school reads and `academic_structure.read` apply;
all mutations require `academic_structure.manage` and CSRF protection.

`PUT /api/v1/classes/:id` accepts `{ name, code, sortOrder }`.
`PUT /api/v1/classes/:classId/sections/:sectionId` accepts
`{ name, code, capacity }`, where capacity is a positive integer or null (no
limit). Both update only active records in the active school, reject duplicate
codes with 409, and record an audit entry in the transaction. Invalid input is
400 and unavailable or cross-school records are 404. Capacity cannot be less
than the number of active, unended enrolments for non-archived students in any
one academic year; this matches admission's per-year capacity definition.
The capacity check and update take the same school lock as admission, so
concurrent admissions cannot bypass the limit. No migration is required.

Verification: focused frontend and backend tests and typechecks passed. An
isolated PostgreSQL HTTP test covered authorization, CSRF, tenant isolation,
duplicate codes, capacity conflicts and concurrent admission versus capacity
reduction. The application database was not changed.

## API contract

| Method and path | Auth/context | Permission | Request | Response | Errors |
|---|---|---|---|---|---|
| `GET /api/v1/academic-years` | Cookie auth + active school | `academic_structure.read` | None | Academic years | 400/401/403 |
| `POST /api/v1/academic-years` | Cookie auth + active school | `academic_structure.manage` | Academic-year DTO | Created academic year | 400/401/403/409 |
| `GET /api/v1/classes` | Cookie auth + active school | `academic_structure.read` | None | Active classes with active sections | 400/401/403 |
| `POST /api/v1/classes` | Cookie auth + active school | `academic_structure.manage` | `{ name, code, sortOrder? }` | Created class | 400/401/403/409 |
| `POST /api/v1/classes/with-section` | Cookie auth + active school | `academic_structure.manage` | Class fields and nested first section | Created class with first section | 400/401/403/409 |
| `POST /api/v1/sections` | Cookie auth + active school | `academic_structure.manage` | `{ classId, name, code, capacity? }` | Created section | 400/401/403/404/409 |

## Data and privacy
- School academic data is tenant-bound.
- Class and section creation is audit-logged; do not infer an audit guarantee for unimplemented lifecycle changes.

## Acceptance criteria
- [x] Academic years and classes/sections are read within the active school; academic years can be created.
- [x] Authorized school administrators can create classes and sections; duplicate codes and invalid parent references return explicit errors.
- [x] Users without `academic_structure.manage` cannot create classes or sections, including with a direct API request.
- [ ] Update/archive/delete behavior is specified and approved before those actions are exposed.

## Test plan
- Backend: DTO validation, permission metadata, tenant-scoped reference checks, and audit-log tests.
- Frontend: academic-year/class/section adapter and class/section creation form tests.

## Open questions
- Is the product single-campus, or should campus become a tenant-scoped dimension?
- Should academic structure be locked once an academic year begins, and what archival behavior is needed?

---

# 4) Attendance workflow and rollups

**Status:** Partially implemented — school-scoped session list/create/roster/mark/close workflow is delivered; corrections and teacher object-scope remain gated
**Owner:** Product + backend + frontend
**Target release:** TBD

## Problem and user outcome

Schools need a reliable attendance workflow for daily sessions, marking, closure, and later correction/reporting.

## Personas and authorization

| Persona / backend role | Scope | Allowed actions | Denied actions |
|---|---|---|---|
| School Admin | Active school from authenticated session, subject to backend permission | Read sessions/rosters, create sessions, mark records, close sessions | Cross-school records |
| Teacher | Assigned-class scope is a product target, not enforced by this slice | No teacher-specific operation until assignment-to-user and object-level authorization are implemented | Access unrelated or school-wide rosters |
| Principal | Active school | Read the daily aggregate snapshot defined in section 5 | Student-level attendance records through the dashboard |

## Scope

### In scope
- List attendance sessions by date and read the enrolled roster for a session.
- Create a session, mark unmarked student records, and close a session within the active school.
- Derive the frontend's default date using the school's IANA timezone; session dates are calendar dates.
- Use the closed-session aggregate report defined in section 6 for date-range summary and daily breakdown.

### Out of scope
- Editing or replacing an existing attendance record; the mark endpoint rejects overwrites.
- Teacher assignment/object-level authorization, attendance policy management, and correction-with-reason workflow.
- Automatic compliance reporting and parent SMS notifications.

## API contract

| Method and path | Auth/context | Permission | Request | Response | Errors |
|---|---|---|---|---|---|
| `GET /api/v1/attendance/sessions?date=YYYY-MM-DD` | Cookie auth + active school | `attendance.read` | Required calendar date | Sessions for that school date | 400/401/403 |
| `GET /api/v1/attendance/sessions/{id}/roster` | Cookie auth + active school | `attendance.read` | Session UUID | Enrolled roster for the session date | 400/401/403/404 |
| `POST /api/v1/attendance/sessions` | Cookie auth + active school | `attendance.mark` | `CreateAttendanceSessionDto` | Created session | 400/401/403/404/409 |
| `PUT /api/v1/attendance/sessions/{id}/records` | Cookie auth + active school | `attendance.mark` | `{ records: [{ studentId, status, remarks? }] }` | Marked records | 400/401/403/404/409 |
| `POST /api/v1/attendance/sessions/{id}/close` | Cookie auth + active school | `attendance.correct` | No body | Closed session | 400/401/403/404/409 |

## Data and privacy
- Daily, per-student absence and status records are sensitive.
- Roster and mark operations derive the school from the authenticated context and validate the session/student against that school.
- Any future correction workflow must capture an approved reason and an auditable before/after record.

## Acceptance criteria
- [x] Authorized school users can list sessions, read the enrolled roster, create sessions, mark records, and close sessions.
- [x] Existing marks cannot be overwritten through the mark endpoint.
- [x] Session dates follow the active school's calendar date and API errors do not fall back to mock data.
- [ ] Teachers can use these endpoints only after assignment-scoped authorization is implemented and tested.
- [ ] Corrections require a reason and audit trail before correction UX is enabled.

## Test plan
- Backend tenant and permissions tests
- Frontend attendance entry flow
- Report-generation smoke tests

## Open questions
- Which roles should create/close sessions, and should `attendance.correct` remain the permission for closing?
- Should corrections replace a mark, append a correction event, or use a separate review workflow?
- Which future daily/period rollups need a distinct contract from the closed-session report in section 6?

---

# 5) Dashboard and role-based metrics

**Status:** Partially approved — School Admin, Principal, and Teacher dashboard slices are implemented; other role features remain proposals
**Owner:** Product + frontend + backend
**Target release:** Phase 5

## Problem and user outcome

Users need role-based dashboards with the right metrics and no mock data dependency. The School Admin and Principal slices provide school-scoped metrics; the Teacher slice is limited to assigned class/section attendance status.

## Personas and authorization

| Persona / backend role | Scope | Allowed actions | Denied actions |
|---|---|---|---|
| School Admin | Active school from authenticated session | Read current active student, staff, class, and section counts | Cross-school dashboard access |
| Principal | Active school from authenticated session | Read daily attendance aggregates for sessions on the school-local date | Student-level data and cross-school dashboard access |
| Teacher | Active assignments derived from the authenticated user and active school | Read today's assigned class/section session status and unmarked count | Other teachers' assignments, student identifiers, and attendance mutations |
| Parent | Household | Not approved in this slice | School-wide analytics |

## Scope

### In scope
- `GET /api/v1/dashboard`, requiring `dashboard.read`; derive tenant from authenticated active-school context and do not accept role/school filters from the client.
- Current counts of active students, active staff profiles, active classes, and active sections belonging to active classes.
- API-mode school-admin KPI cards backed by the endpoint; no mock panels or fabricated trends.
- `GET /api/v1/dashboard/principal`, requiring the separate `dashboard.principal.read` permission; derive the school and local date from the authenticated active-school context.
- Present, absent, late, excused, and unmarked totals over active student-session roster entries for sessions that exist on the school's local date. A student without a record for an existing session is unmarked; a class without a session contributes nothing.
- API-mode Principal KPI cards backed by server-side aggregates; return no student identifiers and do not assign the Principal role to existing users automatically.
- `GET /api/v1/dashboard/teacher`, requiring the Teacher workspace role and separate `dashboard.teacher.read` permission; derive exactly one active staff profile from the authenticated user and active school.
- Return only active assigned classes and sections; a class-level assignment covers its active sections and a section assignment covers only that section. Derive the date from the school's timezone.
- For each assignment, return the session status and active-enrolment unmarked count only when a session exists that day; return null for both when no session exists. Return no student identifiers or attendance mutation actions.
- API-mode Teacher dashboard with assignment-scoped results and no mock fallback.

### Out of scope
- Custom report-builder UI
- Real-time analytics ingestion or streaming
- Parent dashboards; finance aggregates; trends, periods, and caching policy.

### Initial features by user type and remaining approval gates

This plan complements the frontend's [User-Type Modular Structure Plan](../../apps/frontend/docs/user-type-modular-structure-plan.md). School Admin, Principal, and Teacher rows record implemented slices; they do not approve any other candidate. Each remaining role's server permission, data scope, endpoint contract, and negative authorization tests must be approved and implemented before its feature appears in API mode.

| User type | Proposed initial dashboard feature | Required data boundary | Readiness / prerequisite |
|---|---|---|---|
| Super Admin | Read-only school directory and active/inactive school counts | Dedicated platform scope only; no school membership or school-scoped records | Implemented at `GET /api/v1/platform/schools`; MFA/recovery and grant lifecycle remain open |
| School Admin | Active student, staff, class, and section counts | Active school from the authenticated session | Approved and implemented |
| Principal | Read-only daily attendance snapshot for the active school, including present, absent, late, excused, and unmarked totals | Active-school aggregate, using the school's local date; no cross-school or student-level dashboard data | Implemented; requires an explicitly assigned Principal membership to use the endpoint |
| Teacher | Today's assigned active classes/sections with attendance-session status and unmarked count | Only active assignments derived from the authenticated teacher profile; no student identifiers | Implemented at `GET /api/v1/dashboard/teacher`; requires an explicit Teacher membership and `dashboard.teacher.read` grant |
| Accountant | Proposed read-only aggregate of fees due, received, and overdue | Active-school totals only; no student identifiers in the first dashboard view | Blocked until finance definitions, permissions, and payment lifecycle are approved |
| Parent | Linked-child attendance summary and latest notices | Only children linked to the authenticated parent; no unrelated student or school-wide records | Proposed; requires verified parent-account linkage and linked-record authorization |
| Student | Own attendance summary and today's classes; coursework summary only after coursework scope is approved | The authenticated student's own records | Proposed; requires student-account linkage; schedule/coursework APIs are not yet available |

#### Teacher dashboard — implemented scope and decision record

The implemented slice is a read-only view of today's assigned active classes and sections, their attendance-session status, and the number of active enrolled students still unmarked for each existing session. It does not expose student identifiers or permit attendance changes.

The data model has an optional `StaffProfile.userId` link and assignments scoped by `staffId`, class, and optional section. The existing assignment-list endpoint requires school-wide `staff.read`; it is not used by the Teacher workspace. The dashboard resolves the profile from the authenticated user and active school; the client cannot supply `staffId`, class, section, or school scope.

| Decision | Implemented behavior |
|---|---|---|
| Identity mapping | Require exactly one active staff profile linked to the authenticated user in the active school; deny when no unique profile exists. |
| Authorization | Require the Teacher workspace role and `dashboard.teacher.read`; role permission grants are not assigned to memberships automatically. |
| Assignment boundary | Return active assignments only; a class-level assignment expands to its active sections and a section assignment stays within that section. |
| Attendance summary | Use the school's local date. Count active enrolled students without attendance records only for an existing session; status and count are null when no session exists. |
| Data and actions | Return class/section IDs and labels, optional subject, session status, and aggregate unmarked count; no student identifiers or mutations. |

The user asked to proceed and delegated a pragmatic choice when unavailable to answer the scope question. The selected defaults above reuse the existing staff-user link, add a separate dashboard permission, and keep the Teacher slice read-only and assignment-scoped. Backend tests cover missing/ambiguous staff identity, active-school context, assignment scoping query constraints, local date, no-session semantics, and role/permission denial; frontend tests cover response validation and API-mode dashboard selection.

#### Proposed delivery order and gates

1. Keep the approved School Admin counts unchanged.
2. The Principal snapshot is the first additional role slice; its local-date, unmarked-count, and separate-permission behavior is defined in this spec and contract.
3. The Teacher read-only assigned-class snapshot is implemented with explicit identity mapping and assignment-scoped authorization.
4. Defer Parent and Student dashboards until identity-to-record links and object-level tests exist.
5. Keep Accountant work blocked by the finance decisions in section 8. The Super Admin first slice is implemented with platform-only authorization; school lifecycle operations remain separately gated.

These are planning candidates, not grants. A role label, hidden navigation item, or frontend route must never authorize access. The Principal API requires `dashboard.principal.read`, and the Teacher API requires `dashboard.teacher.read`; their migrations create role and permission grants for existing schools but do not assign either role to any membership. Other unimplemented proposals remain unavailable in API mode rather than showing mock values.

## API contract

| Method and path | Auth/context | Permission | Request | Response | Errors |
|---|---|---|---|---|---|
| `GET /api/v1/dashboard` | Cookie auth + active school from session | `dashboard.read` | No query parameters | `SchoolAdminDashboard`: `schoolId`, `schoolName`, and four non-negative active counts | 400/401/403/404 |
| `GET /api/v1/dashboard/principal` | Cookie auth + active school from session | `dashboard.principal.read` | No query parameters | `PrincipalDashboard`: school ID/name, school-local date, and five non-negative attendance totals | 400/401/403/404 |
| `GET /api/v1/dashboard/teacher` | Cookie auth + active school and Teacher workspace role | `dashboard.teacher.read` | No query parameters | `TeacherDashboard`: school-local date and active assigned class/section session states with nullable unmarked counts | 400/401/403/404 |

The wire schemas are in [dashboard.openapi.yaml](../api-contracts/dashboard.openapi.yaml). Principal and Teacher endpoints use the school's local date and return no student identifiers. The Teacher endpoint returns a null session status/count when no session exists; otherwise, the count is active enrolled students without an attendance record.

## Data and privacy
- Dashboards must not expose school-wide data outside the user’s scope.
- Metrics should be computed server-side to avoid client leakage.
- The Principal response contains no student identifiers; its permission is separate from `dashboard.read`.
- The Teacher response contains no student identifiers; the controller requires the Teacher role and the server derives assignment scope from the linked active staff profile.

## Acceptance criteria
- [x] School administrators see only the four approved current counts for their active school.
- [x] Dashboard counts are backed by server-side aggregates inside the active-school tenant context.
- [x] API-mode dashboard does not fall back to mock operational panels or trends.
- [x] Principal sees only the five daily attendance aggregates for the active school, using its local date and a separate backend permission.
- [x] Principal API mode uses the real endpoint and returns an explicit authorization error when the Principal permission is absent; the migration does not assign users to the role.
- [x] Teacher API mode uses the real endpoint and returns only active assigned class/section aggregates; a separate permission and Teacher-role check are required.
- [x] Missing or ambiguous active teacher profiles are denied; no-session counts are null rather than fabricated zeros.
- [ ] Product approves or revises the proposed feature and data boundary for each remaining user type before implementation.

## Test plan
- Backend: tenant-scoped aggregate, school-local date, active-school context, and distinct permission tests
- Backend: teacher profile uniqueness, Teacher role/permission denial, assignment-only SQL scope, no-session semantics, and no student identifiers
- Frontend: response validation, role-specific endpoint selection, and KPI rendering tests

## Open questions
- Do the proposed initial features match the intended MVP for each user type? Which should be removed or changed?
- What refresh behavior is required for daily role dashboards?
- Are any caching or freshness guarantees required for non-real-time metrics?

---

# 6) Reports and exports

**Status:** Partially approved — school-administrator attendance summary, daily breakdown, and client-generated aggregate CSV only; other report types and server-generated exports remain Draft
**Owner:** Product + backend + frontend
**Target release:** Phase 5

## Problem and user outcome

Schools need reports for attendance, performance, finance, and class activity. The first approved report slice is an aggregate attendance summary for closed sessions in a selected date range.

## Personas and authorization

| Persona / backend role | Scope | Allowed actions | Denied actions |
|---|---|---|---|
| School Admin | Active school from authenticated session | Read aggregate counts for closed attendance sessions | Cross-school or student-level report access |
| Teacher | Assigned data | Not approved in this slice | School-wide reports |

## Scope

### In scope
- `GET /api/v1/reports/attendance?fromDate=YYYY-MM-DD&toDate=YYYY-MM-DD`, requiring `reports.read` and deriving school scope from authenticated active-school context.
- Inclusive calendar-date range across closed attendance sessions, returning aggregate counts for present, absent, late, and excused statuses plus total closed sessions and records.
- A chronological per-day breakdown for dates with closed sessions, with the same aggregate counts and no class, section, student, or guardian identifiers.
- API-mode report UI for selecting a date range and viewing only those aggregate counts.
- Downloading the currently displayed summary and daily breakdown as a UTF-8 CSV with date range, session and record totals, and status counts.
- CSV generation in the frontend from the API response; no export endpoint, server-side file creation, or server retention. The downloaded copy is under the user's device/browser retention controls.

### Out of scope
- Custom report builder
- Multi-school consolidated reporting
- Student-level details, PDF exports, performance/finance reports, and teacher-specific reports.

## API contract

| Method and path | Auth/context | Permission | Request | Response | Errors |
|---|---|---|---|---|---|
| `GET /api/v1/reports/attendance` | Cookie auth + active school from session | `reports.read` | Required inclusive `fromDate` and `toDate` calendar dates | Aggregate `AttendanceReport`; no student identifiers | 400/401/403 |

The approved wire schema is [attendance-report.openapi.yaml](../api-contracts/attendance-report.openapi.yaml). The CSV is generated from this response in the frontend; export endpoints and `reports.export` are not implemented or approved in this slice.
Deploy the backend response change before the frontend because the API adapter requires `dailyBreakdown`.

## Data and privacy
- The report is school-scoped, contains no student/guardian identifiers, and includes only closed sessions.

## Acceptance criteria
- [x] The aggregate report requires `reports.read` and derives tenant scope from the authenticated active-school context.
- [x] The report includes only closed sessions and contains no student-level data.
- [x] Date-range validation and API/UI errors are surfaced without mock fallback.
- [x] The displayed aggregate can be downloaded as a CSV; no export file is retained by the server.
- [x] The report includes chronological per-day counts that reconcile with the date-range totals and expose no entity identifiers.
- [ ] Approve additional report types, PDF export, and any server-side export retention separately.

## Test plan
- Backend tenant/permission and aggregate-payload tests
- Frontend date-range and API response/rendering tests

## Open questions
- Which additional report types should be approved next?
- Define academic assignment/submission workflows separately; they are not covered by this report slice.

**Implementation approval (2026-11-12):** The user asked to implement the next checklist item and delegated a pragmatic choice when unavailable to answer a scope question. The selected narrow slice adds a per-day aggregate breakdown to the existing school-admin attendance report; it reuses `reports.read`, the active-school tenant context, and closed-session scope, and adds no schema or migration changes. The CSV includes this breakdown and is created in the browser. Other report types, PDF export, and server-side retention remain unapproved.

---

# 7) Announcements and communications

**Status:** Conservative first slice implemented — in-app, school-wide announcements only; audience and read-state features remain out of scope
**Owner:** Product + backend + frontend
**Target release:** TBD

## Problem and user outcome

Schools need a communication channel for announcements, notices, and user messages without inventing unsupported broad messaging features.

## Personas and authorization

| Persona / backend role | Scope | Allowed actions | Denied actions |
|---|---|---|---|
| School Admin | Active school from authenticated session | Read, draft, and publish a school-wide announcement | Publish to another school or platform |
| Principal/Teacher | Active school from authenticated session | Read published school-wide announcements | Draft or publish; class-targeted publishing |
| Parent/Student | Household / own account | No announcement access until identity links and audience policy are defined | View announcements outside an explicitly authorized audience |

## Scope

### Implemented conservative first slice
- School Admin creates a draft and explicitly publishes an in-app, school-wide announcement.
- School Admin, Principal, and Teacher roles receive `announcements.read`; only School Admin receives `announcements.manage`.
- Users with `announcements.read` can list published announcements for the authenticated active school.
- School scope comes from the authenticated session; the client cannot supply a school ID or arbitrary audience.
- No per-user read receipt, class/household targeting, attachment, or outbound message delivery.

### Out of scope
- Class/household audiences and per-user read state until their authorization and identity links are specified.
- Email, SMS, chat, direct messaging, and campaign infrastructure.
- External CRM integrations

## API contract

The following paths and permission keys are proposals, not implemented routes or grants.

| Method and path | Auth/context | Permission | Request | Response | Errors |
|---|---|---|---|---|---|
| `GET /api/v1/announcements` | Cookie auth + active school | `announcements.read` | No client-selected audience | Published school-wide announcements | 401/403 |
| `GET /api/v1/announcements/manage` | Cookie auth + active school | `announcements.manage` | No client-selected audience | Drafts and published school-wide announcements | 401/403 |
| `POST /api/v1/announcements` | Cookie auth + active school | `announcements.manage` | `{ title, body }` | Draft announcement | 400/401/403 |
| `POST /api/v1/announcements/{id}/publish` | Cookie auth + active school | `announcements.manage` | No body | Published announcement | 401/403/404/409 |

## Data and privacy
- Audience filtering must enforce tenant and access boundaries.
- Announcement content should not be logged in plain text when not required.

## Acceptance criteria
- [x] An authorized school administrator can create and publish a school-wide in-app announcement.
- [x] List results are restricted to published announcements in the active school; the management list requires `announcements.manage`.
- [x] Users without the required permission cannot create or publish announcements.
- [x] API and UI errors are explicit; no mock notification or read-state fallback is represented as live data.

## Test plan
- Backend audience-scoping tests
- Frontend notice list rendering and empty states

## Deferred decisions

- Read receipts and class/household audiences require identity links and an approved object-access policy.
- Email, SMS, attachments, moderation, and outbound delivery are not included in this slice.

---

# 8) Finance and fee workflows

**Status:** Draft — no finance behavior approved; payment, invoice, and reconciliation policy must be decided first
**Owner:** Product + backend + finance/security
**Target release:** TBD

## Problem and user outcome

Schools need a finance workflow for fees, invoices, and payment status, but this remains outside the currently approved release scope.

## Personas and authorization

| Persona / backend role | Scope | Allowed actions | Denied actions |
|---|---|---|---|
| School Admin/Accountant | School-scoped | Manage fee records and payments | Cross-school financial access |
| Parent | Household | Read own invoice/payment state | Edit school fees |

## Scope

### Proposed first slice — requires product and finance approval
- A read-only Accountant dashboard may show aggregate fees due, received, and overdue for the active school.
- No payment initiation, manual payment entry, refund, adjustment, or reconciliation mutation is included until the invoice and payment lifecycle is approved.
- Expose only aggregate totals in the first dashboard; student identifiers, if later needed for reconciliation, require a separate least-data decision.

### Out of scope
- Payment collection or gateway integration until provider, callback verification, idempotency, and reconciliation rules are approved.
- Bank reconciliation, accounting ledger, refunds, discounts, late fees, and cross-school finance.

## API contract

No finance endpoint or permission below is implemented or approved. Define the wire contract only after the open finance decisions are resolved.

| Method and path | Auth/context | Permission | Request | Response | Errors |
|---|---|---|---|---|---|
| `GET /api/v1/finance/summary` (candidate) | Cookie auth + active school | Candidate `finance.dashboard.read` | No student identifiers or client-supplied school ID | Aggregate due/received/overdue totals, once definitions are approved | 400/401/403 |

## Data and privacy
- Financial and payment data is highly sensitive and requires strict tenant isolation.
- Payment events should be auditable and redacted in logs.

## Acceptance criteria
- [ ] Finance definitions, currency/rounding rules, as-of date, and overdue calculation are approved.
- [ ] Any released finance endpoint is active-school scoped and denies unauthorized roles at the backend.
- [ ] No payment mutation is available before the payment lifecycle and audit requirements are approved.
- [ ] API-mode UI displays only server-returned finance data and never uses mock amounts.

## Test plan
- Backend permission and isolation tests
- Finance UI flow review

## Open questions
- Is the first release limited to a read-only summary, invoice/status tracking, or payment collection?
- What defines due, received, overdue, partial, waived, refunded, and disputed amounts?
- Which currency and rounding policy apply per school?
- Which provider and verified event/reconciliation flow are required if collection is approved?
- Which minimum student identifiers may an Accountant see, and which actions must be audited?

---

# 9) Documents and files

**Status:** Draft — blocked on storage, document-classification, retention, and access-policy decisions
**Owner:** Product + backend + security
**Target release:** TBD

## Problem and user outcome

Schools need document storage and retrieval for student files, admissions, and administrative records.

## Personas and authorization

| Persona / backend role | Scope | Allowed actions | Denied actions |
|---|---|---|---|
| School Admin | Active school | Candidate: upload/read approved school documents, subject to the selected document class | Cross-school document access |
| Teacher | Assigned records | No access in the proposed first slice | Browse school-wide or unrelated student documents |
| Parent | Linked children | No access in the proposed first slice | Access unrelated school files |

## Scope

### Proposed first slice — requires approval
- Private upload and authorized download of one explicitly approved document class for an active-school record.
- Store file metadata and a private object reference; return no public or guessable object-store URL.
- Authorize every upload/download against the active school and the linked record before contacting storage.
- Select the document class and authorized roles before defining an endpoint or enabling API-mode UI.

### Out of scope
- Public links, arbitrary file sharing, and access based only on possession of a URL.
- Parent/teacher access until linked-record rules and document categories are approved.
- Provider-specific implementation until a provider and region/retention policy are selected.
- Full malware sandboxing beyond the initial approved upload controls.

## API contract

No file route or permission is implemented or approved. Treat these as contract topics, not callable API paths; select the provider and object lifecycle first.

| Method and path | Auth/context | Permission | Request | Response | Errors |
|---|---|---|---|---|---|
| Upload/download routes | Cookie auth + active school | Candidate `files.upload` / `files.read` | To be specified after provider and document class are approved | Private metadata/reference or authorized stream | To be specified |

## Data and privacy
- File storage must be tenant isolated and access-controlled.
- Document retention, deletion, and access logs need to be defined.

## Acceptance criteria
- [ ] Provider, region, retention/deletion, maximum size/type, and approved document categories are documented.
- [ ] Upload and download authorization is checked server-side against the active school and linked record.
- [ ] No public object URL or cross-school file reference is returned.
- [ ] Failure states do not expose storage credentials, object keys, or document contents in logs.

## Test plan
- Backend permission and storage access tests
- Frontend upload and download behavior tests

## Open questions
- Which private storage provider and deployment region are approved?
- Which document types are in v1, and who may upload, read, replace, and delete each type?
- What are the retention, legal hold, deletion, size/type validation, and malware-scanning requirements?
- Are uploads synchronous, signed-upload, or proxied through the API? What are the expiry and revocation semantics?

---

# 10) Platform administration and global school management

**Status:** Implemented — dedicated platform-only login/session and audited read-only school directory; broader platform powers and production provisioning hardening remain open
**Owner:** Product + platform/backend
**Target release:** TBD

## Problem and user outcome

A platform-level administrative layer may be needed for global school onboarding, tenant configuration, and super-admin workflows, but this is not part of the current school-scoped flow.

## Personas and authorization

| Persona / backend role | Scope | Allowed actions | Denied actions |
|---|---|---|---|
| Platform Super Admin | Dedicated platform session, with no active school | Proposed first slice: read approved school directory metadata | School-scoped data access, impersonation, or school switching |
| School Admin | School-scoped | Manage only their school | Platform-level tenant administration |

## Scope

### Implemented first slice
- A dedicated `PlatformAdminGrant` establishes platform authority; a school role named Super Admin never grants platform access.
- Platform login requires an active user and grant, no active school memberships, and issues a platform-scoped session with only `platform.schools.read`.
- Login, session restore, refresh, and protected requests revalidate the grant. Revoked grants invalidate platform requests and refresh.
- `GET /api/v1/platform/schools` returns only `id`, `name`, `code`, `isActive`, and `createdAt`, ordered by name; each read is audited and marked `Cache-Control: no-store`.
- Platform sessions cannot list/select school memberships, switch schools, impersonate users, or access school-scoped records.
- Local/bootstrap provisioning uses separate `SEED_PLATFORM_ADMIN_EMAIL` and `SEED_PLATFORM_ADMIN_PASSWORD` values. It creates a new dedicated account only; it fails rather than elevating an existing account or restoring a revoked grant.
- School creation, onboarding, suspension, grant administration UI, and global settings are separate follow-on capabilities requiring lifecycle and audit decisions.

### Out of scope
- Local school admin impersonation or cross-school switching from the platform session
- School runtime features that are not separately approved

## API contract

| Method and path | Auth/context | Permission | Request | Response | Errors |
|---|---|---|---|---|---|
| `GET /api/v1/platform/schools` | Dedicated platform session only | `platform.schools.read` | No query parameters | Array of school `id`, `name`, `code`, `isActive`, and `createdAt` | 401/403 |

The active wire contract is in [platform-schools.openapi.yaml](../api-contracts/platform-schools.openapi.yaml). No filters, pagination, school switching, or school lifecycle mutations are exposed.

## Data and privacy
- Platform administration is logically separate from school-scoped records.
- Platform scope comes from the dedicated grant table and is never inferred from school role or client-supplied permissions.
- Active platform accounts cannot be linked as school staff; this preserves the dedicated platform identity boundary.
- The frontend exposes the directory only when the server session includes `platform.schools.read`. Backend guards remain authoritative.
- No platform account has been provisioned in this change; an operator must supply dedicated bootstrap credentials through local/secure deployment environment configuration.
- MFA, recovery, production grant provisioning/revocation workflow, and break-glass controls have not been implemented; this slice is not a production-readiness claim.

## Acceptance criteria
- [x] Platform authentication, dedicated grant source, exact permission, and platform session representation are implemented for the read-only first slice.
- [x] Platform requests have no active school context and cannot access school-scoped records.
- [x] School users cannot call platform endpoints, and platform sessions cannot switch into a school session.
- [x] Directory output contains only the approved school metadata and every read is audited.

## Test plan
- Platform-only session and permission tests
- Cross-tenant access rejection tests

## Open questions
- What identity, MFA/recovery, production grant provisioning, revocation, and break-glass controls are required before production use?
- Which school lifecycle mutations are needed after read-only listing?

---

## Approval gate for implementation

The 2026-11-13 product decision approves the remaining Phase 5 areas for prioritization, but does not approve any unresolved feature details. The candidate routes and permission keys above do not authorize implementation. Each item must be turned into an implementation-ready feature spec before code work begins. The implementation-ready spec must include:

- Business user story and non-goals
- Clear role matrix and tenant scope
- API DTOs and permissions
- Frontend behavior and error handling
- Acceptance tests and authorization checks
- Rollout and rollback plan

A feature can move from Draft to Approved only when the product owner and the engineering leads agree on the above.
