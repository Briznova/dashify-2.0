# Feature Specification: <feature name>

**Status:** Draft | In review | Approved | Implementing | Verified | Deferred  
**Owner:** <name/team>  
**Reviewers:** Product, frontend, backend, security as applicable  
**Target release:** <release or TBD>  
**Last updated:** YYYY-MM-DD  
**Related decisions:** <links>

## Problem and user outcome

Describe the user problem and measurable outcome.

## Personas and authorization

| Persona / backend role | Scope | Allowed actions | Denied actions |
|---|---|---|---|
| <role> | <platform/school/assigned/own> | <actions> | <actions> |

State explicitly that frontend visibility is not authorization.

## Scope

### In scope

- ...

### Out of scope

- ...

## User experience

Document entry points, navigation, loading/empty/error/success states, responsive behavior, and accessibility requirements.

## API contract

| Method and path | Auth/context | Permission | Request | Response | Errors |
|---|---|---|---|---|---|
| `GET /api/v1/...` | <credential + active tenant> | `<permission.key>` | <schema/ref> | <schema/ref> | <401/403/404/etc> |

Include pagination, sorting/filtering, idempotency, date/timezone, and wire-to-view transformations as needed. Link the OpenAPI operation after implementation.

## Data and privacy

- Tenant ownership and source of tenant context:
- Sensitive data classification:
- Audit events:
- Retention/deletion:
- External integrations/storage:

## Acceptance criteria

Use observable, testable statements.

- [ ] Given ..., when ..., then ...
- [ ] Unauthorized requests are denied by the backend.
- [ ] Cross-tenant identifiers cannot read or mutate this resource.
- [ ] Frontend handles empty, loading, and API failure states without mock fallback.

## Test plan

- Frontend unit/component/adapter:
- Backend unit/e2e:
- Contract/integration:
- Authorization/tenant isolation:
- Accessibility/manual UAT:

## Dependencies and rollout

- Dependencies:
- Database migration/backfill:
- Feature flag/rollout:
- Rollback:
- Monitoring:

## Open questions

| Question | Owner | Needed by | Resolution |
|---|---|---|---|
| ... | ... | ... | ... |

## Sign-off

| Role | Name | Date | Status |
|---|---|---|---|
| Product | | | |
| Frontend | | | |
| Backend | | | |
| Security (if applicable) | | | |
