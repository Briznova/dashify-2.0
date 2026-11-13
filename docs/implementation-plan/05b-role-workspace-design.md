# Role Workspace and Navigation Design

**Status:** Proposal — not an implementation-ready feature specification

**Last updated:** 2026-11-13

**Related:** [Access and workspace spec](./03-access-and-workspace-spec.md), [Phase 5 proposed specs](./05a-phase5-proposed-specs.md), [execution checklist](./00-execution-checklist.md)

## Purpose and status

Describe the intended navigation and page functionality for each user type,
including the requested Super Admin school setup and CSV import capabilities.
This is a product design, not approval of unresolved contracts, permissions,
tenant access, finance, or account-provisioning behavior. Existing approved
slices remain governed by their feature specs and API contracts. Proposed items
must remain hidden in API mode until their endpoint, permissions, scope, and
frontend integration are ready.

The current platform session supports only a read-only school directory. The
requested setup and import functionality would extend that boundary through
separately approved, explicitly school-targeted platform operations; this
proposal does not authorize school switching, impersonation, or unrestricted
access to school records.

## Super Admin — platform and school setup

| Navigation item | Intended page functionality | Status |
|---|---|---|
| Overview / Schools | View the school directory and basic school metadata and status. | Read-only directory implemented. |
| School setup | Create a school, configure its details, academic years, classes and sections, provision its initial School Admin, and track setup progress. | Proposed; initial account setup requires a separate credential/invitation decision. |
| Bulk import | Download CSV templates and import school setup data into a selected school. | Proposed; detailed workflow below. |
| Import history | Review import jobs, outcomes and row-level errors for authorized school setup operations. | Proposed; retention and access rules undecided. |
| Platform access | Manage platform administrators and security controls. | Proposed; MFA, recovery and grant lifecycle undecided. |

### Proposed CSV school setup workflow

1. Select the target school and data type and download the applicable template.
2. Upload a CSV and validate its structure, fields, duplicates, and related
   school-scoped records. Show a preview and actionable row-level errors.
3. Allow the operator to correct errors and explicitly confirm the import.
4. Show processing status, results, errors and an auditable import history.

Candidate data types include academic years, classes, sections, students,
guardians, staff profiles, enrollments, and teacher assignments. Related records
must be validated against the explicitly selected school; dependencies between
imports need to be described in the approved design. CSV uploads do not create
login credentials by default; invitations and account setup are a separate
decision.

**Decisions required before implementation:** authorized platform permissions
and data access, template fields and identifiers, existing-record and duplicate
handling, all-or-nothing versus partial imports, retry/idempotency and concurrent
changes, file size and encoding limits, job execution, error visibility, audit
detail, and file/result retention. School setup must have server-side tenant
checks and tests for unauthorized and cross-school operations.

## School Admin — active school

| Navigation item | Intended page functionality | Status |
|---|---|---|
| Overview | Show current active student, staff, class and section counts. | Implemented. |
| Students | List, add and edit students and manage guardian links. | Implemented within the existing student slice. |
| Staff | Create, edit and deactivate profiles and link an existing account as Teacher. | Implemented; account creation and invitations are proposed separately. |
| Classes | View and create classes and sections; manage teacher assignments. | Class/section creation and assignment APIs implemented; broader lifecycle remains proposed. |
| Attendance | Create sessions, mark attendance and close sessions. | Implemented; correction with a reason and audit history is proposed. |
| Reports | Review closed-session attendance totals and daily breakdown, and download the displayed aggregate CSV. | Implemented; other reports and PDF are proposed. |
| Announcements | Draft and publish school-wide notices. | Implemented. |
| Settings | View and update school settings when permitted. | Implemented within the school profile slice. |
| Fees / Documents | Manage approved finance and document workflows. | Proposed; finance and storage/access decisions are required. |

## Principal — active school

| Navigation item | Intended page functionality | Status |
|---|---|---|
| Overview | View the school's daily aggregate attendance snapshot. | Implemented with a dedicated permission. |
| Students / Staff / Classes | View authorized school records; no management actions by default. | Visibility and access depend on granted permissions and supported APIs. |
| Attendance | Review attendance and make audited corrections when approved. | Reads depend on permissions; correction workflow is proposed. |
| Reports | Review authorized school reports. | Attendance aggregate report exists; access depends on permission. |
| Announcements | Read published school-wide notices. | Implemented when granted access. |

## Teacher — assigned classes

| Navigation item | Intended page functionality | Status |
|---|---|---|
| My teaching day | View assigned classes and sections, session status and unmarked counts. | Implemented read-only with a linked staff profile and Teacher permission. |
| My classes | View assigned sections and authorized rosters. | Proposed; dedicated assignment-scoped access required. |
| Attendance | Mark attendance only for assigned classes. | Proposed; assignment-scoped write authorization required. |
| Coursework | Create and manage work for assigned classes. | Proposed; workflow and permissions undecided. |
| Announcements | Read published school-wide notices. | Implemented when granted access. |

## Accountant — school finance

| Navigation item | Intended page functionality | Status |
|---|---|---|
| Finance overview | View approved school-level due, received and overdue totals. | Proposed. |
| Fees and invoices | Review fee schedules, invoices and balances. | Proposed. |
| Payments | Record and reconcile payments through audited workflows. | Proposed. |
| Finance reports | View and export authorized financial reports. | Proposed. |

Financial definitions, permissions, transaction lifecycle, payments and
reconciliation require approval before implementation.

## Parent — linked children

| Navigation item | Intended page functionality | Status |
|---|---|---|
| My children | Select a verified linked child and view their permitted profile. | Proposed. |
| Attendance / Learning | View the selected child's attendance, coursework and progress. | Proposed. |
| Notices | Read notices explicitly addressed to the parent or child. | Proposed. |
| Fees | View approved balances and invoices for linked children. | Proposed. |

Verified account-to-child links, object-level authorization, audience policy and
the relevant domain contracts are prerequisites.

## Student — own records

| Navigation item | Intended page functionality | Status |
|---|---|---|
| My learning | View own classes, schedule and learning summary. | Proposed. |
| Coursework | View and submit own assignments. | Proposed. |
| Attendance / Progress | View own attendance and approved results. | Proposed. |
| Notices | Read notices explicitly addressed to the student. | Proposed. |

Student-account linkage, self-scoped APIs, audience policy and the relevant
domain contracts are prerequisites.

## Shared design and delivery rules

- Role workspaces compose shared domain features rather than duplicating data
  and APIs for each role. Keep navigation policy centralized and route files thin.
- Filter navigation and actions by role, available backend permissions and
  implemented integration. Frontend visibility is UX, not authorization.
- The backend derives or validates the relevant platform, school, assignment,
  linked-child or self scope for every operation.
- Provide loading, empty, error and retry states. Do not present mock data as
  live API data.
- For each proposed slice, confirm behavior and scope, document the API and
  permissions, and test success, denial and tenant/object isolation before
  exposing it.
