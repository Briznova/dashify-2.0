# Dashify Full-Stack Execution Roadmap

**Status:** Proposed  
**Last reviewed:** 2026-11-12  
**Scope:** Coordinated delivery in `dashify-frontend-2.0` and `dashify-backend`

## Outcome

Deliver role-appropriate Dashify workspaces backed by consistent API contracts, with verified authentication, school scoping, server-side authorization, and integration tests. This is not a request to implement every domain before the first release.

## Delivery principles

- Product behavior and API contracts are spec-first; implementation must not silently decide unresolved policy.
- Build vertical slices end-to-end instead of completing a broad frontend refactor before backend readiness.
- Preserve existing UI/mock behavior while adding real API mode, unless a product decision explicitly changes it.
- Use backend permissions and tenant context as the security boundary. Do not treat frontend visibility as protection.
- Keep shared domain data/services reusable; workspaces compose domain features instead of cloning them.
- Ship only with verified authorization and tenant-isolation controls appropriate to the release environment.

## Phase sequence and gates

### Phase 0 — Repository and runtime baseline

**Work**

- Confirm both repositories build and identify the tested Node/Bun/package-manager versions.
- Generate and inspect backend OpenAPI from the running backend; reconcile it with controllers and DTOs.
- Record environment variables, API prefix, CORS origins, database/migration setup, and service-mode selection.
- Establish current mock-mode behavior and current backend test status without changing product behavior.

**Gate:** reproducible setup and baseline checks are recorded; no unresolved environment mismatch blocks local integration.

### Phase 1 — Approve identity, auth, and tenancy contracts

Use [Identity and tenancy spec](./02-identity-auth-tenancy-spec.md).

**Work**

- Decide browser auth mechanism, access-token lifetime, refresh rotation, logout behavior, and reset/signup scope.
- Define active-school selection and multi-membership/multi-role representation.
- Define how backend permission keys map to the seven product workspaces.
- Confirm school-admin versus platform-admin scope and whether Super Admin has a separate platform token/context.
- Decide what account/session data the frontend may rely on.

**Gate:** approved decision records and an OpenAPI contract for login, refresh, logout, current user, memberships, and active-school selection. Password reset is separately gated and does not block this core auth/session phase.

### Phase 2 — Implement and test auth/session vertical slice

**Work**

- Implement the approved backend flow and bearer/cookie semantics.
- Update the frontend auth adapter and session model to match actual responses.
- Ensure school switching refreshes scoped credentials and invalidates stale school data.
- Keep credentials out of local/session storage unless an approved threat model explicitly permits it.
- Defer password-reset endpoints; disable the reset flow in API mode rather than silently using mock behavior.
- Add backend and frontend tests for success, invalid credentials, expired/revoked tokens, missing membership, and school switching.

**Gate:** sign-in → session restore → school selection → protected request → sign-out works against the real API.

### Phase 3 — Approve and centralize access/workspace policy

Use [Access and workspace spec](./03-access-and-workspace-spec.md).

**Work**

- Approve role-to-workspace, capability, and route matrix using backend permission keys and product needs.
- Centralize frontend role home, navigation, route UX, and workspace resolution.
- Preserve current URLs and aliases unless explicitly changed.
- Keep the policy pure and clearly distinguish UI capabilities from server permissions.

**Gate:** role matrix tests pass and direct frontend routes do not leak data or imply API authorization.

### Phase 4 — Deliver core school-data vertical slices

Use [Core integration slices](./04-core-integration-slices.md).

Recommended order:

1. School profile and academic-year/class/section read models needed by student enrollment.
2. Student list/detail/create, including pagination and current create DTO requirements.
3. Attendance session listing/creation/marking with date and timezone behavior.

**Gate per slice:** approved spec, matching OpenAPI, frontend adapter, backend DTO/service/controller, authorization tests, tenant isolation tests, and UI loading/error/empty states.

### Phase 5 — Deliver remaining role-facing capabilities by product priority

Use [Backend capability backlog](./05-backend-capability-backlog.md).

Potential areas include staff and teacher assignment, student editing/guardian lifecycle, dashboards/aggregates, reports, announcements/notifications, and finance. Finance remains blocked until its workflow decisions are approved.

**Gate:** each capability has an approved spec and acceptance criteria; no placeholder or mock response is represented as live API data.

### Phase 6 — Harden, stage, and release

Use [Verification and release](./06-verification-and-release.md).

**Work**

- Complete RLS policies and least-privilege database role setup.
- Run two-school isolation tests, including pooled-connection context reset and cross-school identifiers.
- Verify API permission matrix and object-level authorization.
- Run full frontend/backend checks, E2E smoke tests, staging/UAT, backup/restore and operational readiness.

**Gate:** all release-blocking security, functional, and operational criteria have evidence and owners.

## Definition of implementation-ready

A phase or feature is ready to code only when:

- The spec has `Status: Approved` and an owner/date.
- User-visible outcomes and non-goals are explicit.
- Request/response schemas, auth requirements, permission keys, tenant scope, and error behavior are defined.
- Acceptance tests name observable outcomes and include negative/denial cases.
- Dependencies and rollout/data migration implications are recorded.

## Definition of done

- Frontend and backend conform to the approved spec and published OpenAPI.
- Automated tests cover normal, invalid, unauthorized, and cross-tenant cases as relevant.
- No unresolved TypeScript/build/lint/test errors introduced by the change.
- Loading, empty, retry/error, and mobile states are coherent in the UI.
- Documentation and contract baseline are updated.
- Release notes do not overstate API support or security guarantees.

## Change control

If implementation reveals a contract flaw or a missing product decision, stop that slice, write/update a decision record, obtain approval, then revise the spec before continuing. Do not make a breaking API change only to fit an existing mock type.
