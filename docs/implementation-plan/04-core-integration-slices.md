# Core API Integration Slices

**Status:** Phase 4 core slices complete; see the [execution checklist](./00-execution-checklist.md) for evidence and limitations  
**Purpose:** Turn existing frontend mock-backed domains into testable API-backed vertical slices without pretending current wire contracts match.

## Shared prerequisites

- Phase 1 and 2 of the [roadmap](./00-execution-roadmap.md) are complete.
- OpenAPI is available and matches approved auth and tenant context.
- Frontend request/response types distinguish wire DTOs from UI view models.
- Backend grants/permissions are defined and tested for the slice.
- Error envelope, pagination, date/timezone handling, and empty-state behavior are agreed.

## Slice A — Active school and academic structure

### Current backend operations

- `GET /api/v1/auth/schools` lists the authenticated user's active memberships.
- `POST /api/v1/auth/active-school` selects a school and returns a scoped token and permissions.
- `GET /api/v1/schools/current` and `PATCH /api/v1/schools/current` operate on the active school profile.
- `GET /api/v1/academic-years` and `GET /api/v1/classes` read active-school structure.
- Create operations exist for academic years, classes, and sections.
- `GET/PATCH /api/v1/schools/current` reads and updates the active school profile.

### Frontend gaps

- No membership or active-school ID in current auth types/service.
- Frontend expects `GET /schools` as a platform directory, not membership list.
- Profile settings use the backend fields and `PATCH` contract; mock-only school type and notifications are not represented in API mode.
- Academic years can be listed and created; class/section creation remains out of scope.
- Frontend class model combines class/section/teacher/schedule details not returned by the observed classes endpoint.

### Acceptance

- Membership selection is explicit and scoped.
- Switching schools updates credentials/state and invalidates stale queries.
- School profile fields map without data loss or false defaults.
- Class/section wire data is rendered without inventing teacher/schedule values.
- Backend denies cross-school IDs and validates permission requirements.

## Slice B — Student list/detail/create

### Current backend operations

- `GET /api/v1/students?page=&pageSize=` is paginated.
- `GET /api/v1/students/:id` returns a student with guardians and enrollments.
- `POST /api/v1/students` creates a student, guardians, and enrollment.
- `POST /api/v1/students/:id/archive` archives a student.
- Current create DTO requires admission number, admission date, academic year/class/section IDs, and a guardians array.

### Frontend gaps

- UI expects unpaginated `Student[]` and display names/grade/guardian summary.
- Current `StudentInput` does not include required enrollment identifiers or admission fields.
- UI expects `PUT` update, but backend update endpoint is absent.
- Mock student IDs are not UUIDs and cannot be sent to backend ID routes.

### Acceptance

- List pagination has a defined UI strategy and retains filters/page state appropriately.
- Forms provide required domain identifiers from real academic structure data.
- UI view-model mapping derives display name, grade, guardian summary, and status explicitly.
- Detail and archive actions are included or intentionally excluded in product scope.
- Student editing remains hidden/disabled until a backend update lifecycle and permission are specified.
- Backend tests cover school isolation and foreign-school academic-year/class/section IDs.

## Slice C — Attendance

### Current backend operations

- `GET /api/v1/attendance/sessions?date=...`.
- `GET /api/v1/attendance/sessions/:id/roster` returns currently enrolled students and any existing mark for the selected session.
- `POST /api/v1/attendance/sessions`.
- `PUT /api/v1/attendance/sessions/:id/records`.
- `POST /api/v1/attendance/sessions/:id/close`.
- Permissions distinguish read, mark, and correct/close behavior.

### Frontend gaps

- UI expects aggregate rows by grade/date; backend exposes session records.
- Backend list requires a date string, but timezone/date semantics and invalid/missing-date behavior need contract clarity.
- API-mode attendance requires `attendance.read` and `school.read`; create/mark uses `attendance.mark`, and close uses `attendance.correct`.
- Post-mark corrections are intentionally deferred. Existing records are read-only in the UI and the mark endpoint rejects overwrites; no correction reason or correction endpoint is introduced.

### Acceptance

- Date is interpreted consistently in the school's timezone.
- Session creation, marking, and closing are represented with explicit UI state and idempotency/conflict behavior.
- UI does not invent daily aggregate data; either backend provides an aggregate endpoint or frontend derives only from returned scoped sessions.
- Negative permission and cross-school session ID tests pass.
- School timezone determines the initial date; the selected `YYYY-MM-DD` is submitted unchanged as a calendar date.

## API adapter implementation rules

- Keep all HTTP calls in service adapters; do not add `fetch` calls directly to route components.
- Validate/transform API data at the service boundary; do not assert payloads with unchecked casts.
- Preserve abort signal propagation and surface non-abort errors.
- Do not fall back silently from API failure to mock data.
- Keep API mode explicit and observable; make the configured base URL include or omit `/api/v1` consistently, never both.
- Add adapter tests for URL, method, headers/credentials, request body, response mapping, pagination, and API error handling.
