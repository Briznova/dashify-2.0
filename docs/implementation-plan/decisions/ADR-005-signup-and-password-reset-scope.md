# ADR-005: Sign-up and Password-Reset Release Scope

- **Status:** Reset scope and security policy accepted; delivery provider and final API contract pending
- **Date:** 2026-11-12
- **Decision owners:** Product owner (user); backend/security/operations review pending
- **Related specs:** [Identity, authentication, and tenancy](../02-identity-auth-tenancy-spec.md)

## Context

The frontend includes sign-up and password-reset flows. The backend currently exposes no corresponding controller routes, although the schema contains password-reset token storage.

## Decision drivers

- Avoid implying that signup or password recovery works against the live API when endpoints are absent.
- Scope the first live auth integration deliberately.
- Keep account-enumeration and token-abuse protections in the reset design.

## Options considered

### Option A — Defer both flows

- Benefits: smaller first live-auth slice.
- Costs/risks: no live account recovery.

### Option B — Include sign-up and reset together

- Benefits: complete public auth journey.
- Costs/risks: requires school provisioning, verification, abuse controls, and delivery workflows.

### Option C — Include password reset only

- Benefits: account recovery can be delivered without making school/user provisioning public.
- Costs/risks: requires a delivery provider, token lifecycle, anti-enumeration response, throttling, and audit behavior.

## Decision

Include **password reset** in the live API scope. Defer **public sign-up**; do not expose a live signup endpoint or label the frontend mock signup as API-integrated.

The user approved a 60-minute, one-time reset token; request throttling of 3 per email address and 10 per IP per 15 minutes; audit records for requests, successful resets, and security-relevant failures without logging tokens or passwords; revocation of all sessions after a successful reset; and a password minimum of 12 characters with passphrases allowed and no mandatory character classes.

The email delivery provider is deferred. Confirmation-attempt throttling, token storage details, provider configuration, and final request/confirmation response schemas remain open and must be approved before reset implementation.

The user approved proceeding with core login/session/school implementation without waiting for password reset. Reset is a separately gated feature and must remain unavailable in API mode until its provider and final contract are approved.

## Consequences

- **API/frontend/backend:** reset request/confirmation endpoints and adapter work are in scope after their contract is approved; reset must be disabled in API mode in the meantime. Signup remains mock-only or is disabled in API mode.
- **Security/privacy:** responses must not disclose whether an account exists; reset tokens are one-time, expire after 60 minutes, and are never logged. A successful reset revokes all sessions.
- **Migration/rollout:** no public signup until a separate decision and provisioning spec are approved.
- **Follow-up work:** choose delivery provider, decide confirmation-attempt throttling and token storage details, and approve final endpoint schemas.

## Validation

- Tests prove identical public reset-request behavior for known and unknown emails.
- Tests cover 60-minute expiry, one-time use, request throttling, invalid tokens, all-session revocation, and the 12-character password minimum.
- Logs and responses contain no reset token or account-enumeration signal.
- API mode does not silently use mock signup/reset behavior.

## Participants and approval

| Participant | Role | Decision |
|---|---|---|
| User | Product owner | Accepted password-reset-only scope, generic response, 60-minute token, request throttling, audit policy, all-session revocation, and 12-character minimum; provider deferred |
