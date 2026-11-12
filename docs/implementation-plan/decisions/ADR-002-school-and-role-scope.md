# ADR-002: School Selection, Workspace Roles, and Platform Scope

- **Status:** Accepted direction; captured in approved planning OpenAPI
- **Date:** 2026-11-12
- **Decision owners:** Product owner (user); backend/security implementation review pending
- **Related specs:** [Identity, authentication, and tenancy](../02-identity-auth-tenancy-spec.md), [Access and workspace](../03-access-and-workspace-spec.md)

## Context

The frontend currently represents one role and a school display name. The backend represents global users, school memberships, membership roles, permission keys, and an active-school-scoped token.

## Decision drivers

- Make school and platform scope explicit.
- Support multiple memberships and multiple workspace roles without treating the UI as an authorization boundary.
- Use backend permission keys as the effective authority for which UI actions are presented.

## Options considered

### Option A — Select a workspace, use membership permission union

- Benefits: users can enter the workspace that fits their task; the backend remains the source of effective permissions.
- Costs/risks: workspace persona and effective permission set are distinct; UI must not imply the workspace narrows server authority.

### Option B — One combined workspace for all roles

- Benefits: one navigation surface.
- Costs/risks: less tailored experience and potentially confusing navigation.

### Option C — Select a role and restrict permissions to that role

- Benefits: strict role-specific experience.
- Costs/risks: conflicts with a membership whose effective authorization is the union of assigned roles unless the backend adds explicit role activation semantics.

## Decision

- If an account has multiple active school memberships, require explicit school selection. A single membership may be selected automatically after verifying it remains active.
- Within the selected school, the user may select an active workspace role.
- Backend authorization uses the **union of permissions assigned to the active membership**, independent of the selected workspace persona.
- The frontend uses backend-returned permission keys to filter role-specific navigation/actions; workspace selection is presentation, not an authorization restriction.
- Platform Super Admin is a distinct platform scope and must not be inferred from or granted by an ordinary school membership.
- A Platform Super Admin session remains platform-only; it does not switch into a school membership context. School operations require a separately established school-scoped session.

No product role-to-permission assignments or detailed platform endpoint policy are approved by this decision. The platform-only session representation is captured in [auth-session.openapi.yaml](../contracts/auth-session.openapi.yaml); detailed platform endpoint permissions remain open.

The current auth implementation may issue school-selection and school-scoped sessions only. It must not infer platform authority from membership or role names; platform identity issuance remains gated until a platform-grant model is approved.

## Consequences

- **API/frontend/backend:** session/context needs active school, available workspace roles, selected workspace role, and effective permission keys (or an equivalent contract).
- **Security/privacy:** every endpoint still enforces backend permissions and tenant/object scope; cross-school access requires explicit platform authority and separately guarded operations.
- **Migration/rollout:** replace the frontend's single-role assumption only after the backend emits the approved context.
- **Follow-up work:** approve the exact active-school request/response and platform identity/token representation; finish the role matrix in the access/workspace spec.

## Validation

- Tests cover zero, one, and multiple memberships; inactive/revoked membership; workspace selection; permission union; and platform-versus-school scope.
- Cross-tenant and platform-only endpoints deny access without appropriate backend context.
- Frontend tests confirm navigation follows permission keys and never serves as the security check.

## Participants and approval

| Participant | Role | Decision |
|---|---|---|
| User | Product owner | Approved scope/workspace directions and platform-only session representation via Phase 1 choices; role matrix and platform endpoint policy remain open |
