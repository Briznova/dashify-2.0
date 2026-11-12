# Dashify monorepo guidance

- Treat this repository as the source of truth for new coordinated frontend/backend phases. Start with `docs/implementation-plan/00-execution-roadmap.md` and the relevant approved spec.
- Keep frontend and backend as separate deployable applications under `apps/`; use Railway service root directories rather than coupling their runtime processes.
- Treat draft specifications as proposals. Confirm unresolved API, authentication, authorization, tenant, finance, or product behavior before implementing it.
- Verify API changes against backend DTOs/controllers and update `docs/api-contracts/` and the implementation-plan baseline when contracts change.
- Backend authorization and tenant isolation are authoritative. Frontend navigation and route checks are UX only.
- Do not use real student or credential data in code, fixtures, logs, or documentation.
