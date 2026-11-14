# Identity, Authentication, and Tenancy Specification

**Status:** Auth/session/school contract approved in planning; reset provider and final contract pending  
**Owners:** Product, frontend, backend, and security  
**Blocks:** Real API authentication, role-policy approval, and school-scoped API integration

## Problem

The frontend currently models one user role and an optional school name, and its API client sends cookies. The backend currently returns access and refresh credentials in JSON, expects a bearer authorization header, and models users with school memberships, membership roles, and permission keys. These models must be aligned before protected API integration.

## Scope

- Login, browser session, refresh rotation, current-session logout.
- Current-user/session representation and school membership selection.
- Workspace-role selection and permission presentation.
- Password reset (separately gated; excluded from the core auth/session implementation phase).
- CORS and local/staging configuration.

Public sign-up is deferred. Frontend-only authorization and changes that weaken backend permission or tenant isolation are out of scope. Production readiness is not implied while RLS/isolation work remains incomplete.

## Observed backend operations

- `POST /api/v1/auth/login`: accepts email/password; currently returns access/refresh credentials in JSON and partial user data.
- `POST /api/v1/auth/logout`: accepts a refresh credential in the body and revokes it.
- `GET /api/v1/auth/me`: requires authenticated access and returns the current profile.
- `GET /api/v1/auth/schools`: lists active memberships.
- `POST /api/v1/auth/active-school`: selects a school and returns a school-scoped access credential and permissions.

No refresh, sign-up, or password-reset controller route was observed in the Phase 0 live OpenAPI document.

## Accepted product directions

Recorded in [ADR-001](./decisions/ADR-001-browser-authentication.md), [ADR-002](./decisions/ADR-002-school-and-role-scope.md), and [ADR-005](./decisions/ADR-005-signup-and-password-reset-scope.md):

- Use API-issued HttpOnly cookies for browser authentication. Use Secure cookies in deployed environments and protect cookie-authenticated state-changing requests against CSRF.
- Sign-out revokes the current session only.
- Defer public sign-up; include password reset in the intended API release.
- Require school selection when multiple active memberships exist. A single active membership may be selected automatically after server verification.
- Allow the user to select a workspace role within the active school.
- Backend authorization uses the union of permissions assigned to the active membership; workspace selection does not narrow server permissions.
- Use backend-returned permission keys to filter frontend navigation/actions. The API remains authoritative for access.
- Platform Super Admin is a separate platform scope. Its session is platform-only and does not switch into a school membership context.

## Approved authentication/security defaults

The user approved these initial defaults:

- Cookie names: `dashify_access`, `dashify_refresh`, `dashify_csrf`.
- Access/refresh cookies are HttpOnly and scoped to `/api/v1`; deployed auth cookies are Secure.
- SameSite=Lax is the default for a same-site frontend/API deployment; cross-site deployment requires explicit review.
- Access lifetime is 900 seconds; refresh lifetime is 2,592,000 seconds.
- Rotate refresh credentials on use and reject/revoke a detected reused credential.
- For state-changing cookie-authenticated operations, validate Origin against the configured allow-list and require a matching CSRF cookie/request header.
- Store refresh credentials hashed and track each browser session/rotation lineage so logout revokes only the current session.
- Password-reset requests use a generic response and one-time tokens that expire after 60 minutes. Approved policy: 3 requests per email address and 10 per IP per 15 minutes; audit requests, successful resets, and security-relevant failures without logging tokens/passwords; revoke all sessions after reset; require at least 12 password characters and allow passphrases without mandatory character classes. Provider selection and confirmation-attempt throttling remain open.

The backend's current storage does not fully model browser-session families; schema changes may be needed. Cookie domain, concurrent refresh behavior, and session persistence design need review during implementation.

## Approved auth/session/school API contract

The approved auth/session/school operation and schema direction is captured in [auth-session.openapi.yaml](./contracts/auth-session.openapi.yaml). Password-reset paths in that file are proposals only, not approved contract.

