# Access Policy and Role Workspace Specification

**Status:** Phase 3 complete — centralized role/workspace UX and API-mode gating validated; data API integration remains in Phase 4  
**Depends on:** [Identity/auth/tenancy spec](./02-identity-auth-tenancy-spec.md)

## Source plan

This specification carries the access-policy and workspace-extraction portions
of the frontend's existing [User-Type Modular Structure Plan](../../apps/frontend/docs/user-type-modular-structure-plan.md)
into the coordinated full-stack roadmap. The original remains the detailed
frontend migration reference; this shared spec governs cross-repository
alignment. Keep both updated if approved role/workspace behavior changes.

## Goal

Make the frontend's role-specific landing experience, navigation, route UX, and action presentation explicit and testable, while keeping shared feature data and screens reusable.

## Current frontend baseline

- Seven closed frontend roles: `super_admin`, `school_admin`, `principal`, `teacher`, `accountant`, `parent`, `student`.
- Teacher, Accountant, Parent, and Student have dedicated dashboard home routes; the other three use `/dashboard`.
- The access-policy module defines role-specific sidebar links, settings visibility, route checks, compatibility aliases, and home workspace metadata. Notifications and rendering remain in the shell.
- The dashboard home delegates role workspace composition to a workspace-home entry module and the two shared dashboard components.
- `homeKind` is a rendering-composition label only; `dataScope` records the intended scope but does not enforce it.
- Product approved preserving this existing home/navigation/settings/alias behavior as the frontend UX baseline.
- UI capability identifiers describe navigation/presentation only; they are not backend permission keys or evidence of final product access.
- This is a mock/demo policy and is not sufficient evidence for final product permissions.

## Current backend authorization model

- Backend JWT carries user ID and, after school selection, active school/membership and permission keys.
- Permission keys are checked by backend guards on protected endpoints.
- UI roles must not be assumed to map one-to-one to backend role names. A product/workspace label and permission set may be distinct concepts.

## Approved UX baseline and remaining product decisions

The approved baseline is intentionally limited to preserving current frontend routes
and navigation. It does not approve data scope, read/write actions, or backend
permissions.

| Persona | Home path | Navigation baseline |
|---|---|---|
| Super Admin | `/dashboard` | Overview, Schools, Students, Staff, Classes, Attendance, Fees, Academics, Analytics, Reports |
| School Admin | `/dashboard` | Overview, Students, Staff, Classes, Attendance, Fees, Academics, Analytics, Reports |
| Principal | `/dashboard` | Overview, Students, Staff, Classes, Attendance, Fees, Academics, Analytics, Reports |
| Teacher | `/dashboard/teacher` | Overview, My teaching day, Classes, Attendance, Academics |
| Accountant | `/dashboard/accountant` | Overview, Finance overview, Fees, Reports |
| Parent | `/dashboard/parent` | Overview, My child |
| Student | `/dashboard/student` | Overview, My learning, Academics |

Settings remain available to Super Admin, School Admin, and Principal. The
`/dashboard/customers` → students and `/dashboard/projects` → classes aliases are
preserved.

## Provisional least-privilege role policy

At the user's request to make the decision, use this conservative product policy.
It defines intended scope and business actions, not implemented API authorization.
The backend must independently enforce membership, permission, and object scope.

| Persona | Data scope | Allowed reads | Allowed writes | Explicitly denied/deferred |
|---|---|---|---|---|
| Super Admin | Platform-only; no active school context | Cross-school operational aggregates and school directory metadata | Create/onboard schools and manage school-admin invitations, only through dedicated platform grants and endpoints | No school switching or individual student/parent/teacher records by default |
| School Admin | One selected school | School, students, staff, academic structure, attendance, and finance records | School settings; student/staff lifecycle; academic structure; attendance marking/correction; finance operations only where a feature contract exists | No cross-school data or platform administration |
| Principal | One selected school | School, students, staff, academic structure, attendance, and school reports | Attendance correction with an audit reason; no other writes by default | No platform administration, role management, or finance writes |
| Teacher | Assigned classes and their enrolled students | Assigned class rosters, relevant attendance, assignments, and student learning data | Mark attendance for assigned classes; manage assigned-class coursework when the workflow exists | No school-wide student browsing, attendance correction, finance, settings, or staff/role management |
| Accountant | One selected school's finance domain | Fee schedules, balances, receipts, and finance reports; only minimum student identifiers needed for reconciliation | Record/adjust/reconcile finance transactions through audited workflows | No academic, attendance, or unrelated student-profile access; no platform or school settings |
| Parent | Linked children only | Linked-child profile, attendance, assignments, progress, notices, and approved fee summary | No edits to school records; communication actions require a separately defined workflow | No unrelated student or school-wide records |
| Student | Own records only | Own enrollment, classes, assignments, grades, attendance, and notices | Submit own coursework when the submission workflow exists | No edits to official records or access to other students |

