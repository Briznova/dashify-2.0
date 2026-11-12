# Phase 5 Proposed Feature Specs

**Status:** Proposal set; only explicitly identified slices are approved for implementation
**Last updated:** 2026-11-12
**Source of truth:** [execution checklist](./00-execution-checklist.md), [execution roadmap](./00-execution-roadmap.md), and [backend capability backlog](./05-backend-capability-backlog.md)

This file captures the Phase 5 backlog as proposal specs. The repo requires an individual feature approval and implementation-ready spec before any backend/frontend work starts. Approval applies only to slices explicitly marked below; it does not approve every item or the full Phase 5 backlog.

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

---

# 1) Student edit and guardian lifecycle

**Status:** Draft
**Owner:** Product + backend + frontend
**Target release:** TBD

## Problem and user outcome

School staff need to update a student record and reconcile guardian relationships without breaking the student roster or parent access.

## Personas and authorization

| Persona / backend role | Scope | Allowed actions | Denied actions |
|---|---|---|---|
| School Admin | School-scoped | Create, edit student details, manage guardians, archive/reinstate | Cross-school mutation |
| Teacher | School-scoped | Read student roster and guardian-linked contact visibility only if allowed | Edit student/guardian records |
| Parent/Guardian | Owned student records only | Read own student records if linked | Update another household record |

Frontend visibility is UX only; backend authorization is authoritative.

## Scope

### In scope
- Update student profile metadata
- Add/update/remove guardian links
- Enforce primary/secondary guardian semantics
- Maintain active-school scoping
- Validate API request payloads and user permissions

### Out of scope
- Full student lifecycle management beyond edit/archive flow
- Parent self-service registration
- Complex document or consent workflows

## API contract

| Method and path | Auth/context | Permission | Request | Response | Errors |
|---|---|---|---|---|---|
| `PATCH /api/v1/students/:id` | Cookie auth + active school | `students.update` | Partial student + guardian payload | Updated student model | 400/401/403/404 |
| `GET /api/v1/students/:id` | Cookie auth + active school | `students.read` | Query params | Student detail | 401/403/404 |

## Data and privacy
- Student and guardian records stay within the active school tenant.
- Guardian contact data is sensitive and must be redacted in logs.
- Update operations should produce audit events for who changed what.

## Acceptance criteria
- [ ] Staff can update a student profile within the selected school.
- [ ] Invalid guardian linkage data is rejected.
- [ ] Cross-school update attempts are denied by the backend.
- [ ] Frontend handles loading/error/success states without mock fallback.

## Test plan
- Backend: unit tests for update DTO validation and tenant scoping
- Frontend: adapter and form tests for edit flow
- Integration: PATCH + verify downstream read result

## Open questions
- Should removed guardians be fully deleted or only unlinked?
- What is the enforcement rule for a single primary guardian?
- Do guardian updates need separate history/audit records?

---

# 2) Staff directory and teacher assignment

**Status:** Draft
**Owner:** Product + backend + frontend
**Target release:** TBD

## Problem and user outcome

Administrators need a staff directory and teacher assignment model that maps teachers to sections and classes.

## Personas and authorization

| Persona / backend role | Scope | Allowed actions | Denied actions |
|---|---|---|---|
| School Admin | School-scoped | Read/list/create staff, assign teachers | Cross-school staff edits |
| Principal | School-scoped | Read/manage teacher assignments | Platform-level global admin |
| Teacher | School-scoped | Read own assignment and class data | Manage team assignments |

## Scope

### In scope
- Staff profile creation and viewing
- Teacher assignment to class/section
- School-scoped teacher directory

### Out of scope
- Platform-wide staff administration
- Payroll or HR workflows
- Teacher evaluation and performance scoring

## API contract

| Method and path | Auth/context | Permission | Request | Response | Errors |
|---|---|---|---|---|---|
| `GET /api/v1/staff` | Cookie auth + active school | `staff.read` | Optional filters | Staff list | 401/403 |
| `POST /api/v1/staff` | Cookie auth + active school | `staff.manage` | Create staff payload | Staff record | 400/401/403 |
| `GET /api/v1/teacher-assignments` | Cookie auth + active school | `staff.read` | Class/section filters | Assignments | 401/403 |
| `POST /api/v1/teacher-assignments` | Cookie auth + active school | `staff.manage` | Teacher assignment payload | Assignment record | 400/401/403 |

## Data and privacy
- Staff records are school-scoped and require tenant isolation.
- PII such as personal contact details must be limited to authorized roles.

## Acceptance criteria
- [ ] School admin can create and list staff for the selected school.
- [ ] Teacher assignment changes are reflected in the roster and filtered views.
- [ ] Cross-school assignment attempts are denied.

## Test plan
- Backend permission tests and DTO validation
- Frontend route and directory view integration tests

