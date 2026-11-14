# Super Admin end-to-end feature specification

**Status:** Approved product direction and recommended defaults; individual API contracts require implementation review\
**Owner:** Product / platform team\
**Updated:** 2026-11-14
**Related:** [Frontend LLD](./08-super-admin-workspace-lld.md),
[identity and tenancy](./02-identity-auth-tenancy-spec.md),
[role workspace design](./05b-role-workspace-design.md),
[platform directory contract](../api-contracts/platform-schools.openapi.yaml),
[release verification](./06-verification-and-release.md)

## Outcome and boundaries

Deliver an authenticated platform workspace for school provisioning, initial
administrator onboarding, school setup and CSV import, support, audit, and
approved platform settings. Overview and Schools must reflect real data.
Subscription, plan, invoice, billing and platform-user management are **future
scope** and must not be implemented or represented as live in this phase.

The user approved this specification on 2026-11-14. The recommended defaults
are the approved implementation direction; unresolved delivery configuration
and production RLS verification remain gated. Each endpoint and permission must still be reconciled with the
implemented controller, DTO and contract before it is represented as live.

## Current baseline

- Platform login requires an active `PlatformAdminGrant`; a platform account
  with an active school membership is rejected. The backend issues a
  platform-only session with `platform.schools.read` and any explicitly granted,
  unrevoked platform permissions. It cannot select a school or use
  school-scoped endpoints.
- `GET /api/v1/platform/schools` returns `id`, `name`, `code`, `isActive` and
  `createdAt`, audited with `Cache-Control: no-store`. The frontend overview
  and directory use only this metadata.
- School creation accepts a name and code and persists a separate
  `NOT_STARTED` onboarding state. The create response includes this state;
  the directory does not expose it. The selected-school detail endpoint
  returns the state when recorded, or null when unknown. School Admins can
  confirm completion after the required academic structure exists. Admin invitation delivery
  and CSV import are not implemented. Platform support provides internal tickets
  with separate read/write grants. Platform audit exposes only
  whitelisted, redacted platform-origin events; settings exposes enforced token
  lifetimes read-only. Existing school profile
  and audit endpoints require a school-scoped session and cannot be reused by
  forging or switching the platform session's tenant.
- Password reset delivery is unresolved. Existing audit entries contain both
  platform and school context; their presence does not grant platform operators
  unrestricted school-audit access.
- Tenant transaction context exists, but database RLS is not yet a verified
  production isolation boundary. Do not claim production-ready isolation until
  the release security gates pass.

## Personas and authorization

| Actor | Intended scope | Proposed actions | Denied by default |
|---|---|---|---|
| Platform Super Admin | Platform; explicitly targeted school setup operation | Read directory; create school and setup/import operations only after separate permission and object-policy approval | School switching, impersonation, unrestricted school records, billing and platform-user administration |
| Initial School Admin | One assigned school | Accept an authorized invitation and complete permitted onboarding | Platform access or access to other schools |
| School support requester | One authorized school | Create/view cases only if a support audience and object policy are approved | Other schools' cases and internal platform notes |
| Other authenticated roles / anonymous users | Their existing scope / none | Only existing granted capabilities | All platform operations absent a server-side grant |

Frontend route checks are UX only. Guards must verify active session, dedicated
platform grant, exact operation permission, and target/object policy on every
request. New permission strings require explicit server-side grants and must
not be automatically inferred from an existing grant. No backend role is added
by exposing a frontend link.

## Functional scope and states

### Overview and Schools

- Show live counts derived from authorized directory data; distinguish loading,
  empty, error, and stale/retry states. Do not invent onboarding, support,
  billing or audit metrics.
- The overview may show the current count of open and in-progress support
  tickets only with `platform.support.read`; the support summary is a
  separately authorized API read. Inactive directory status is not suspension.
- The Schools page counts recorded `NOT_STARTED` and `COMPLETED` onboarding
  states and separately counts unknown states using `platform.schools.read`;
  it does not infer a state for schools lacking a record.
- List/filter/search schools and open a metadata-and-onboarding detail. Current filtering
  and pagination are client-side over the complete API result; a future
  scalable server query needs a separately approved contract.
- Future lifecycle states such as invited, onboarding and suspended must not be
  inferred from the current `isActive` boolean.