These are scope defaults, not grants. A capability is usable in API mode only
after its backend endpoint, permission key, and object-level scope exist and are
returned/checked by the server. In particular, the current backend has no
platform school directory/onboarding route or platform-grant implementation;
its current role seed creates only a School Admin role. Teacher class assignment,
parent-child links, student-self scope, finance, reports, staff, and dashboard
aggregate APIs are also absent or unaligned with the frontend adapters. Do not
expose mock values as API data or infer server permissions from a UI role.

The backend currently defines route permissions for school read/update, student
read/create/archive, academic-structure read/manage, and attendance read/mark/
correct. Existing frontend API paths do not consistently match these routes.
Permission-key filtering is combined with adapter readiness and does not replace
backend authorization.

The frontend now uses returned `permissionKeys` and adapter readiness to filter
API-mode navigation and route UX. Although the backend has student,
academic-structure, and attendance read permissions, their frontend adapters
still call incompatible paths and/or expect incompatible response shapes, so
those sections remain hidden in API mode until Phase 4 aligns them. Platform
schools, staff, fees, assignments, reports, analytics, portal-specific data, and
settings also remain hidden because their API endpoints/permission contracts
are absent or unaligned. Role home routes remain reachable so session routing is
stable, but API mode shows an explicit dashboard-data-unavailable state instead
of rendering mock dashboard content. Static demo notifications and the
hardcoded student count are hidden in API mode. Mock mode preserves the
approved baseline.

This is only a UI filter. Student, class, and attendance service adapters still
require route and response-shape alignment to the backend; the frontend must not
claim those features are integrated until that work and backend object-scope
tests pass.
Student create/edit routes and the corresponding demo actions are also hidden
in API mode: the existing form model does not match the backend DTO, and the
backend currently has no student-update route. A read permission alone never
grants those write screens.

The table below records unresolved implementation questions for feature specs,
not open choices about the default role scope:

| Persona | Home path baseline | Implementation decision still required |
|---|---|---|
| Super Admin | `/dashboard` | Implement platform grant and endpoints; keep school context absent |
| School Admin | `/dashboard` | Align school/student/academic/attendance adapters and server permissions |
| Principal | `/dashboard` | Add assigned role permissions; verify audit behavior for attendance corrections |
| Teacher | `/dashboard/teacher` | Add class assignments and enforce class-scoped query/object access |
| Accountant | `/dashboard/accountant` | Approve finance contract, permission keys, and audited transaction lifecycle |
| Parent | `/dashboard/parent` | Add guardian-child links and linked-record object authorization |
| Student | `/dashboard/student` | Add self-scoped endpoints and object-level authorization |

## Design requirements

- Create a pure access-policy module with role/capability identifiers, home route metadata, navigation metadata, and route decision helpers. **Implemented and validated for the approved UX baseline only.**
- Derive navigation and route UX from one declared policy where practical.
- Keep icons/rendering details outside pure policy data or use stable icon identifiers without importing React.
- Keep URL structure and `/dashboard/customers` → students and `/dashboard/projects` → classes aliases until explicitly approved for removal.
- Treat direct route handling as UX. Every backend endpoint performs permission and tenant checks independently.
- Do not infer backend permission from a role label or create a usable API capability without an implemented endpoint and server-side authorization.
- Avoid cloning domain components/data for each role; compose shared domain views with explicit role-appropriate actions.
- Model platform scope separately from school scope; do not let an active school name imply platform access.

## Acceptance criteria

- Every supported frontend role has one home path and one policy entry.
- Unknown/malformed role values fail closed to an explicit unauthenticated/unsupported state; they are not promoted to a privileged role.
- Unit tests cover exact routes, nested routes, settings, portal pages, and aliases.
- Navigation items correspond to known route destinations; capability identifiers currently mean presentation/navigation only and must not be interpreted as server permissions.
- Tests cover each role’s landing composition and denied-route behavior.
- Backend authorization must independently prove role/permission enforcement; this is not satisfied by frontend tests and remains tracked in the backend/security work.
- Accessibility and mobile navigation remain usable for each role.

## Migration order

1. Record existing route/navigation behavior as baseline. **Complete; UX baseline approved.**
2. Record least-privilege persona scopes and action defaults. **Decision recorded above; delegated by user.**
3. Centralize frontend policy without moving pages or changing URLs. **Implemented and validated for current UX baseline.**
4. Extract workspace composition into a role-dispatched workspace-home entry module while reusing shared dashboards. **Complete.**
5. Align feature route UX/action visibility with server permissions and adapter readiness. **Complete for current routes; unsupported features are hidden until Phase 4 delivers their API contracts/adapters.**
6. Group domain modules only when cohesive and independently testable.

## Non-goals

- Replacing backend RBAC or tenant authorization.
- Shipping configurable roles or a permission administration UI.
- Bulk-moving all frontend files to match a target diagram.
- Changing APIs as a side effect of a presentation-layer extraction.
