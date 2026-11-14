# Students directory and records: end-to-end specification

**Status:** Draft overall; directory, read-only profile and student creation slices approved

**Owner:** Product, frontend, backend, and security — to be assigned

**Last updated:** 2026-11-14

**Target release:** To be agreed
**References:** [Execution roadmap](./00-execution-roadmap.md),
[existing student edit scope](./05a-phase5-proposed-specs.md#1-student-edit-and-guardian-lifecycle),
[attendance report contract](../api-contracts/attendance-report.openapi.yaml),
[release and isolation gates](./06-verification-and-release.md)

## 1. Outcome and scope

Give authorized school staff a reliable student directory and a complete,
school-scoped view of a student's identity, guardians, yearly enrolments,
attendance, academic results, finance summaries, and documents. The user's
screenshots are **design references**, not approval of the underlying business
rules, permissions, storage provider, or API contracts. This document proposes
the whole journey and a sequence of independently approved vertical slices; it
does not authorize implementation. On 2026-11-14, the user selected directory,
profile, create and edit as the first slice, with the specific decisions in
section 8. Only the narrower directory search and preview slice in section 6
is approved for implementation; later capabilities require separate approval.

The immediate target is the **School Admin workspace**. Existing access for
other roles must not be silently broadened or removed. Teacher, Principal,
Accountant, Parent, and Student access to individual fields or records requires
separate decisions and object-level authorization. Platform administrators
must not use platform scope to browse school student data.

### Screenshot-to-feature map

| Reference | Intended experience | Dependencies or decisions |
|---|---|---|
| Directory and detail panel | Search, year/class/section/status filters, paged list, selected-student preview, import, add, export, edit and other actions | Server-side query and counts; per-field permissions; separate import/export decisions; roll, fee and attendance data are not currently available from the student API |
| Profile / overview | Personal details, guardian contacts, current enrolment, attendance, fees, recent updates | Explicit current-enrolment semantics; access to attendance/finance/audit; address and parent-portal status need models/contracts; nationality is deferred |
| Academic history | This-school yearly placements, previous-school history, timeline, next-year state and enrolment management | Enrolment lifecycle and historical data models; progression/transfer policies and permissions |
| Records | Enrolment/term selector, attendance history, published academic results, fee summary and downloads | Student-level attendance contract; academic/term and finance domains; report/export permissions and policy |
| Documents | Document checklist, upload, view/download, verification states and a separately confirmed delete | Private storage, category rules, security scanning, retention/deletion, per-document permissions and audit |
| Edit student | Identity and contact edits, photo, status, residential address, current placement and separate enrolment action | User chose editable admission ID/date for School Admin despite the reference showing them locked. Edit contract reconciliation, status and identity policy, address/photo support, and enrolment lifecycle remain necessary. |
| Add student | Create identity, guardian/emergency contact, address and initial yearly enrolment with inline validation and a pre-save checklist | User selected required first/last name and birth date, exactly one primary guardian, required emergency contact with primary-guardian reuse, optional roll, automatic admission ID, enforced capacity, and optional blood group subject to privacy/access approval. Detailed contracts, photo and parent invitations remain open. |

The later Add reference is a separate create screen. Do not copy the
screenshots' illustrative names, contact details, dates, currency amounts,
or other sample data into fixtures or docs.

## 2. Observed implementation baseline

Recheck code and generated OpenAPI before starting any slice. The Phase 4
student slice document is historical and does not describe every later change.

| Area | Currently observed | Gap or caution |
|---|---|---|
| List | `GET /api/v1/students?page=&pageSize=` is retained. The API-mode directory uses `POST /api/v1/students/search` for school-wide search, filters and stable pagination. | No selected-year policy beyond stored active placements, roll, guardian summary or school-wide active count. See the approved S1a contract in section 6. |
| Detail | `GET /api/v1/students/{id}` requires `students.read` and includes guardian links and school-filtered enrolments. The read-only profile displays a placement only when exactly one returned enrolment is marked active. | Guardian details are returned under `students.read`; fine-grained privacy is not yet enforced. The active flag does not establish a selected-year or effective-date policy. |
| Create | `POST /api/v1/students` requires `students.create`, identity, admission date, same-school academic year/class/active section and up to five guardians; a student, guardian links and initial enrolment are created in a tenant transaction. | Existing API accepts zero guardians, but the user now requires at least one for new students. Year status/date rules, primary guardian at creation, duplicate/concurrency handling, and fields shown in screenshots need review. Class/section choices also require academic-structure access. |
| Edit | `PATCH /api/v1/students/{id}` requires `students.update`. An included guardians array replaces the link set, omitted guardians leave links alone, and supplied IDs must already be linked. | The API-mode edit route and profile edit action are currently disabled. The update DTO inherits create-only year/class/section fields and the service spreads submitted profile data into the student update; the frontend form currently sends those fields. Reconcile and integration-test the contract before exposing edit. Existing docs describing API edit as delivered do not prove this UI path works. |
| Archive | `POST /api/v1/students/{id}/archive` requires `students.archive` and changes student status to `ARCHIVED`; no restore operation exists. | No approved archive/withdrawal/reinstatement lifecycle or consequences for historical records. Do not treat archive as deletion or as an enrolment transfer. |
| Enrolments | Student detail includes same-school year and section/class; the model has start/end dates and `isActive`. | No dedicated management endpoint, roll number, previous-school history, progression or transfer lifecycle; no verified uniqueness/overlap rule for a student's placements. |
| Attendance | Class/section sessions and records exist; aggregate reports include closed sessions. | No student-level history/percentage API. `PRESENT`, `ABSENT`, `LATE`, and `EXCUSED` exist; screenshot percentage rules and missing marks require explicit decisions. |
| Results, fees, files | Preview data or schema fragments exist in places. `FileObject` is metadata, not a document service. | No approved student-result or finance contract, and no approved private file lifecycle. Never present mock results, balances, document states or parent access as live data. |
| Security | Student service uses tenant transactions and explicit school predicates; update audit records field names and guardian-link counts. | RLS, least-privilege runtime role, object-level access and two-school isolation remain release gates. Existing create audit includes admission number; review/redact it as part of the privacy work. |

## 3. Actors and proposed authorization

| Actor | Proposed access | Explicit boundary |
|---|---|---|
| School Admin | Active school's students, subject to existing or separately approved action and field permissions | No cross-school records; sensitive finance, documents, bulk import/export and enrolment changes need explicit grants |
| Principal / Teacher | Preserve existing server grants; consider additional read access only after product approval | Teacher access must specify assignment and historical scope; no assumption that a navigation link grants school-wide student access |
| Accountant | Finance-related minimum data only if separately approved | No automatic access to guardians, medical documents or academic records |
| Parent / Student | No new access in this plan until linked-account and object-level authorization are approved | Cannot infer access from matching email, phone, or a frontend role |
| Platform Super Admin | Existing platform-only operations | No student records, import, impersonation, or school switching through platform scope |

The server derives the tenant from the authenticated active-school session and
checks the operation permission and relevant object/field policy on **every**
request. `students.read`, `students.create`, `students.update`, and
`students.archive` are existing keys; any new keys below are candidates, not
existing grants. Decide separately whether `guardians.read` is required for
contact details and phone search. No new permission is automatically granted
merely because a UI action exists. Cookie mutations require the established
Origin/CSRF checks. Invalid or foreign-school IDs must not disclose another
tenant's existence.

## 4. Proposed user experience and behavior

Except for the recorded decisions in section 8, this section is proposed,
including default values and visual details.
Use real API data in API mode; hide or clearly label unavailable capabilities
instead of filling them with preview data.

### 4.1 Directory and preview

- Entry: Students navigation in an authorized school workspace. Header shows
  the selected academic year only when sourced from a defined selector.
  Separate **school-wide active student count** from **filtered matching count**
  and **section count**, and state their exact scope. Never infer school-wide
  totals from a loaded page.
- Search by name and admission number; guardian-phone search requires an
  approved contact-data permission and normalization rules. Use debouncing,
  server-side pagination, a deterministic tie-breaker, and a reset-to-first-page
  policy after filter changes. Filters: academic year, class, section, and
  student status, with a clear Reset action. Define archived visibility before
  adding it to filters.
- Row shows student identity, selected-year placement/roll if available, and
  student status. Fee balance appears only with a separately authorized,
  live finance source; missing data is not zero. Selection opens a detail
  panel without losing filters/page; a full-profile link remains keyboard
  accessible. A narrow viewport uses a full-width panel or accessible drawer,
  with focus restoration on close.
- Preview displays only fields allowed by server policy. Tabs/links for
  attendance, fees, documents, export, and other actions are enabled only when
  their own feature and permission are available. Show loading, empty, retry,
  permission-denied and unavailable states distinctly.

### 4.2 Create and edit

- The Add reference groups **Personal details**, **Parent / guardian**,
  **Residential address**, and **Initial enrolment**, followed by Cancel and
  Create actions. It shows a pre-save checklist, a top-level error summary and
  an inline phone error; the form retains entered data after validation errors.
  At smaller widths the checklist and fields must remain readable and usable.
  Its starred fields and example values are design inputs, not newly approved
  validation rules.
- The reference marks first name, last name and date of birth as required and
  shows optional gender, nationality, blood group and photo. The user confirmed
  that first name, last name and date of birth are required; the current API
  only requires first name. Existing incomplete records must remain readable;
  missing first/last name, birth date and emergency contact must be supplied
  before saving an edit. Define date validation before implementation.
  The user wants blood group planned as optional, **subject to privacy and
  access approval**: do not collect this health datum without an approved
  purpose, access policy and privacy review. Nationality is deferred; decide
  localization separately. Photo upload depends on the separately approved
  private-file lifecycle.
- The reference shows guardian name, relationship and mobile, optional email,
  separate emergency-contact name/mobile and a parent-portal invitation
  checkbox. The user requires an emergency contact and permits reusing the
  primary guardian instead of entering a separate person. A reused contact
  must refer to an actual primary guardian. The user requires exactly one
  primary guardian for every saved record.
  Existing storage splits guardian names and does not model a separate
  emergency contact. Existing records lacking an emergency contact remain
  readable but require one before an edit can be saved. Define the mapping,
  contact validation and phone normalization; do not assume the reference's local
  phone example is a global validation rule. Parent account linkage,
  invitation delivery and consent are separate gated workflows: the checkbox
  must not imply an invitation was sent before those capabilities exist.
- The reference shows admission ID and date, academic year, class, section,
  roll number, student status, an ID availability/suggestion hint, and a
  section-capacity message. Current creation accepts admission ID/date and
  year/class/section, but does not support a roll number, ID sequence,
  configurable initial status, or a verified capacity reservation policy.
  The user selected an **optional roll number**, unique within the selected
  section and academic year while the prior placement is active, and automatic
  admission ID generation in a format configurable by each school. A roll may
  be reused once the prior placement ends. Only School Admin may subsequently
  correct admission ID/date.
  Creation must be rejected when the selected section is full; an unset
  capacity imposes no limit. The selected capacity population is non-archived
  students with active placements in the selected year and section, excluding
  ended or transferred-out placements. New students are always created
  `ACTIVE`. Nationality is deferred. Define the relationship between placement
  state and effective dates, the configurable ID format/sequence and future-dated
  placement handling before implementation. Any availability
  or capacity preview is advisory: revalidate on the server at commit, with
  transactional concurrency protection so concurrent creates cannot exceed
  the approved capacity or generate duplicate IDs/rolls. Do not claim a seat
  has been reserved if that policy is not implemented.
- The Add screenshot shows address fields as required, but the user's
  subsequent explicit decision makes address optional for all students.
  Admissions applications and document uploads after creation are separate
  capabilities and must not be presented as complete by this form.
- Add collects identity, admission information, initial academic year/class/
  section and **at least one guardian** according to the final field policy. Use
  live, tenant-scoped academic-structure options; prevent submission when
  prerequisite structure is unavailable. Save atomically and return the new
  profile. A year filter or selection alone must never create an enrolment.
- School-specific automatic admission-ID configuration is part of the planned
  scope, not an existing capability. Define the allowed format placeholders,
  sequence scope/reset, default or required setup for existing schools,
  authorized configuration workflow, duplicate/correction behavior and audit
  before implementation. Generation must be server-side and unique within the
  school under concurrent creation, including collisions with existing records;
  configuration changes must not rewrite existing IDs.
- The edit reference separates personal and guardian/contact details from a
  read-only yearly placement. The user chose to let **only School Admin** edit
  admission ID and admission date, overriding the locked fields in the
  reference. The server must check active-school School Admin authority as well
  as the approved permission; an equivalent permission held by another role is
  not sufficient. Corrections must be audited and must not silently change
  enrolment history. Decide the exact permission, duplicate/date rules and
  correction effects before changing the current API.
- The user selected residential address for the first slice, following the
  Edit reference's address line, city, state and PIN fields. Address is
  **optional for all students**, overriding the required markers in the
  screenshot. Define storage, localization and validation for partially
  supplied addresses before coding.
- Preserve the existing guardian reconciliation contract unless an approved
  migration changes it: omitted array = unchanged, supplied array = complete
  replacement, and omitted links are unlinked rather than deleting guardians.
  Exactly one primary guardian is required whenever a student
  record is saved, including edits to existing records. Existing students with
  no guardian must remain readable, but a guardian must be added before their
  record can be saved; do not silently backfill or delete existing data.
  Validate the resulting guardian set transactionally, including when
  `guardians` is omitted, and prevent removal of the last guardian or primary
  without choosing a replacement. Decide
  whether sharing guardian identities across siblings is supported. Clarify
  emergency contact and pickup permissions independently from primary contact
  and any parent-portal account.
- Clearly show validation, pending, conflict, save failure, success and
  unsaved-change/cancel behavior. Use an approved optimistic-concurrency policy
  so simultaneous edits do not silently overwrite guardian/contact changes.
  After saving, the directory and detail reflect the persisted server result.
- Photo upload, parent-portal badge and messaging are not implied by a guardian
  contact or a UI mock. Enable each only after its own backend contract exists.

### 4.3 Student status and enrolment history

- Student identity/status is distinct from yearly placement. The profile
  header displays the selected year's placement only when the server can
  establish it; no placement is an explicit state. Academic history lists
  school-owned placements with dates and source, and separates any
  previous-school information from this school's verified records.
- Decide definitions and transitions for active, inactive, archived,
  withdrawn, transferred, graduated and restored states; prevent users from
  treating archive as hard deletion. Separately decide transfer, section
  change, year-end promotion, repeat, withdrawal, reinstatement, roll-number
  uniqueness and historical correction. A new year selector alone never
  promotes or transfers a student.
- Recommended invariants for review: school-scoped references; at most one
  applicable placement for a student on any school day; no silent rewriting
  of prior placement or attendance; explicit effective dates and audit; and
  database-enforced protection against concurrent conflicting changes.
  Existing data must be checked for violations before adding constraints.
- Previous-school outcomes and verification are optional, attributed external
  history, not this school's attendance, finance, or enrolment counts. Their
  source, correction and document-evidence rules need approval.

### 4.4 Records

- Enrollment and term selectors determine the displayed context; term/year
  selection does not mutate records. Attendance shows confirmed/closed records
  and explicitly distinguishes pending sessions, missing marks and no data.
  Agree on calendar dates, school timezone, LATE/EXCUSED treatment, denominator,
  zero-denominator behavior and rounding before displaying a percentage. Do
  not assume “closed” means every student was marked.
- Academic results show only authorized, published results and their assessment
  context; drafts, grading, corrections, publication, terms and report
  downloads need their own approved domain workflow.
- Finance summaries require separately authorized live finance data, approved
  monetary definitions and school currency. Do not equate absence of a finance
  service with a paid/zero balance. Receipt links, payment actions and exports
  are separate approvals.

### 4.5 Documents

- Show a tenant/student-scoped checklist only after document categories,
  required/optional rules and verification authority are approved. “Missing”,
  “uploaded” and “verified” must reflect server state, never filename or UI
  inference. No medical information or other special-category data is
  collected until its purpose, access and safeguards are explicitly approved.
- Private upload/view/download/delete require separate permissions and
  object-level checks. Decide provider/region, upload architecture, server-side
  byte and MIME validation, limits, malware scanning/quarantine, lifecycle,
  encryption, retention/legal hold and deletion semantics before implementation.
  The screenshot's photo limit and document types are examples, not policy.
- Upload must not expose object keys, credentials or public URLs; apply
  authorized short-lived delivery or API streaming per the approved design.
  Confirm irreversible deletion in a separate dialog; define behavior for
  storage/metadata failures and legal holds. Audit actions without contents,
  sensitive filenames or contact details. Accessibility and progress, retry,
  cancelled upload and failed scan states are required.

### 4.6 School Admin import and export

- Product previously removed bulk import from Super Admin. A **School Admin**
  import is a proposed feature, not yet approved. Recommend a versioned school
  template, server-side validation and preview of all rows, with **no writes
  until confirmation**; flag row errors and duplicate admission IDs, including
  duplicates within the file and existing school records.
- Recommend all-or-nothing commit for the first version. Revalidate under a
  transaction at commit, handle conflicts since preview, impose approved file/
  row limits, and use an idempotency strategy to prevent duplicate retries.
  Decide template fields, date/phone formats, missing guardians, placement
  resolution, duplicate policy, row limits and preview expiry. Do not retain
  uploaded files or error reports beyond an approved retention period.
- Export scope, allowed columns (especially guardian and financial data),
  maximum size, audit, retention and authorization require approval. Export
  should reflect all matching authorized rows, not just the current page; CSV
  output must neutralize spreadsheet formulas and use safe encoding/escaping.
  Never log or send imported/exported student rows to analytics.

## 5. Proposed contract and data work

These are **contract candidates, not implemented or approved APIs**. Existing
routes remain authoritative until a reviewed contract and migration replace
them. Before each slice, publish/update its OpenAPI in `docs/api-contracts/`,
with DTOs, response projections, permission rules, errors and examples using
synthetic data only; update the contract baseline.

| Capability | Candidate API / behavior | Request and response decisions before coding |
|---|---|---|
| Directory | Approved S1a uses `POST /api/v1/students/search` under `students.read`; existing GET remains unchanged | See [directory contract](../api-contracts/student-directory.openapi.yaml). No phone search, extra counts or guardian summary in S1a. |
| Student profile | Existing `GET /api/v1/students/{id}` under `students.read` | Define explicit identity, guardian, current placement and history projections and field permissions; return 404 for absent/foreign records. Keep record identity separate from selected-year placement. |
| Create/edit | Existing POST/PATCH routes and existing action permissions | Separate profile fields from placement fields; specify required/nullable/clear semantics, guardian replacement, date validation, uniqueness, concurrency/version conflict and returned enriched view. Preserve compatible callers or introduce an explicit versioned migration. |
| Enrolments | Candidate student-scoped list and explicitly named commands for placement changes | Decide resource shapes, lifecycle commands, year/effective-date/roll constraints, version conflicts, audit and permission keys before choosing paths. Do not implement as generic student PATCH. |
| Attendance | Candidate student/enrolment-scoped read | Specify closed session filter, date range, status breakdown, summary numerator/denominator, missing marks, paging, permissions and error semantics; do not reuse school aggregate totals as student data. |
| Results / fees | Candidate authorized domain-owned read APIs | Define academic publication and finance contracts separately; UI composes only authorized, server-returned summaries. |
| Documents | Candidate private student-document operations | Contract after storage and permissions decisions; define upload/scan states, authorized retrieval, deletion, idempotency, size limits and errors. |
| Import / export | Candidate school-scoped preview/commit and export operations | Define file schema, bounded limits, version/expiry, atomicity, conflict revalidation, idempotency, download format, authorization and retention before selecting endpoints. |

Use explicit `400` for invalid input, `401` for missing/expired authentication,
`403` for missing permission, `404` for inaccessible or missing student-related
objects, and `409` for duplicate/concurrent/lifecycle conflicts where applicable.
Define any rate-limit and asynchronous-job responses in the approved contract.
Reads and writes must handle no data and retryable failures explicitly. Avoid
PII in URL query logs, analytics, audit summaries and error messages; consider a
body-based search contract if query logging cannot be safely controlled.

Schema work may include structured address, enrolment roll/effective dates and
versioning, external academic history, import job metadata, and document
lifecycle metadata. Each requires a separate approved data model, migration,
backfill/validation, indexes and rollback plan. Do not assume one shared
guardian record per household or automatically create parent/student accounts.
Do not modify the existing local database as part of planning.

## 6. Proposed delivery plan

Each slice requires product approval of its own decisions and contract, a
frontend/backend vertical implementation, focused automated tests and recorded
evidence. Suggested order; dependencies can change after product review.

### Approved S1a: directory search and preview (2026-11-14)

The user approved a first implementation slice for the school-scoped directory:
server-side name/admission-ID search, academic-year/class/section and
active/inactive filters, pagination, a selected-student preview, and a link to
the existing profile. Continue using existing permissions and exclude archived
students; do not enable guardian-phone search, import/export, fees, documents,
or student mutations in this slice. No database migration is planned.

The search API is a cookie-authenticated `POST /api/v1/students/search` using
`students.read`, an active school, Origin and CSRF. Search text is sent in the
body rather than in URL query strings to avoid routine URL logging of student
names or admission IDs. It returns the existing student-list pagination shape.
Academic-structure filter choices require the existing
`academic_structure.read` permission; the student endpoint itself does not
grant structure access. A placement filter matches an enrolment with the stored
`isActive` flag in the same school; this is not a claim that its date range is
current. Rows show an active placement only when there is exactly one matching
placement, rather than choosing an ambiguous one. Default status includes
active and inactive records but not archived records. Detailed contracts and
implementation of later S1 capabilities remain subject to separate approval.
See the [directory API contract](../api-contracts/student-directory.openapi.yaml)
for validation, ordering, response shape and errors.
The existing classes endpoint supplies active classes only; historical inactive
classes are not available as selector choices in this slice.

Verification: focused frontend directory, student-record and adapter tests,
backend student-service tests, and an isolated PostgreSQL HTTP suite passed.
Both application builds and frontend changed-file lint passed. Backend lint
remains blocked by the pre-existing missing ESLint 9 configuration; production
isolation and object-level authorization remain separate release gates.

### Approved S1b: read-only profile (2026-11-14)

The user approved improving the existing read-only profile without student or
enrolment mutations. Continue to use the unchanged school-scoped
`GET /api/v1/students/{id}` and existing `students.read` permission and retain
identity and guardian details. The response includes historical enrolments.
Show a placement only when exactly one returned enrolment has `isActive=true`;
do not infer effective-date or current-year status. Explain when placement is
unavailable, and label attendance, academic records, fees and documents as
unavailable in this profile. Preserve mock mode. No new API, migration or
additional field permissions are introduced; field-level privacy remains a
separate release decision.

Verification: focused profile, directory and HTTP-adapter tests passed, as
did the frontend build. The profile component's existing form effect and unused
constant trigger pre-existing frontend lint findings; the other changed
profile adapter and test files pass lint.

### Approved S1c: student creation (2026-11-14)

The user approved replacing the existing student-create API and form together.
Creation must require first and last name, date of birth on or before admission
date, at least one guardian with exactly one primary guardian, and an emergency
contact selected as either the primary guardian or a separate name and phone.
Admission date need not fall within the selected academic year. Residential
address is optional and its fields may be independently blank. New students
start active. Existing incomplete records must remain readable; editing remains
a separate slice.

Generate IDs server-side as `PREFIX-YYYY-NNNN`, using at least four sequence
digits, the calendar year of admission and an annual school-specific sequence.
Existing schools default to their school code as prefix, and occupied IDs are
skipped without changing existing records. An active School Admin workspace
with `school.update` may configure the prefix. Configuration must not rewrite
existing IDs. Creation requires the existing `students.create` permission;
academic selector choices require `academic_structure.read`.

Initial roll is optional and must be unique within the selected section and
year for placements marked active with no end date. Count non-archived students
with placements marked active and no end date in that section/year against the
section's configured capacity. A missing capacity is unlimited. This counting
rule intentionally does not consider placement start dates; it is distinct
from S1a's display of stored active flags. Enforce IDs, rolls and capacity at
commit under concurrency, without modifying enrolment history. Migration,
backward-incompatible create contract and coordinated frontend/backend rollout
are required; do not modify the shared local database during development.
Photo, invitations, blood group, nationality and edit remain outside this
slice.

Implementation contract: `POST /api/v1/students` accepts identity, admission
date, academic-year/class/section IDs, one to five guardians, emergency
contact `{ kind: "PRIMARY_GUARDIAN" }` or `{ kind: "OTHER", name, phone }`,
optional address `{ line1, city, state, postalCode }`, and optional roll number.
All dates use calendar-date strings; names and optional address/roll values are
trimmed. Phone validation follows the existing international-phone validator.
`admissionNumber` is rejected on create. Prefix configuration uses
`GET/PATCH /api/v1/schools/current/admission-settings`, guarded by active
School Admin workspace plus `school.update`; prefix values use 2–32 uppercase
letters, digits or hyphens, beginning with a letter or digit. Existing school
codes supply the fallback prefix. Roll uniqueness is exact after trimming.
Requests require the existing cookie Origin/CSRF checks; malformed input
returns 400, invalid school-scoped academic references return 404, and full
sections or duplicate active rolls return 409. Creation and prefix updates are
audited without student names, contact details, or admission IDs.

Rollout: apply the migration and deploy the compatible backend before the
frontend. The create contract changed, so coordinate existing clients. Never
roll back the schema by deleting student data; retain the additive columns
and migrate clients in coordination.

Verification: frontend admission, profile, directory, settings
and adapter tests passed; backend typecheck, isolated compilation, student
service tests, and isolated PostgreSQL HTTP tests passed, including concurrent
capacity, roll and admission-ID checks. The local application database migration
and Prisma client generation were completed. Backend lint remains blocked by
its existing missing ESLint configuration.

| Slice | Delivery | Prerequisites and exit gate |
|---|---|---|
| S0 — Contract and security foundation | Reconcile existing student create/detail/edit behavior, permission exposure and schema inconsistencies; agree field policy, selected-year semantics and privacy baseline. Write student OpenAPI and baseline. | Approved first-slice scope and permission matrix; reproducible API-mode integration; no assumption that edit currently works. |
| S1 — Directory, profile, create and edit | **Selected first slice:** server-side search/filter/pagination, live preview, profile, create/edit including optional address, required emergency contact, school-configurable automatic admission IDs, optional initial roll and capacity enforcement, plus explicit unavailable states for dependent sections. Address confirmed edit DTO/UI mismatch without implementing enrolment mutation as profile editing. | Final field/guardian, emergency-contact, ID configuration, address, admission-correction, capacity/counting and permission contracts; class/year data; two-school and concurrent edit/create tests; mobile/a11y and real API integration. |
| S2 — Enrolment lifecycle and history | Selected-year placement, roll if approved, school enrolment history and controlled transfer/progression/withdrawal; previous-school history only if approved. | Transition and effective-date rules, year policy, constraints, migration/backfill, conflict/audit tests. This slice is separate from changing the profile or global year selector. |
| S3 — Student attendance records | Authorized student-level closed-session history and agreed summary calculations. | Attendance denominator/late/excused/missing-mark policy; enrolment/date attribution; test historical placements, no data and open sessions. |
| S4 — School Admin import/export | Template, full preview/validation, confirmed commit and approved export. | Approved file/row limits, columns, duplicate and atomicity policy, permissions, idempotency, privacy and retention; concurrency and CSV safety tests. |
| S5 — Secure documents | Approved categories, upload, scan/review, authorized view/download and controlled delete. | Provider, privacy/security design, retention, malware policy, storage failure recovery and object-level permissions; release security review. |
| S6 — Results and fees | Display published academic results and live finance summaries in Records. | Separately approved academic and finance workflows/contracts and permissions; no mock data, unapproved payments or invented balances. |
| S7 — Other roles and release | Consider Principal/Teacher/Accountant/Parent/Student scopes, operational hardening and UAT. | Explicit role/object/field policies and linked identities as applicable; staging sign-off and all production isolation gates. |

S2–S6 are not a promise that all dependencies are available in the first
release. S3–S6 can be reordered after their own prerequisites are met.
Deployment keeps frontend and backend separate; coordinate migrations and
backward-compatible API rollout, feature-gate new UI until its backend is
ready, and document rollback without deleting historical school records.

## 7. Acceptance and verification

For each approved slice:

- [ ] A user can complete its full workflow with real API data; loading, empty,
  no permission, invalid input, conflict, not found, failed network, retry,
  pending, success and narrow-screen states are clear and accessible.
- [ ] Search/filter returns correct results across multiple pages, with matching
  count semantics, stable ordering, filter reset and no stale-school leakage.
- [ ] Create/edit round trips retain supported values; duplicate admission IDs,
  foreign academic references, conflicting concurrent edits and guardian
  replacement edge cases are rejected or resolved as specified. Saving a
  guardian-less existing record or removing its last guardian is rejected;
  reading it remains possible.
- [ ] Only an authorized School Admin can correct admission ID/date, including
  when a non-admin has another student-update permission. Optional address
  fields can be left blank on both create and edit.
- [ ] Required student identity and emergency contact validation works; an
  emergency contact may be the explicitly selected primary guardian. A
  missing optional roll number is accepted; supplied rolls are unique within
  a section/year until the prior placement ends, after which reuse is allowed.
  School-configured automatic admission IDs are unique under concurrent creates.
  Concurrent creations cannot exceed an enforced section capacity, including
  at the last available seat; an unset capacity does not block creation.
- [ ] Profile edits do not silently mutate enrolment history. State transitions,
  date boundaries, overlapping placements and historical corrections behave
  exactly as approved; concurrent commands cannot bypass invariants.
- [ ] Attendance calculations reconcile to eligible records and explicitly
  cover pending, unmarked, late, excused and zero-denominator cases.
- [ ] Import preview has no side effects; duplicate-in-file/existing/race
  conflicts, invalid/oversized files, cancellation and repeated commit follow
  the approved all-or-nothing or alternative policy. Export does not leak
  fields, truncate silently or allow spreadsheet formula execution.
- [ ] Document access, upload validation, scan/quarantine, expiry, failure and
  deletion honor approved policy; cross-school/cross-student IDs and
  unauthorized actors are denied.
- [ ] Unit, adapter, DTO/controller and isolated PostgreSQL HTTP tests cover
  positive/negative authorization, CSRF, transactions, concurrency, audit
  redaction, two schools and same-school object boundaries. Test with synthetic
  fixtures only; verify real frontend adapter requests and generated OpenAPI.
- [ ] Keyboard and screen-reader labels/focus, pagination, drawers/dialogs and
  mobile layouts are reviewed; a school switch clears stale student data.
- [ ] Before production/sensitive data, RLS, non-owner runtime role, pooled
  connection isolation, backup/restore, monitoring, retention and operational
  ownership satisfy the [release gate](./06-verification-and-release.md).

## 8. Decisions and sign-off

| Decision to confirm | Recommendation for discussion | Needed before |
|---|---|---|
| First implementation slice and release boundary | **Selected:** S0 + S1 first — directory, profile, create and edit; keep dependent domains clearly unavailable. Exact contract still requires approval. | S0/S1 |
| Actor and field permissions | Existing School Admin grants for current actions; explicit separate decisions for guardian, enrolment, import/export, attendance, finance and documents; no automatic role expansion | Each affected slice |
| Guardian requirement | **Selected:** at least one guardian and exactly one primary whenever a student record is saved, including legacy records; those records remain readable without backfill. Prevent removing the last guardian or primary without a replacement. | S1 |
| Admission ID/date correction | **Selected:** School Admin only may edit both, overriding the locked reference. Enforce role and permission on the server; define uniqueness/date rules and audit; do not silently modify enrolment history. | S1 |
| Residential address | **Selected:** include address in the first slice; it is optional for all students, and address fields may be left blank independently, overriding the Edit reference's required markers. Schema and localization remain open. | S1 |
| Student identity | **Selected:** require first name, last name and a valid date of birth on or before admission date; existing incomplete records remain readable but must be completed before saving. | S1 |
| Emergency contact | **Selected:** required; choose the primary guardian or enter a separate name and phone. Existing incomplete records remain readable but must be completed before saving. Decide contact validation and storage. | S1 |
| Remaining Add fields and validation | **Selected:** defer nationality. Decide phone localization. Blood group is selected as optional **subject to privacy and access approval**; do not collect until that gate passes. | S1 / privacy review |
| Initial placement, admission ID, roll and capacity | **Selected:** automatic IDs use a school-configurable prefix, the calendar year of the admission date and a sequence that resets annually. Existing schools default to their school code as prefix; skip already-occupied IDs. Update the existing create API and form together to the new contract. Admission date can be outside the selected academic year. Optional roll is unique within section/year while a placement is marked active and has no end date; new student status is Active. Block creation when configured capacity is full, counting non-archived students with placements marked active and with no end date in the selected year/section; unset capacity is unlimited. The selected rule does not use start dates when counting. Decide remaining ID configuration details and enforce uniqueness and capacity at commit under concurrency. | S1/S2 |
| Add photo and parent invitation | Both appear in the reference; defer until private storage and parent identity/invitation contracts are separately approved. | S1 if requested; otherwise S5 / linked-account scope |
| Current year, placement, roll, status and historical corrections | Explicit effective-dated placement; no implicit promotion; confirm lifecycle and constraints | S1 selected-year behavior / S2 |
| Attendance definitions and allowed viewers | Closed records only; separately decide LATE/EXCUSED, missing marks and denominator | S3 |
| CSV fields, limits, duplicate handling, commit atomicity, retention, export | School Admin only with explicit grants; preview then atomic commit; decide final contract and privacy rules | S4 |
| Documents, provider/region, required types, scan, retention, delete and access | Private storage and default-deny object access; no medical category without explicit approval | S5 |
| Academic publication, fees and parent/student access | Separate domain approvals and linked-account policies; do not expose mock data | S6/S7 |

The user selected the first-slice direction and field decisions above on
2026-11-14. This is not approval of unresolved policies, endpoints,
permission mapping or the full implementation contract. Product, frontend,
backend and security owners and sign-off dates are otherwise pending. Record
remaining approvals here and in the relevant contract before implementation.
