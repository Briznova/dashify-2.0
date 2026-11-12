# Dashify Decision Register

Create decision records from `../templates/decision-record-template.md`; record the approval scope and unresolved implementation details separately. Link decisions from affected specs and update this register.

| ID | Decision | Status | Required owners | Blocks |
|---|---|---|---|---|
| [ADR-001](./ADR-001-browser-authentication.md) | Browser authentication and session direction | Accepted; planning OpenAPI captured | Product, frontend, backend, security | Implementation and security review |
| [ADR-002](./ADR-002-school-and-role-scope.md) | School selection, workspace roles, and platform scope | Accepted; planning OpenAPI captured | Product, backend, security | Role matrix and implementation review |
| ADR-003 | Finance workflows and release scope | Proposed | Product, finance domain owner, backend | Finance/fees API implementation |
| ADR-004 | Private file/document storage and access lifecycle | Proposed | Product, backend, operations, security | Student document APIs |
| [ADR-005](./ADR-005-signup-and-password-reset-scope.md) | Sign-up and password-reset release scope | Accepted scope; delivery provider and reset contract pending | Product, backend, operations, security | Password-reset implementation |

## Decision workflow

1. Copy the template into this folder as `ADR-NNN-short-title.md`.
2. Record context, options, impacts, tests, and named approvers.
3. Keep the decision `Proposed` while unresolved; do not code against it as if approved.
4. On approval, set status/date, update affected specs and API contracts, and link the record here.
5. If later superseded, preserve the old record and link the replacement.