| Operation | Approved contract direction |
|---|---|
| `POST /api/v1/auth/login` | Accept email/password; set HttpOnly auth cookies; return safe user and membership metadata, never token values in JSON. |
| `POST /api/v1/auth/refresh` | Rotate the current session's refresh credential and auth cookies; preserve only a still-valid school/workspace context. |
| `POST /api/v1/auth/logout` | Revoke only the current refresh session, clear its cookies, and be safe to repeat. |
| `POST /api/v1/auth/change-password` | Authenticated user supplies current and new passwords; preserve the current session and revoke other sessions. |
| `GET /api/v1/auth/me` | Return the authenticated user and current membership/school/workspace context. |
| `GET /api/v1/auth/schools` | Return the authenticated user's active memberships; this is not a platform-wide directory. |
| `POST /api/v1/auth/active-school` | Validate membership and selected workspace role, then set the scoped session context; never accept caller-defined permissions. |
| `POST /api/v1/auth/password-reset/request` | **Proposed only:** return an account-enumeration-safe response and trigger delivery through the provider selected for implementation. |
| `POST /api/v1/auth/password-reset/confirm` | **Proposed only:** validate a one-time 60-minute token, enforce the 12-character minimum, update the password, and revoke all sessions. |

### Approved login schema direction

Request: `{ "email": "user@example.test", "password": "..." }`

Response: `200`, sets auth/CSRF cookies and returns safe metadata:

```json
{
  "user": { "id": "uuid", "email": "user@example.test", "firstName": "Avery", "lastName": "Johnson" },
  "memberships": [
    { "membershipId": "uuid", "school": { "id": "uuid", "name": "Example School" }, "workspaceRoles": ["school_admin"] }
  ],
  "activeSchool": null
}
```

Do not return access or refresh values in JSON. For one active membership, the client can request school selection automatically; for multiple memberships, show a picker.

### Approved active school/workspace schema direction

`POST /api/v1/auth/active-school`

Request: `{ "schoolId": "uuid", "workspaceRole": "school_admin" }`

Response: `200`, sets scoped cookies and returns `{ "user": ..., "activeSchool": ..., "workspaceRoles": [...], "activeWorkspaceRole": "...", "permissionKeys": [...] }`. The service validates membership and role assignment, derives the permission union, and never trusts caller-supplied permissions.

### Approved current session and refresh schema direction

- `GET /api/v1/auth/me` returns user identity, memberships, active school, available workspace roles, selected workspace role, and effective permission keys; unauthenticated/expired sessions return `401`.
- `POST /api/v1/auth/refresh` accepts the refresh cookie, rotates the current browser session, and returns refreshed safe session metadata. It fails closed for expired, revoked, reused, or no-longer-authorized sessions.
- `POST /api/v1/auth/logout` revokes the current browser session, clears auth/CSRF cookies, and returns `204`; repeating logout is safe.

### Authenticated password change

`POST /api/v1/auth/change-password` requires an active authenticated session, Origin and CSRF validation for cookie requests, and `{ "currentPassword": "...", "newPassword": "..." }`. The new password must have 12–1024 characters; passphrases are allowed and no character classes are required. The current password must not be empty. Success returns `204`, preserves the current session, and revokes other sessions, including legacy refresh credentials without session IDs. Incorrect current passwords and invalid input return `400`; invalid sessions return `401`. The endpoint uses the application's per-IP limit of five requests per minute. Successful and incorrect-password attempts are audited without password values. This does not implement email-based password recovery.

### Password-reset API proposal (provider decision pending)

- `POST /api/v1/auth/password-reset/request`: request `{ "email": "user@example.test" }`; return the same generic `202` response for known/unknown accounts.
- `POST /api/v1/auth/password-reset/confirm`: proposed request `{ "token": "...", "newPassword": "..." }`; return `204` on success.
- Approved policy: 60-minute one-time token; request limit 3 per email and 10 per IP per 15 minutes; audit requests, success, and security-relevant failures without recording secrets; revoke all sessions after success; minimum password length 12, passphrases allowed, no mandatory character classes.
- Provider selection, confirmation-attempt throttling, token storage details, and final response/schema approval remain pending.

### Approved platform session direction

Platform Super Admin context is platform-only and cannot select a school. A school-scoped session requires a separately approved flow. The approved planning OpenAPI represents platform scope explicitly; detailed platform endpoint permissions remain open.