### School creation and initial School Admin

1. Capture the proposed school identity and required setup fields. Validate
   normalized school code uniqueness server-side.
2. Select an approved account provisioning method. Prevent a platform account
   from being linked to a school, and avoid silently taking over an existing
   identity.
3. Create the school and approved membership/role state using separately
   transactional operations. Invitation and email delivery are a separate
   state machine, not a claim that an email was sent merely because an account
   row exists.
4. Track invitation creation, delivery, acceptance/expiry/revocation and first
   login/onboarding according to approved rules. Show failed delivery and retry
   accurately. Never expose password setup tokens or credentials in logs or UI.
5. Show only authorized setup milestones. Editing, suspending or reactivating a
   school requires its own confirmed lifecycle and audit policy.

### School setup and CSV

1. The operator chooses an explicit target school and approved data type. The
   backend validates the target and authorization for each operation; the
   browser cannot supply a tenant context that bypasses these checks.
2. Provide versioned templates with exact column names, data types, required
   fields, identifiers, examples using synthetic data, and dependency order.
   The approved initial order is academic years, classes, sections, staff,
   students with enrollments, then teacher assignments. Guardian matching and
   account creation are deferred.
3. Upload and parse under approved file/row/encoding limits. Reject malformed
   headers, invalid fields, duplicate identifiers and references outside the
   target school. A preview must describe row errors without claiming any
   writes have occurred.
4. Confirm against a validated immutable import version and explicit
   idempotency key. Revalidate relevant records at commit time to handle
   concurrent changes. Each file commits atomically and supports the approved
   idempotent retry behavior.
5. Show processing status, counts and authorized row-level results. Audit
   actor, target, type, outcome and correlation ID without CSV contents,
   credentials or unnecessary personal data. Apply the approved encryption,
   retention and cleanup controls below.

### Support and ticket detail

Provide a platform-only queue and ticket detail with status, priority, assignee,
history and an explicit resolution action. Tickets are tied to a known school,
may be unassigned or self-claimed, and use low, normal, high or urgent priority.
School-submitted tickets, school-scoped visibility, attachments, external
notifications and response-time promises remain deferred. Do not reuse school
membership as permission to view unrelated cases.

#### Support implementation contract

- An internal ticket has a known school, a 2–120 character title, a 1–4000
  character description, a priority (`LOW`, `NORMAL`, `HIGH`, `URGENT`),
  status (`OPEN`, `IN_PROGRESS`, `RESOLVED`), creator, optional self-claimed
  assignee, timestamps and a version. New tickets are open and unassigned.
  Ticket content is private platform data and must not contain credentials.
- `GET /platform/support-tickets` requires `platform.support.read` and returns
  a newest-first, stable cursor-paginated queue (default 25, maximum 100);
  it supports an optional status filter. `GET /platform/support-tickets/{id}`
  requires the same permission and returns ticket detail and the latest 100
  changes, newest first. Reads use `Cache-Control: no-store`.
- `POST /platform/support-tickets` and
  `POST /platform/support-tickets/{id}/actions` require both
  `platform.support.read` and `platform.support.update`, platform scope and
  the existing CSRF protections. Actions set priority or status, claim an
  unassigned ticket for the current operator, or release their own claim.
  Operators cannot claim a ticket assigned to someone else or release another
  operator's claim. Every action includes the last-read version; stale writes
  return 409 and must be reloaded.
- Ticket creation is not idempotent. After an interrupted or ambiguous create
  response, check the queue before retrying rather than assuming it failed.
  Ticket actions are not automatically retried; reload after a conflict.
- Open tickets may move to in progress or resolved; in-progress tickets may
  move to open or resolved; resolved tickets may only reopen to open. Same
  status/priority and invalid actions return 409. Resolution sets the retention
  clock; reopening clears it. Changes and redacted platform audit entries are
  written transactionally, without title or description in audit summaries.
- A monitored backend cleanup runs at startup and periodically while the
  service is running, atomically deleting tickets still resolved for 365 days
  and their history. Failures are logged as errors and must be monitored by
  platform operations. A stopped service cannot clean up until it restarts;
  backups remain subject to their own retention policy. Production deployment
  must verify cleanup monitoring and restore procedures.

