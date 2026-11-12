# Dashify Backend Engineering Guidance

## Spec-driven delivery

- For cross-system Dashify work, consult `../../docs/implementation-plan/`. Start with `00-execution-roadmap.md` and the relevant approved feature spec.
- Treat `Draft` specs and decision records as proposals. Do not infer unresolved product, API, auth, role, finance, or tenancy behavior. Record questions and request approval before implementation.
- Keep NestJS controllers, DTOs, services, permission guards, and tenant scoping aligned with the approved OpenAPI contract. Update the spec and contract baseline when an approved change alters behavior.
- Every protected operation must enforce backend authentication, permission, and tenant/object scope. Frontend route/navigation checks are not a security control.
- Add negative tests for missing permissions, invalid or missing active school, and cross-tenant identifiers where applicable. Use `withTenant` for school-owned data and do not claim production readiness while RLS/isolation gates remain incomplete.
- Do not introduce fake success responses for unimplemented features. Surface explicit errors and keep schema-only/planned capabilities marked as unimplemented.

## Validation

- Run the smallest relevant unit/e2e tests plus lint, typecheck, and build for the change.
- Verify generated OpenAPI against the approved spec.
- For tenant-sensitive work, include two-school isolation coverage and pooled-connection context-leak checks.
- Do not use real student or credential data in fixtures, logs, or documentation.