## Remaining approvals

1. Select a password-reset delivery provider.
2. Approve reset TTL, throttling, audit, password rules, and session-revocation behavior.
3. Review cookie domain, cross-origin deployment, concurrent refresh, and session-family persistence details.
4. Review platform endpoint permissions and product role-to-permission assignments separately.

## Contract requirements

- Authentication and CSRF requirements for every operation.
- Login, refresh, logout, current-user, membership-list, and school/workspace-selection schemas. Reset schemas remain proposed until the provider/security decisions are approved.
- Session identity, membership, active school, active workspace, permission keys, expiry, and error behavior (`401`, `403`, revoked membership, invalid school, rate limit).
- No password or credential values in logs or analytics.
- Tenant identity comes from trusted server-validated context, not an arbitrary caller-supplied school ID.
- Platform authority is distinct from school membership authority.
- Password-reset requests do not reveal whether an account exists.
- Safe behavior for users with zero, one, or multiple active memberships.

## Frontend acceptance criteria

- Sign-in and session restoration use the approved cookie contract; tokens are not stored in local/session storage.
- The frontend distinguishes unauthenticated, no-active-membership, membership-selection, and active-school states.
- School switching clears or refreshes school-scoped frontend data so data from the previous school is not displayed.
- Navigation/actions use backend permission keys for presentation, without treating hidden UI as endpoint protection.
- Sign-out requests current-session revocation and clears client state; API failures are surfaced.
- Password reset uses the live API only after its delivery and token contract is implemented; sign-up is not represented as API-integrated.

## Backend acceptance criteria

- Login sets only approved cookies and returns only approved non-secret fields.
- Refresh rotation and replay/revocation behavior are covered by tests.
- School selection requires an active membership and derives effective permissions server-side.
- All protected school operations reject missing/invalid active-school context.
- Platform operations require distinct platform authority.
- Auth throttling, CSRF, reset anti-enumeration, audit, and secret redaction are verified.
- School-membership login never grants platform scope. Platform identity issuance remains gated on an approved platform-grant model and is not part of the current school auth implementation.

## Phase 2 implementation status (2026-11-12)

The approved core auth/session/school flow is implemented in both repositories. The backend sets HttpOnly access/refresh cookies and a readable CSRF cookie; rotates hashed refresh credentials with session lineage; validates live session, membership, and permissions; and exposes login, refresh, logout, current-session, memberships, and active-school endpoints. The frontend maps the safe API response, uses cookie credentials and CSRF headers, and routes users to school/workspace selection. Signup and password reset remain unavailable in API mode.

Backend unit tests (22 tests across 6 suites), typecheck, build, and Prisma validation passed. Frontend auth tests (12 across 2 suites), lint, TypeScript validation, and production build passed. The UI tests cover session loading/error/unauthenticated states, workspace selection and failures, single-membership selection after sign-in, protected-request refresh behavior, API-mode reset/signup gating, and logout failures. Both migrations were applied to the empty local Compose database and the synthetic demo account was seeded. A live HTTP integration flow verified login cookies and safe response fields, session restore and membership listing, CSRF rejection, school selection, a protected school read, refresh rotation and context preservation, replay rejection/revocation, and logout cookie clearing and access invalidation. Generated Swagger includes the six auth routes and documents school selection as HTTP 200.

The frontend currently has no shared query/data cache; selection navigates to the workspace and refreshes the route. If school switching is added after login or a data cache is introduced, explicit school-scoped cache invalidation must be implemented and tested. The live HTTP integration probe was manual and is not a persistent backend integration test. Backend lint is still blocked by the pre-existing missing ESLint 9 configuration.

## Phase 1 status

The user approved the auth/session/school schema direction and platform-only session representation. The user has also approved password-reset security policy, but deferred the delivery provider and has not approved the final reset API contract. **Phase 1 remains in progress for password reset**, but the user approved proceeding with core auth/session/school implementation independently. Keep password reset unavailable in API mode until its separate contract is approved. Platform identity issuance remains gated because no platform-grant model exists; never infer platform authority from school membership. Auth cookie deployment, concurrency, and session persistence still require engineering/security review before implementation.