### Platform audit and activity

Provide read-only, paginated platform activity only after defining which event
types, fields and actors a platform operator may see. Filter by approved
category/date/result, maintain stable ordering and redact secrets and
unnecessary personal data. The existing school audit endpoint is not a platform
audit endpoint. School event access, retention, self-auditing of reads and
export access require separate decisions. No claim of a fixed retention period
is valid until enforced and operationally verified.

### Platform settings

Display only settings whose configuration source, effective behavior,
authorization, validation and rollout semantics are implemented. Session
expiry, MFA, lockout, password links, maintenance mode and retention cannot be
represented as editable until the corresponding runtime enforcement and
recovery behavior exist. No billing/tax settings are in scope.

## API and persistence design — implementation review required

Paths and permission labels below are illustrative and must be reviewed against
actual controllers, DTOs and OpenAPI before implementation. Auth uses existing
browser cookies, CSRF checks for mutations and platform-only context.

| Operation | Candidate endpoint | Candidate permission | Proposed result |
|---|---|---|---|
| List schools | `GET /platform/schools` | `platform.schools.read` | Existing array of five approved metadata fields; 401/403 on denial |
| Create school | `POST /platform/schools` | `platform.schools.create` | Validated school identity and status; 400/409 for invalid/conflicting input |
| Create/read invitation | `POST /platform/schools/{id}/admin-invitations`, `GET /platform/schools/{id}/admin-invitations/{invitationId}` | Dedicated invitation permissions | Invitation state, delivery state and expiry, never a secret |
| Import template/validation/commit/results | `GET /platform/import-templates/{type}`, `POST /platform/schools/{id}/imports`, `POST /platform/schools/{id}/imports/{id}/commit`, `GET /platform/schools/{id}/imports/{id}` | Dedicated import read/write permissions | Versioned template, validation errors, job state/results; explicit target and idempotency |
| Support queue/detail/transitions | `/platform/support-tickets` and `/{id}` | Dedicated support read/write permissions | Authorized ticket pages and audited, validated transitions |
| Platform audit | `GET /platform/audit-events` | Dedicated platform audit read permission | Redacted, stable paginated event summaries |
| Settings read/update | `/platform/settings` | Separate settings read/write permissions | Effective values and validated, audited changes only where enforced |

All collection contracts must specify maximum page size, ordering, filters,
timezones, stable cursor semantics and error envelopes. Mutations need
validation, CSRF, conflict handling and retry/idempotency semantics. Unauthorized
and cross-school requests must fail server-side without revealing another
tenant's existence. Sensitive responses must use an agreed cache policy.

Candidate new persisted concepts include invitation delivery/acceptance,
validated import/job/row outcome, support ticket/transition and explicitly
supported platform setting values. Exact schemas, foreign keys, uniqueness,
indexes, retention, encryption, and migration/backfill must be specified per
approved slice; no raw passwords or CSV contents belong in audit summaries.
Existing `School`, `User`, `SchoolMembership`, `MembershipRole`,
`PlatformAdminGrant` and `AuditLog` models do not themselves implement these
flows.

## Approved default direction

Product approved these defaults on 2026-11-14. They are implementation
requirements, not evidence that the operations or grants already exist.
Any further choices explicitly identified as unresolved remain gated.

### Permissions and tenant boundary

- Propose `platform.schools.create`, `platform.invitations.create`,
  `platform.invitations.read`, `platform.imports.create`,
  `platform.imports.read`, `platform.support.read`, `platform.support.update`,
  `platform.audit.read` and `platform.settings.read`. Keep
  `platform.schools.read` unchanged. No settings-write permission is proposed
  until an enforced setting is identified.
- Assign new permissions only through an explicitly approved server-side grant
  mechanism. Do not infer them from the existing grant or token, and do not
  expose platform-user management in this phase.
- Every school-targeted operation validates the target ID and operation
  permission server-side, runs school-owned reads/writes through the tenant
  transaction boundary, and never creates a school-scoped platform session.
  Deny mismatched target/job or target/invitation identifiers without
  disclosing the other school's data.

### Provisioning and invitations