## Open questions
- Is teacher assignment one-to-many or many-to-many by section?
- Does staff profile include personal or employment metadata beyond assignment?

---

# 3) Academic structure management

**Status:** Draft overall; class/section creation slice approved
**Owner:** Product + backend + frontend
**Target release:** TBD

## Problem and user outcome

Schools need durable academic-year, class, and section definitions that can be used across student and teacher workflows.

## Personas and authorization

| Persona / backend role | Scope | Allowed actions | Denied actions |
|---|---|---|---|
| School Admin | School-scoped | Create/edit class, section, year data | Global cross-school editing |
| Teacher | School-scoped | Read class/section roster and metadata | Manage academic structure |

## Scope

### In scope
- Academic year setup
- Class and section definitions
- Read and update flows for core academic structure

### Out of scope
- Timetable optimization algorithms
- Scheduling conflict resolution across campuses

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

## API contract

| Method and path | Auth/context | Permission | Request | Response | Errors |
|---|---|---|---|---|---|
| `GET /api/v1/academic-years` | Cookie auth + active school | `academic.read` | Optional filters | Years | 401/403 |
| `POST /api/v1/classes` | Cookie auth + active school | `academic.manage` | Class payload | Class record | 400/401/403 |
| `POST /api/v1/sections` | Cookie auth + active school | `academic.manage` | Section payload | Section record | 400/401/403 |

## Data and privacy
- School academic data is tenant-bound.
- Audit changes to year/section assignments.

## Acceptance criteria
- [ ] Academic data can be created and read within the correct school tenant.
- [ ] Section/class names cannot collide in a way that breaks rosters.
- [ ] Unauthorized role attempts are denied.

## Test plan
- Backend CRUD and permission tests
- Frontend forms for class/section creation

## Open questions
- Is the plan single-campus or multi-campus?
- Are classes and sections immutable after a term begins?

---

# 4) Attendance workflow and rollups

**Status:** Draft
**Owner:** Product + backend + frontend
**Target release:** TBD

## Problem and user outcome

Teachers need a reliable attendance workflow from daily sessions to corrected absence entries and rollups.

## Personas and authorization

| Persona / backend role | Scope | Allowed actions | Denied actions |
|---|---|---|---|
| Teacher | Assigned class/section | Mark and correct attendance | Edit unrelated rosters |
| School Admin | School-scoped | Manage attendance policy and audit history | Cross-school changes |

## Scope

### In scope
- Attendance session creation
- Student marking and correction
- Daily summary and statuses

### Out of scope
- Automatic attendance compliance reporting
- Parent SMS notifications

## API contract

| Method and path | Auth/context | Permission | Request | Response | Errors |
|---|---|---|---|---|---|
| `POST /api/v1/attendance/sessions` | Cookie auth + active school | `attendance.manage` | Session payload | Session record | 400/401/403 |
| `POST /api/v1/attendance/marks` | Cookie auth + active school | `attendance.manage` | Mark payload | Student attendance status | 400/401/403 |
| `GET /api/v1/attendance/reports` | Cookie auth + active school | `attendance.read` | Filters/date range | Aggregated summary | 401/403 |

## Data and privacy
- Daily, per-student absence and status records are sensitive.
- Correction events need audit trails.

## Acceptance criteria
- [ ] Teachers can mark attendance only within assigned sections.
- [ ] Corrections are visible with timestamps and reasons.
- [ ] School admin can review attendance summaries by period.

## Test plan
- Backend tenant and permissions tests
- Frontend attendance entry flow
- Report-generation smoke tests

## Open questions
- Is absence status limited to present/absent/late or richer codes?
- What timezone behavior should be used for daily rollups?

---

# 5) Dashboard and role-based metrics

**Status:** Partially approved — school-administrator current-count slice approved; remaining roles and metrics remain Draft
**Owner:** Product + frontend + backend
**Target release:** Phase 5

## Problem and user outcome

Users need role-based dashboards with the right metrics and no mock data dependency. The first approved vertical slice is limited to current counts for school administrators.

## Personas and authorization

| Persona / backend role | Scope | Allowed actions | Denied actions |
|---|---|---|---|
| School Admin | Active school from authenticated session | Read current active student, staff, class, and section counts | Cross-school dashboard access |
| Teacher | Assigned class | Not approved in this slice | School-wide admin metrics |
| Parent | Household | Not approved in this slice | School-wide analytics |

## Scope

### In scope
- `GET /api/v1/dashboard`, requiring `dashboard.read`; derive tenant from authenticated active-school context and do not accept role/school filters from the client.
- Current counts of active students, active staff profiles, active classes, and active sections belonging to active classes.
- API-mode school-admin KPI cards backed by the endpoint; no mock panels or fabricated trends.

