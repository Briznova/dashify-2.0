# Teacher Workspace End-to-End Specification

**Status:** Approved for implementation by product direction and user decisions
**Owner:** Product + frontend + backend
**Updated:** 2026-11-14
**Related:** [Role workspace design](./05b-role-workspace-design.md),
[Dashboard contract](../api-contracts/dashboard.openapi.yaml),
[Teacher workspace API contract](../api-contracts/teacher-workspace.openapi.yaml)

## Approval and scope

On 2026-11-14, the user requested the Teacher portion of the linked Figma
design, explicitly excluding its Parent screens, and approved implementation of
attendance marking, results entry/editing, and assignment/exam creation and
publication. The user delegated conservative workflow defaults.

The Teacher screens are Home, Attendance, Results, Assignments / Exam, and
School notices. They are school-scoped and limited to the authenticated
teacher's active class/section assignments. A teacher's class-level assignment
covers its active sections. The server resolves the unique active staff profile
from the authenticated user; the client never supplies a teacher, school, or
profile identifier as authority.

On 2026-11-14, the user approved the screenshot workflows with these
implementation decisions: no Parent UI or family visibility; School notices
only display published School Admin announcements; no student submission
workflow, marks import, or attachments; academic-year selection appears inside
Teacher pages; attendance and results may be partially published and remain
editable by the Teacher; grading bands are School Admin-managed per academic
year with a pass mark per assessment; notifications are in-app only. A
class-teacher designation must be explicit and managed by the School Admin.

## Approved behavior

### Home

- Show an academic-year selector within each relevant Teacher page, not in
  shared top navigation. Default to the active year; historical years are
  read-only.
- Show the school-local teaching-day snapshot, assigned sections, enrollment
  counts, subjects, and explicit class-teacher designation from school-scoped
  data.
- Do not invent a timetable, attendance session, or activity when the database
  has no corresponding data. If enrollment or academic-year data is unavailable,
  show it as unavailable rather than substituting a value.

### Attendance

- Teachers can read rosters and attendance records only for assigned sections
  in the active school and selected academic year.
- A teacher may save and update attendance for the current school-local date,
  then submit it even when some students are unmarked. A session is created on
  the first save. Each supplied student must be unique and enrolled in the
  assigned section on that date.
- Supported values are `PRESENT`, `ABSENT`, `LATE`, and `EXCUSED`. Submission
  sets the session to `SUBMITTED`; unmarked students remain unmarked. The owner
  may continue updating their submitted session for today. Submission is not
  family-visible. Optional per-student remarks are limited to 500 characters.
- Historical dates/years and sessions owned by someone else are read-only.
- Future attendance cannot be saved.

### Assignments and exams

- Teachers can list, create, and publish assignments, exams, and tests for
  sections they are actively assigned to.
- A new item is a draft with a title, optional description, due/exam date,
  type (`ASSIGNMENT`, `EXAM`, or `TEST`), positive integer maximum score, and
  pass mark between zero and the maximum score.
- Tests require a school-local start time (`HH:mm`) and duration in minutes
  (1-1440). Assignments and exams do not accept those test-only fields.
- The due/exam date must be within the selected academic year and not before
  the current school-local date.
- Publishing is a one-way transition. Published item details cannot be edited
  or deleted in this slice.
- Student submission workflows, attachments, and class-wide unscoped work are
  excluded.

### Results

- Teachers can read and enter/edit integer scores for active students enrolled
  in an assigned section on the assessment date, for assessments they created.
- Optional free-text feedback (maximum 2,000 characters) may be saved per
  student along with the score.
- Results are available only after the assessment has been published.
- Scores must be between zero and the assessment's maximum score.
- A Teacher may publish a partial set of results and continue editing scores
  afterward, while the academic year is active. Results remain Teacher-only;
  no family-facing read API is available.
- Each assessment has a pass mark. Grade labels are calculated from the
  school's GradeScale for the assessment's academic year. No scale is invented
  or seeded when a School Admin has not configured one.
- Results do not support imports, exports, attachments, or non-numeric stored
  scores.
- Result writes are audited without placing student names, scores, or comments
  in audit summaries.

### School notices

- Teachers can read published school-wide announcements through the existing
  API with the existing `announcements.read` permission.
- Teachers cannot create or publish notices. This page displays only published
  School Admin announcements. Parent/family access is excluded.

### Academic-year grade scales and class-teacher designation