- Temporary shared-password account creation approved by product: a platform
  operator with a separate `platform.school-admins.create` grant can create
  a normal School Admin account using a shared password supplied through
  server configuration. It is not an invitation, does not verify email
  ownership or force a password change. A shared default password creates a
  security risk; replace it with individually delivered setup credentials and
  password rotation before relying on it for production.
  Passwords are never returned or written to audit logs. Reject existing
  accounts case-insensitively; create the user, school membership, standard
  school-scoped administrator role and redacted audit atomically. Repeated
  requests with the same email conflict; after an interrupted request, verify
  the result before retrying. Completion of onboarding remains separate.
- `POST /platform/schools/{id}/admins` requires platform scope,
  `platform.schools.read` and `platform.school-admins.create`, CSRF and a
  configured shared password of at least 12 characters. It accepts a
  first name, optional last name, and email, and returns account ID, normalized
  email and target school ID, never a password. Unsupported configuration
  returns 503; duplicate identities return 409, unknown/inactive school 404,
  and missing permission 403. No email is sent.
- Propose accepting an explicit school name and code and an administrator
  identity in separate operations. Create the school in a non-onboarded state;
  never mark onboarding complete merely because the school row exists.
- Propose a case-insensitive normalized email lookup. Reject an existing
  platform-granted account and return an explicit conflict for any other
  existing identity until an approved account-linking workflow exists. Do not
  overwrite credentials or assign an existing account automatically.
- Propose a one-time invitation token generated with a cryptographically secure
  random source, stored only as a verifier, expiring after 24 hours. Resending
  invalidates the previous unused token. Acceptance verifies email ownership,
  applies existing password security policy, and atomically activates the
  intended school membership and School Admin role.
- Product confirmed that onboarding completion requires an academic year,
  class and section, followed by explicit School Admin confirmation. Acceptance
  or first login alone must not mark onboarding complete. The confirmation
  endpoint is restricted to the active School Admin workspace with
  `school.update`; it checks the active school's academic year and an active
  class with an active section belonging to that school. It records
  `COMPLETED` as a historical confirmation, not an ongoing guarantee about
  later changes. Existing schools without a recorded state remain unknown
  until confirmation. The platform may read only the recorded state through
  the existing school-detail endpoint.
- The onboarding-completion migration was applied to the configured local
  database after explicit approval. Isolated PostgreSQL HTTP tests cover
  cross-school prerequisites, CSRF, platform denial, concurrent confirmation
  and the platform detail state. Invitation creation and delivery remain
  unimplemented; SES region and verified sender are not configured.
- Propose transactional outbox delivery: persist the invitation and delivery
  request atomically, then send through an approved provider. Track `queued`,
  `sent` or `failed` separately from `pending`, `accepted`, `expired` or
  `revoked`; a provider timeout is never presented as successful delivery.
  Amazon SES is the selected provider. A verified sender, SES region,
  deployment credentials, provider access and delivery monitoring still need
  configuration and verification; never store credentials in the repository.

### Import contract

- Bulk CSV implementation is deferred at product request; its pages remain
  clearly marked as previews. The approved decisions below are retained for
  a future implementation.
- Propose UTF-8 CSV with a versioned, exact header; a maximum of 5 MiB and
  5,000 data rows per upload; reject duplicate headers, malformed quoting and
  unexpected columns. These are reviewable limits, not present system limits.
- Propose initial create-only imports in dependency order: academic years,
  classes, sections, staff, students with enrollments, then teacher assignments.
  Guardian matching and account creation are deferred until separately defined.
  Use explicit stable school-scoped codes for references; reject ambiguous,
  missing, inactive or cross-school references rather than guessing.
- Product approved using the existing school-unique academic-year name as the
  year reference because the current model has no separate year code. Student
  imports may reference `DRAFT` or `ACTIVE` years and must reject `COMPLETED`
  years; newly created years currently remain `DRAFT` and no activation flow
  is implied by an import.
- Propose all-or-nothing commit for each file. Validate every row before commit,
  bind the confirmation to a server-generated validation version and
  idempotency key, revalidate within the commit transaction, and roll back all
  rows on any conflict. Repeating the same key and payload returns the prior
  outcome; reusing a key with different content returns a conflict.