### Out of scope
- Custom report-builder UI
- Real-time analytics ingestion or streaming
- Teacher, parent, principal, and platform dashboards; attendance/finance aggregates; trends, periods, and caching policy.

## API contract

| Method and path | Auth/context | Permission | Request | Response | Errors |
|---|---|---|---|---|---|
| `GET /api/v1/dashboard` | Cookie auth + active school from session | `dashboard.read` | No query parameters | `SchoolAdminDashboard`: `schoolId`, `schoolName`, and four non-negative active counts | 400/401/403/404 |

The approved wire schema is [dashboard.openapi.yaml](../api-contracts/dashboard.openapi.yaml).

## Data and privacy
- Dashboards must not expose school-wide data outside the user’s scope.
- Metrics should be computed server-side to avoid client leakage.

## Acceptance criteria
- [x] School administrators see only the four approved current counts for their active school.
- [x] Dashboard counts are backed by server-side aggregates inside the active-school tenant context.
- [x] API-mode dashboard does not fall back to mock operational panels or trends.
- [ ] Define and approve teacher, parent, principal, and platform dashboard scopes separately.

## Test plan
- Backend aggregate tests
- Frontend role-specific rendering tests

## Open questions
- What additional KPIs, if any, are required for subsequent role-specific slices?
- Are there caching or refresh policies for non-real-time metrics?

---

# 6) Reports and exports

**Status:** Partially approved — school-administrator attendance summary only; other report types and exports remain Draft
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
- API-mode report UI for selecting a date range and viewing only those aggregate counts.

### Out of scope
- Custom report builder
- Multi-school consolidated reporting
- Student-level details, CSV/PDF exports, performance/finance reports, and teacher-specific reports.

## API contract

| Method and path | Auth/context | Permission | Request | Response | Errors |
|---|---|---|---|---|---|
| `GET /api/v1/reports/attendance` | Cookie auth + active school from session | `reports.read` | Required inclusive `fromDate` and `toDate` calendar dates | Aggregate `AttendanceReport`; no student identifiers | 400/401/403 |

The approved wire schema is [attendance-report.openapi.yaml](../api-contracts/attendance-report.openapi.yaml). Export endpoints and `reports.export` are not implemented or approved in this slice.

## Data and privacy
- The report is school-scoped, contains no student/guardian identifiers, and includes only closed sessions.

## Acceptance criteria
- [x] The aggregate report requires `reports.read` and derives tenant scope from the authenticated active-school context.
- [x] The report includes only closed sessions and contains no student-level data.
- [x] Date-range validation and API/UI errors are surfaced without mock fallback.
- [ ] Approve report types, export formats/retention, and teacher-scoped reports separately.

## Test plan
- Backend tenant/permission and aggregate-payload tests
- Frontend date-range and API response/rendering tests

## Open questions
- Which additional report types and export formats should be approved next?
- Define academic assignment/submission workflows separately; they are not covered by this report slice.

---

# 7) Announcements and communications

**Status:** Draft
**Owner:** Product + backend + frontend
**Target release:** TBD

## Problem and user outcome

Schools need a communication channel for announcements, notices, and user messages without inventing unsupported broad messaging features.

## Personas and authorization

| Persona / backend role | Scope | Allowed actions | Denied actions |
|---|---|---|---|
| School Admin | School-scoped | Create and send announcements | Platform-wide publishing |
| Teacher | Assigned group/class | Post class-specific notices | Broadcast school-wide messages |
| Parent/Student | Household or class audience | Read relevant notices | See unrelated announcements |

## Scope

### In scope
- Announcement creation and read state
- Audience targeting by school, class, or household

### Out of scope
- Chat, direct messaging, or email campaign infrastructure
- External CRM integrations

## API contract

| Method and path | Auth/context | Permission | Request | Response | Errors |
|---|---|---|---|---|---|
| `GET /api/v1/announcements` | Cookie auth + active school | `announcements.read` | Audience filters | Announcement list | 401/403 |
| `POST /api/v1/announcements` | Cookie auth + active school | `announcements.manage` | Create payload | Announcement record | 400/401/403 |

## Data and privacy
- Audience filtering must enforce tenant and access boundaries.
- Announcement content should not be logged in plain text when not required.

## Acceptance criteria
- [ ] Users only receive announcements for their authorized audience.
- [ ] Announcement creation is restricted to permitted roles.
- [ ] Read state and read/unread counts are persisted correctly.

## Test plan
- Backend audience-scoping tests
- Frontend notice list rendering and empty states

## Open questions
- Which communication channels are in scope: in-app only or email/SMS too?
- Are announcement authoring and read receipts required in v1?

---

# 8) Finance and fee workflows

**Status:** Draft
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

### In scope
- Fee structures and invoice generation
- Payment status and reconciliations