- School Admins manage one grading scale per academic year. A scale consists
  of non-overlapping percentage bands with labels and must cover 0-100 before
  it is usable. If no scale exists, the Teacher UI says grades are not
  configured.
- The School Admin can designate one assigned Teacher per section as its class
  teacher. Class-level assignments alone do not imply this designation.
- In-app Teacher notifications are created for newly published school-wide
  announcements. No email, SMS, Parent/Guardian notification, or family-access
  feature is included.

## Authorization and data rules

- Protected operations require the Teacher workspace role, the operation's
  dedicated Teacher permission, a school-scoped authenticated session, and an
  active school.
- Every operation resolves exactly one active `StaffProfile` linked to the
  authenticated user and verifies the requested class/section against an
  active `TeacherAssignment`.
- Academic years, grading scales, and class-teacher designations are scoped to
  the active school. Only School Admin permissions can manage scales and class
  teacher designations.
- Roster, attendance, assessment, and result queries are tenant-scoped through
  `withTenant` and constrain every identifier to the active school and the
  resolved Teacher assignment. Foreign or inactive assignments are not
  disclosed.
- Dedicated `teacher.*` permission keys are used; generic school-wide
  `attendance.mark`, `students.read`, and `staff.read` are not granted to the
  Teacher role.
- Store assessment, result, attendance, grading-scale, and notification records
  with school/user ownership as appropriate; use transactions for writes. No
  Parent/Guardian identity linkage or family-read authorization is implemented
  in this slice. This slice does not claim that existing
  repository-wide PostgreSQL RLS gaps have been closed.

## Data model

Teacher assessments store an academic year and pass mark; results remain
numeric, with their publication timestamp tracked independently from assessment
publication. Attendance sessions distinguish `DRAFT` and `SUBMITTED` and allow
their owner to update them on the current date. Teacher assignments store an
explicit class-teacher flag. Grade scales and bands are tenant-owned and
academic-year scoped. Enforce uniqueness per assessment/student and per
section's class-teacher designation, index school-scoped lookups, and check
tenant/assignment consistency in the service before writes.

## API and UI acceptance

- `GET /api/v1/teacher/academic-years` returns the active school's years for
  the page-level Teacher selector.
- `GET /api/v1/teacher/sections` returns only sections assigned to the current
  Teacher and the explicit class-teacher metadata for the selected year.
- `GET /api/v1/teacher/attendance` returns the selected assigned section's
  enrolled roster and any existing session records for a valid date/year.
- `PUT /api/v1/teacher/attendance/draft` creates or updates today's partial
  attendance for its owner; duplicate or out-of-roster records fail without
  partial writes.
- `POST /api/v1/teacher/attendance/submit` submits a partial register; its owner
  may continue editing it for today.
- `GET/POST /api/v1/teacher/assessments` lists/creates assignment-scoped
  items including tests and academic-year filtering; test scheduling fields
  are required for `TEST`, and pass marks are stored per assessment.
  `POST /api/v1/teacher/assessments/{id}/publish` publishes a draft exactly
  once.
- `GET/PUT /api/v1/teacher/assessments/{id}/results` reads and upserts
  assignment-scoped scores with range and enrollment validation.
  `POST /api/v1/teacher/assessments/{id}/results/publish` publishes partial
  results; the Teacher can continue editing them afterward.
- `GET/PUT /api/v1/academic-years/{yearId}/grade-scale` lets School Admins
  read/configure a complete percentage-band scale. Teachers receive the
  matching scale with results.
- `POST /api/v1/staff/teacher-assignments` accepts an explicit
  `isClassTeacher` flag, with at most one designated Teacher per section.
- `GET /api/v1/announcements` remains the source for published school notices.
- Authenticated users can list and mark their own in-app notifications read.
  Publishing a school-wide announcement creates an in-app notification for
  active Teacher accounts.
- Tests cover missing/ambiguous staff identity, wrong role/permission, missing
  school context, inactive/foreign assignments, out-of-roster students,
  duplicate attendance records, submit/edit lifecycle, assessment publication
  and year validation, pass marks, partial result publication and later edits,
  grade-scale validation, class-teacher uniqueness, tenant scoping, notification
  ownership, and audit redaction.
- Frontend screens provide loading, retry/error, empty, pending, and success
  states and never fall back to mock data in API mode. Parent pages and all
  family-facing APIs remain untouched.
