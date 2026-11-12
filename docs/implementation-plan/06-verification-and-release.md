# Verification, Security, and Release Criteria

**Status:** Proposed acceptance baseline  
**Applies to:** Both Dashify repositories and coordinated staging

## Per-change checks

### Frontend

- Run the repository lint and production build.
- Add/run focused unit tests for role policy, service adapters, view-model mapping, and route/workspace behavior.
- Verify the actual API mode path; tests must fail if configured API calls silently use mock data.
- Test loading, empty, validation, unauthorized, forbidden, not-found, conflict, network, and retry states where relevant.
- Confirm mobile navigation and keyboard/accessibility behavior for changed workspaces.

### Backend

- Run lint, typecheck, unit tests, build, and relevant e2e tests.
- Test DTO validation, permission denial, missing active school, invalid resource identifiers, and expected error envelope.
- Confirm tenant-scoped service operations use `withTenant` where required.
- Verify generated OpenAPI reflects the approved operation and schema.

### Cross-repository

- Run at least one real integration test against the backend using the frontend adapter or a shared contract test.
- Verify URL prefix, methods, headers/credentials, DTO serialization, response mapping, pagination, and errors.
- Pin the contract version or commit pair used for the integration test.
- Avoid parallel changes that modify the same endpoint contract without coordination.

## Security and tenant-isolation release gate

Before any production or sensitive-data release:

- [ ] RLS policies cover all tenant-owned tables and are enabled/forced as intended.
- [ ] Runtime DB role is not the table owner and has no `BYPASSRLS`.
- [ ] Two-school fixtures prove cross-school reads, updates, deletes, and relationship/reference attempts are denied.
- [ ] Pooled connection tests prove transaction-local tenant context does not leak between requests.
- [ ] Active-school selection requires an active membership; revoked/inactive membership is denied.
- [ ] Every protected endpoint has a permission requirement and negative tests.
- [ ] Object-level access is verified for students, guardians, attendance, documents, and other sensitive records.
- [ ] Authentication expiration, refresh rotation/reuse, logout revocation, and rate limits are tested as applicable.
- [ ] Logs redact passwords/tokens and do not expose student PII or document contents.
- [ ] CORS, cookies, TLS, secrets, and environment config are reviewed for deployment.

Frontend route guards are not evidence for any item in this checklist.

## Staging acceptance

- Seed only synthetic data.
- Exercise all supported roles and multiple-school accounts using approved permissions.
- Test school switching and confirm no stale data from the previous school remains visible.
- Verify audit events for sensitive mutations.
- Confirm monitoring, error reporting, backup, restore, rollback, and support ownership.
- Record known gaps and secure product sign-off before release.

## Release evidence

For each release candidate, attach:

- Frontend/backend commits and environment/config version.
- CI results and focused integration/e2e results.
- OpenAPI artifact and contract diff.
- Permission/tenant-isolation test results.
- Migration and rollback instructions.
- UAT approval, known limitations, and operational owner.

## Stop-ship conditions

- Any cross-tenant data access or permission bypass.
- Production use with RLS/least-privilege requirements unresolved.
- A protected UI feature with no server authorization.
- Silent mock fallback while API mode is configured.
- Contract mismatch that can lose, mis-scope, or misrepresent sensitive data.
- Required migration without tested backup/restore or rollback plan.