- Propose a 24-hour expiry for uncommitted uploads and validation results,
  followed by deletion of source data; retain only redacted job summaries for
  30 days. Row errors show row number, field and reason, not entire submitted
  rows. Encrypt stored import data using versioned deployment-managed keys.
  Platform operations owns monitored cleanup of expired uncommitted data and
  redacted summaries. Backup expiry follows the deployment's backup policy;
  deletion from live storage alone is not proof of backup deletion.

### Support, audit and settings

- Propose platform-only internal tickets first, each tied to a known school,
  with `open`, `in_progress` and `resolved` states. Resolution is explicit and
  audited; reopening moves `resolved` to `open`. Defer school-submitted tickets,
  attachments, external notifications and response-time promises until their
  object-level authorization and provider policies are approved.
- Use low, normal, high and urgent priority, with tickets unassigned or
  self-claimed. Platform operations owns monitored deletion of resolved
  tickets after 365 days; reopening cancels the pending deletion. Audit logs
  must be redacted and must not contain ticket text. Backup expiry follows the
  deployment's backup policy.
- Propose platform audit reads limited to platform-originated events, with
  bounded pagination and a whitelist of safe fields. Exclude tenant audit
  contents, free-form secrets and raw CSV; audit the audit read itself. A
  proposed 365-day retention requires approved storage and deletion controls.
- Propose settings be read-only until each exposed value is backed by an
  enforced runtime mechanism, defined administrator permission and verified
  recovery procedure. Do not display configured-but-unenforced values as
  active controls. Billing/tax configuration remains future scope.

### Minimum negative acceptance cases

- No platform grant or missing operation permission: deny before any write.
  Revoked grants and inactive users cannot reuse existing sessions.
- An invitation or import for a different school, or a school-scoped session
  claiming platform permissions: deny without exposing cross-school data.
- Duplicate school code, reused invitation, expired token, invalid CSV header,
  invalid row, stale preview and mismatched idempotency payload: fail without
  partial success. Concurrent commits of the same job apply no rows twice.
- Failed or timed-out email delivery remains failed or unknown, never sent.
  Logs, errors, audit summaries and downloads do not contain invitation secrets.
- Unauthorized support tickets and audit events remain inaccessible by ID and
  list queries. Unimplemented settings cannot be saved or represented as
  enforced.

## Delivery order and acceptance

1. **Directory and selected-school detail:** preserve the platform-only
   boundary, show selected metadata and the recorded onboarding state, and
   handle missing records and failures. The detail uses the existing
   `platform.schools.read` permission.
2. **Provisioning and invitation:** implement approved least-privilege
   permissions and school creation; delivery remains gated on a configured,
   approved provider. Define OpenAPI and migration, then deliver invite →
   accept → school-admin onboarding with failure/retry and authorization tests.
3. **Targeted setup and imports:** implement approved initial entities and
   semantics with two-school isolation and concurrency/idempotency tests; keep
   explicitly deferred guardian and account handling out of scope.
4. **Support:** implement the approved platform-only initial workflow, with
   positive/negative authorization tests.
5. **Platform audit:** implement the approved platform-origin event boundary
   with redaction, audited pagination and access controls.
6. **Settings:** expose only enforced controls with effective-value and rollback
   tests; writes remain separately gated.

For each slice, update the approved spec, OpenAPI and contract baseline before
or alongside implementation. Add DTO/controller/service, frontend adapter and
UI tests for success, validation, 401/403, cross-school access, stale states,
retry and unavailable dependencies. Add database migrations and rollback
guidance when necessary. Use synthetic fixtures, no real student or
credential data, and no demo fallback in API mode. Record integration evidence
against an isolated test database and verify deployed-role RLS before release.

## Remaining operational decisions and release gates

- **Invitations:** Amazon SES is selected, but the region is unknown, the
  sender is not yet configured, and the SES sending-access status is unknown.
  Deployment must configure and verify provider access, a verified sender,
  region and delivery monitoring before live delivery can be enabled.
- **Imports:** implement and verify encryption, versioned key management,
  monitored cleanup and backup handling; approval alone does not make these
  controls operational.
- **Support:** production deployment must configure monitoring for the cleanup
  success/error logs, verify backup expiry and recovery procedures, and deploy
  the migration and explicit grants.