### Out of scope
- External payment gateway integration
- Bank reconciliation and accounting ledger expansion

## API contract

| Method and path | Auth/context | Permission | Request | Response | Errors |
|---|---|---|---|---|---|
| `GET /api/v1/fees` | Cookie auth + active school | `finance.read` | Filters | Fee list | 401/403 |
| `POST /api/v1/fees/payments` | Cookie auth + active school | `finance.manage` | Payment payload | Payment record | 400/401/403 |

## Data and privacy
- Financial and payment data is highly sensitive and requires strict tenant isolation.
- Payment events should be auditable and redacted in logs.

## Acceptance criteria
- [ ] Fee records are school-scoped and not visible across tenants.
- [ ] Payment status updates are traced and authorized.
- [ ] UI does not expose financial records to unauthorized roles.

## Test plan
- Backend permission and isolation tests
- Finance UI flow review

## Open questions
- Which payment provider is required?
- Is v1 limited to invoices and status tracking versus payment collection?

---

# 9) Documents and files

**Status:** Draft
**Owner:** Product + backend + security
**Target release:** TBD

## Problem and user outcome

Schools need document storage and retrieval for student files, admissions, and administrative records.

## Personas and authorization

| Persona / backend role | Scope | Allowed actions | Denied actions |
|---|---|---|---|
| School Admin | School-scoped | Upload/manage school docs | Cross-school document access |
| Teacher | Assigned records | View student docs if authorized | Browse all school documents |
| Parent | Household | Read own child documents | Access unrelated school files |

## Scope

### In scope
- Upload, metadata, and document access rules
- Storage authorization and expiry policy

### Out of scope
- Full content scanning or malware sandboxing beyond initial policy
- Multi-tenant external object storage integration details

## API contract

| Method and path | Auth/context | Permission | Request | Response | Errors |
|---|---|---|---|---|---|
| `POST /api/v1/files/upload` | Cookie auth + active school | `files.upload` | File metadata and binary | File reference | 400/401/403 |
| `GET /api/v1/files/:id` | Cookie auth + active school | `files.read` | None | File metadata or stream | 401/403/404 |

## Data and privacy
- File storage must be tenant isolated and access-controlled.
- Document retention, deletion, and access logs need to be defined.

## Acceptance criteria
- [ ] Documents are only downloadable by authorized roles.
- [ ] File references cannot cross school boundaries.
- [ ] Upload failures and permission errors are handled carefully.

## Test plan
- Backend permission and storage access tests
- Frontend upload and download behavior tests

## Open questions
- Which storage provider is approved for v1?
- What types of documents require approval or redaction rules?

---

# 10) Platform administration and global school management

**Status:** Draft
**Owner:** Product + platform/backend
**Target release:** TBD

## Problem and user outcome

A platform-level administrative layer may be needed for global school onboarding, tenant configuration, and super-admin workflows, but this is not part of the current school-scoped flow.

## Personas and authorization

| Persona / backend role | Scope | Allowed actions | Denied actions |
|---|---|---|---|
| Platform Super Admin | Platform-scope | Manage schools, platform users, global settings | School-scoped data mutation without platform context |
| School Admin | School-scoped | Manage only their school | Platform-level tenant administration |

## Scope

### In scope
- Platform-owned school directory and onboarding
- Global platform permission model
- Tenant isolation and platform session separation

### Out of scope
- Local school admin impersonation or cross-school switching from the platform session
- School runtime features that are not separately approved

## API contract

| Method and path | Auth/context | Permission | Request | Response | Errors |
|---|---|---|---|---|---|
| `GET /api/v1/platform/schools` | Platform session only | `platform.schools.read` | Filters | School list | 401/403 |
| `POST /api/v1/platform/schools` | Platform session only | `platform.schools.manage` | Create school payload | School record | 400/401/403 |

## Data and privacy
- Platform administration is logically separate from school-scoped records.
- Platform session authentication and tenant boundaries must remain isolated.

## Acceptance criteria
- [ ] Platform admin can manage schools only from the platform role context.
- [ ] School admins cannot switch into other schools without approved tenant selection.
- [ ] Platform and school sessions remain separate and auditable.

## Test plan
- Platform-only session and permission tests
- Cross-tenant access rejection tests

## Open questions
- Is platform-school administration part of the next release or a later milestone?
- Does the product want a dedicated platform workspace outside the school flow?

---

## Approval gate for implementation

No Phase 5 backlog item is approved by default. Each item above should be turned into an implementation-ready feature spec before code work begins. The implementation-ready spec must include:

- Business user story and non-goals
- Clear role matrix and tenant scope
- API DTOs and permissions
- Frontend behavior and error handling
- Acceptance tests and authorization checks
- Rollout and rollback plan

A feature can move from Draft to Approved only when the product owner and the engineering leads agree on the above.
