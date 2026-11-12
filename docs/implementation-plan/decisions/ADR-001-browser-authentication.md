# ADR-001: Browser Authentication and Session Direction

- **Status:** Accepted; contract captured in approved planning OpenAPI
- **Date:** 2026-11-12
- **Decision owners:** Product owner (user); frontend/backend implementation owners pending
- **Related specs:** [Identity, authentication, and tenancy](../02-identity-auth-tenancy-spec.md)

## Context

The frontend expects cookie-backed sessions, but the backend currently returns access and refresh tokens in JSON and requires a Bearer access token. This prevents the existing frontend API adapter from using protected backend routes.

## Decision drivers

- Keep access and refresh credentials unavailable to browser JavaScript.
- Support school-scoped authentication and current-session logout.
- Require CSRF/origin protections for cookie-authenticated state-changing requests.
- Avoid claiming compatibility with the current token-in-JSON backend implementation.

## Options considered

### Option A — Secure HttpOnly cookies

- Benefits: browser JavaScript cannot read the credentials; aligns with the user's selected direction and current frontend credential inclusion.
- Costs/risks: requires cookie issuance/rotation, CSRF protections, CORS and cookie configuration, and local/deployment environment handling.

### Option B — Bearer access token in memory with HttpOnly refresh cookie

- Benefits: bearer authorization is explicit and access tokens are not persistently stored by the frontend.
- Costs/risks: more complex browser token lifecycle; still requires refresh endpoint and CSRF protection for refresh.

## Decision

Use API-issued HttpOnly cookies for browser authentication. Use `Secure` in deployed environments and configure `SameSite` and allowed origins deliberately. Protect state-changing cookie-authenticated requests against CSRF. Sign-out revokes the **current session only**, not every session belonging to the account.

Approved defaults: cookie names `dashify_access`, `dashify_refresh`, `dashify_csrf`; auth cookies are HttpOnly and scoped to `/api/v1`; deployed auth cookies are Secure and SameSite=Lax is the default for a same-site frontend/API deployment; access lifetime is 900 seconds and refresh lifetime is 2,592,000 seconds; refresh rotates on use and reuse is rejected/revoked; unsafe requests validate the configured Origin and a CSRF cookie/header pair; refresh credentials are hashed and tracked per browser session so logout revokes only the current session.

The user approved the proposed login, refresh, logout, session, and school-selection shapes. They are captured in [auth-session.openapi.yaml](../contracts/auth-session.openapi.yaml). Cookie-domain deployment configuration, concurrent refresh behavior, and session persistence design still need implementation-level review. Do not treat the current token-in-JSON API as conforming.

## Consequences

- **API/frontend/backend:** backend auth endpoints and JWT guard must support the approved cookie transport; frontend sends credentials and does not persist access/refresh tokens in web storage.
- **Security/privacy:** CSRF, origin validation, cookie domain/path, TLS, and secret handling need explicit tests/review.
- **Migration/rollout:** preserve non-browser bearer use only if separately required and explicitly specified.
- **Follow-up work:** approve the proposed operation/schema details in the identity spec; implement refresh rotation and current-session revocation.

## Validation

- Browser tests prove cookies are HttpOnly and correctly scoped/flagged for the environment.
- Tests cover CSRF/origin rejection, expired access, refresh rotation/reuse, concurrent refresh, current-session logout, and unaffected other sessions.
- Protected frontend requests succeed without JavaScript-readable token storage.

## Participants and approval

| Participant | Role | Decision |
|---|---|---|
| User | Product owner | Approved auth/session defaults and proposed auth/school schema direction via Phase 1 choices |