- **Audit:** tenant-event access and any audit-retention policy remain separate
  decisions; the 365-day ticket retention does not apply to audit records.
- **Settings:** additional writable controls remain gated on implemented
  enforcement and recovery.
- **Release:** verify deployed-role RLS, least privilege and two-school
  isolation; tenant context alone is not proof of enforced database isolation.

The approved directions do not broaden existing platform grants or make
unimplemented operations available.

## Initial implementation evidence (2026-11-14)

- The selected-school page is connected to the existing directory adapter and
  displays only the selected entry's authorized metadata. It has loading,
  failure/retry and missing-school states; onboarding and activity remain
  visibly unavailable. No backend or database schema was changed.
- The Schools page can download the currently filtered directory across all
  client-side pages as a locally generated CSV. It uses only the existing
  directory response, protects spreadsheet formula-like values, and does not
  create a server export job or separately audited export event.
- Frontend focused tests passed (59 tests), changed-file lint passed, and the
  production frontend build/typecheck passed. Integration tests use simulated
  HTTP responses; no live database-backed test is claimed.
- The directory export and existing attendance-export regression suite passed
  20 focused tests; the frontend production build and changed-file lint passed.

## School creation slice

- `POST /api/v1/platform/schools` requires platform scope and an explicitly
  granted `platform.schools.create`. Existing grants are not upgraded
  automatically. Each request resolves permissions from the database, not
  token claims. The existing read permission remains separate.
- The name is trimmed (2–120 characters); the code is trimmed, uppercased,
  limited to 2–32 letters, digits or hyphens, and must start with a letter or
  digit. Duplicate codes return a conflict. The school, a separate
  `NOT_STARTED` onboarding row and a creation audit event are atomic.
- This operation sends no invitation, creates no administrator, and does not
  assert that onboarding is complete. The school remains subject to existing
  `isActive` defaults; that field is not an onboarding indicator.
- The original local seed used an explicit opt-in flag and demo identity for
  this permission. The current bootstrap instead creates one dedicated platform
  administrator with all six implemented explicit platform grants, without demo
  data. It does not elevate an existing identity or restore a revoked grant.
  Revocation requires an authorized database operator; there is no platform
  user-management UI.
- The creation form and navigation are API-mode and permission gated; backend
  checks remain authoritative. The form redirects to detail, which shows a
  recorded state without inferring onboarding state from `isActive`.
- Migration `20261114000000_platform_school_provisioning` is additive and
  does not backfill existing schools or permissions. Reversal requires an
  operator-reviewed migration and must not drop data indiscriminately.
- Verification: 38 backend tests, backend typecheck and build, 82 focused
  frontend tests, changed-file lint and the frontend production build passed.
  An isolated PostgreSQL HTTP check exercised login,
  explicit permission grant and revocation, CSRF, invalid input, successful
  creation, duplicate conflict, persisted onboarding state and audit event.
  The isolated container was removed afterward. This is not a production RLS
  verification.
- Operational incident: while preparing the isolated migration test, Prisma
  used the configured `DIRECT_URL` and applied this additive migration to the
  existing configured database. No seed or permission grant was run against
  that database. No rollback was attempted. Later verification explicitly
  set both database URLs to an isolated database.

## Platform audit slice

- `GET /api/v1/platform/audit-events` requires platform scope and separately
  granted `platform.audit.read`. It only selects event ID, UTC time, actor ID
  and whitelisted action from platform-origin rows with no school context.
  Summaries, addresses and school audit records are excluded. Each successful
  read records a platform audit event in the same transaction.
- Results use bounded keyset pagination (25 by default, maximum 100), stable
  time/ID ordering and optional action and inclusive UTC date filters. Only
  currently recorded successful platform events are shown. Filtering by
  failure is unavailable because failure events are not collected here.
- Audit read is included when the current seed creates a new platform
  administrator. Existing grants are not automatically extended or restored.
  New grants are audited.
- The frontend shows the real audit page only in API mode with that permission;
  otherwise it denies access or, in mock mode, displays a marked preview. The
  overview uses the same permission to show up to three recent platform events.
  No retention duration, export or tenant event access is claimed.
- The additive audit migration was applied to the configured local database
  after explicit approval; other databases require deliberate deployment.
- Verification against isolated PostgreSQL covered denied and revoked access,
  redaction, tenant-event exclusion, cursor pagination and audit-read events.
  Focused backend and frontend tests and a frontend build also passed. This
  does not verify production RLS.

## Platform settings slice

- `GET /api/v1/platform/settings` requires platform scope and an explicit
  `platform.settings.read` grant. It returns access-token and refresh-token
  lifetimes in seconds using the same configuration helper as credential
  issuance and cookies. Each read is audited. Invalid configuration or an audit
  write failure is surfaced, not shown as a default or successful result.
- Values describe the current service configuration for newly issued tokens;
  existing tokens retain their issuance-time expiry. The UI is read-only and
  does not claim that MFA, lockout, maintenance, retention or billing settings
  are implemented.
- Settings read is included when the current seed creates a new platform
  administrator. No existing grant is silently extended.
  Settings are changed only through the existing deployment configuration and
  restart process; no settings-write permission or endpoint is introduced.
- The additive settings migration was applied to the configured local database
  after explicit approval; other databases require deliberate deployment.
  Reverting configuration means restoring the prior deployment values
  and restarting; this does not retroactively change issued credentials.
- Verification against isolated PostgreSQL covered denied and revoked access,
  audit recording and agreement with actual JWT and cookie lifetimes. Focused
  backend/frontend tests, typechecks and both application builds passed.
- Subsequent regression runs passed 125 backend tests and 157 frontend tests.
  Prisma client generation succeeded with a temporary output directory; the
  running local process held the default Windows engine DLL open, preventing
  its replacement. Restart that process before regenerating its client when
  deploying the new permissions.

### Authorized local enablement

- After explicit user approval, Prisma migration status confirmed that only
  the audit and settings migrations were pending on the configured localhost
  database. Both were deployed, and migration status then reported up to date.
- The configured seed identity matched the only active platform administrator.
  The audited permission helper granted `platform.schools.create`,
  `platform.audit.read` and `platform.settings.read` without running the
  broader seed. A database read verified all three active grants and three
  corresponding permission-grant audit records. Other deployments remain
  unchanged.
- A local HTTP smoke check verified platform login, all three returned
  permission keys, successful directory, audit and settings reads, and logout
  of the temporary session.

## Platform support slice

- The API-mode support queue and detail use real tickets, separate read/update
  permissions, versioned actions and redacted transactional audit events.
  Mock mode remains a labeled preview. School-submitted tickets, attachments
  and notifications remain unavailable.
- After explicit approval, migration `20261114030000_platform_support` and
  `platform.support.read` / `platform.support.update` were applied only to the
  configured local database and administrator, without running the broad seed.
  An authenticated local smoke check confirmed both permission keys and a
  successful support list read.
- Cleanup runs on backend startup and hourly. It deletes only tickets still
  resolved for at least 365 days and cascades their history. Application logs
  record success or failure; production monitoring and backup retention
  require operational verification. A stopped service cannot run cleanup.
- Focused backend and frontend tests, typechecks and application builds passed.
  An isolated PostgreSQL HTTP test covered permission denial and revocation,
  CSRF, unknown school, create, claim, conflict, resolution, reopen, history,
  audit redaction, and the exact 365-day cleanup boundary. This does not verify
  production RLS.
- The default Prisma generation reported a Windows engine-file lock held by
  the running backend and Studio. A separate generated client succeeded; the
  locked installed engine matched its generated checksum, and the generated
  support client was exercised successfully by the isolated and local tests.

## Selected-school onboarding state

- `GET /api/v1/platform/schools/{id}` requires platform scope and
  `platform.schools.read`. It uses transaction-local context for the explicit
  target, returns directory metadata and the recorded onboarding state, and
  audits successful reads. It does not expose school records or switch the
  operator into school scope.
- New schools report `NOT_STARTED`; existing schools without a persisted state
  return null and display “not recorded.” A school’s active flag is not an
  onboarding state. The endpoint does not claim that any invitation has been
  sent or administrator provisioned.
- Verification against isolated PostgreSQL covered authenticated reads,
  recorded and unknown states, invalid/missing IDs, safe response fields and
  platform audit events. Focused frontend/backend tests, typechecks and builds
  passed; this does not establish production RLS.
