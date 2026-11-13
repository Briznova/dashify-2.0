# Super Admin workspace low-level design

**Status:** Approved for frontend previews, directory and school creation
**Owner:** Product (user approval, 2026-11-13)
**Reference:** Super Admin.pdf supplied by product; [platform directory contract](../api-contracts/platform-schools.openapi.yaml)

## Outcome and boundaries

Provide the 13 views depicted in the supplied, single-page design board. The
user approved developing the frontend immediately, connecting existing backend
capabilities and explicitly marking unsupported pages as dummy. This approval
does not decide new API, authorization, provisioning, tenancy, finance,
retention, support, or security policies. Design values such as prices, GST,
timeouts and retention are illustrations, not implemented defaults.

Platform authority remains a dedicated platform grant, not a school role.
Platform sessions cannot switch schools, impersonate users, or access
school-scoped records. Navigation is presentation only; backend guards remain
authoritative. The separately approved creation slice is described in the
[end-to-end spec](./09-super-admin-end-to-end-spec.md).

## Design inventory and routing

The design uses a shared sidebar, header, cards, tables, status chips and
blue primary actions. Its primary navigation is Overview, Schools,
Subscriptions, Billing, Platform users, Support, Audit log and Platform
settings. Additional views represent drill-downs or setup steps.

| Design view | Frontend route | Delivery |
|---|---|---|
| Platform overview | `/dashboard` | Live directory totals and school metadata only; unsupported overview elements are labeled preview. |
| Schools | `/dashboard/schools` | Live directory, client-side search and status totals; create action requires an explicit grant. |
| Create school | `/dashboard/schools/new` | API-backed name and code creation; no invitation is sent. |
| Create school admin | `/dashboard/platform/create-school-admin` | Dummy form, submission disabled. |
| Invitation status | `/dashboard/platform/invitation-status` | Dummy lifecycle illustration; no invitation sent. |
| School detail | `/dashboard/schools/[id]` | Read-only metadata and recorded onboarding state; no school-record access or edit. The generic design preview remains available separately. |
| Subscriptions | `/dashboard/platform/subscriptions` | Dummy subscription and renewal layout. |
| Manage plans | `/dashboard/platform/plans` | Dummy plan layout; no pricing rules. |
| Billing / invoices | `/dashboard/platform/billing` | Dummy invoice and summary layout. |
| Platform users | `/dashboard/platform/users` | Dummy platform-team layout. |
| Support queue | `/dashboard/platform/support` | Permission-gated internal ticket queue and creation in API mode; mock mode is a labeled preview. |
| Support ticket detail | `/dashboard/platform/support-detail?id=...` | Permission-gated ticket history and actions in API mode; mock mode is a labeled preview. |
| Audit log | `/dashboard/platform/audit-log` | Permission-gated redacted platform events in API mode; mock mode remains a marked preview. |
| Platform settings | `/dashboard/platform/settings` | Permission-gated read-only enforced token lifetimes; mock mode remains a marked preview. |

Additionally provide a clearly marked school-setup / CSV import preview for the
requested complete school setup workflow. It cannot upload, validate, store, or
import data until a separate contract and policy are approved.

## Data and interaction design

- API-mode login, restoration and logout use existing cookie-backed auth.
- `GET /api/v1/platform/schools` requires `platform.schools.read` and returns
  `id`, `name`, `code`, `isActive`, `createdAt`. The existing adapter validates
  the response; the existing hook supplies cancellation, loading, error, and
  retry. School counts are derived from that complete returned array. Search
  is local by name/code, with local active/inactive status filtering and
  pagination; no server pagination or status filter is implied.
- No preview page calls school-scoped APIs or silently falls back to mock data.
  Each unsupported page displays a prominent persistent dummy warning and uses
  empty/illustrative states. Disabled operations must not report success.
  Preview-only links may navigate between the depicted static views.
- In mock mode the platform directory is demo data and is labeled accordingly.
  API mode never labels demo data live.
- Preserve the shared responsive shell and other roles' routes and capabilities.
  The new preview routes are restricted in frontend UX to Super Admin. This is
  not an authorization boundary and must not imply additional server grants.

### Component responsibilities

- `platform-pages.ts` is the closed list of preview route keys, labels and
  navigation icons. The role policy exposes the primary items and checks exact
  preview route keys; unknown or nested keys are not authorized by the UI.
- The dynamic platform route resolves only known keys. `PlatformPreview`
  composes shared headings, panels, tables and disabled actions. It uses no
  hooks, persistence, uploads, credentials or network calls.
- The shared dashboard shell handles session loading, role routing, navigation,
  sign-out and responsive menu. A platform session is presented as platform
  administration, never as an active school.
- `PlatformSchoolsDirectory` uses the existing school-data hook and HTTP
  adapter for both the overview and Schools route. API data is never mixed
  with illustrative rows. Demo mode is visibly marked.

### View behavior

- **Overview:** show active schools and the total/inactive directory counts,
  plus explicitly unavailable revenue, renewal and support metrics. Show up to
  five matching schools and links to the full directory, subscription preview
  and audit view. The activity panel reads up to three redacted platform events
  only with the audit permission; renewal information remains a dummy preview.
- **Schools:** show the full validated directory with client-side name/code
  search, active/inactive status filtering and six-row pagination. The
  onboarding, invitation and suspension metrics and subscription filter are
  unavailable previews. Both tables show only name, code, active state and UTC
  creation date. A school name opens its read-only directory detail; it does
  not enter a school context or enable writes. Setup and invitation links lead
  to previews.
- **School directory CSV:** download the filtered directory results across
  all client-side pages, using only existing directory fields. The download is
  generated locally, has no server-side export job or separate export audit,
  and is disabled while loading, on error or when no results match. Neutralize
  spreadsheet formula prefixes and quote CSV fields. Label demo-mode data.
- **Create school:** API-mode platform sessions with both directory-read and
  create permissions can submit a validated name and code. Errors remain
  visible; success navigates to detail. The separate onboarding state starts
  at `NOT_STARTED`.
- **Create admin / invitation:** show disabled identity and school context
  fields, followed by a disabled send action. A separate static invitation
  lifecycle is navigable for review but does not indicate a real invitation.
- **School detail:** request the selected ID through the guarded detail
  endpoint and show directory metadata plus the recorded onboarding state.
  A null state is unknown, not inferred from active status. Missing IDs show
  an explicit not-found state; loading and API failures retain retry. The
  backend sets transaction-local tenant context for the target but exposes no
  school-scoped session or school records. Mock mode is labeled; account
  management and invitation delivery remain unavailable.
- **Subscriptions / plans:** show example table structure, renewal follow-up
  and a linked plan comparison layout. All pricing, limits and actions remain
  unspecified and unavailable.
- **Billing / users:** show illustrative table columns and placeholder
  summaries. Their actions remain disabled.
- **Support:** show real internal tickets in API mode with separate read/update
  permissions, create, priority, self-claim, resolution and reopening. The
  backend is authoritative; school-facing tickets and notifications are not
  implemented.
- **Audit:** the real API-mode view shows only whitelisted platform event type,
  timestamp and actor ID with action/date filters and cursor pagination.
  Deny access without the dedicated permission; no retention or school-audit
  visibility is implied.
- **Settings:** show only access and refresh credential lifetimes enforced by
  the backend. Access requires a separate permission; saving and unrelated
  security or operations settings remain unavailable.
- **School setup / CSV:** describe the sequence and provide preview navigation
  to the admin invitation. Template download and upload are disabled; no
  file is accepted or stored.

### State, failure and access handling

The directory hook begins in loading state, aborts in-flight loads on unmount,
and replaces data with an explicit error on rejection. Retry issues a new
request. Empty responses and unmatched searches render the table's empty state.
The adapter rejects malformed responses rather than substituting demo data.
If the session has no directory permission, the overview displays an access
message and the Schools navigation is hidden. Server-side 401/403 responses
remain authoritative regardless of client navigation.

Preview navigation is permitted only for the frontend Super Admin role; its
content contains no private data and no privileged requests. Missing or unknown
preview routes are not treated as valid pages. Controls are keyboard-readable,
and table containers scroll horizontally on narrow screens. The design board is
a visual reference: its sample statuses and suggested service targets are not
evidence of persisted backend state.

## Dependencies and rollout

The creation slice requires the additive backend migration, the creation
endpoint and an explicit server-side permission grant. Deploy the frontend
independently of the backend. The existing platform directory
contract must remain available for live data; otherwise show the error and retry
state. Future implementation should replace one preview at a time only after
its decisions and contracts are approved, removing the dummy warning only when
all data and actions presented on that page are real and tested.

## Proposed capability flows (not implemented)

1. School provisioning: create or invite a School Admin, track invitation,
   onboarding and account status, then configure the target school.
2. CSV setup: select an explicitly authorized target and entity type, download
   a versioned template, validate and preview rows, confirm import, and review
   results and row errors. No credentials are created implicitly.
3. Commercial operations: inspect subscriptions and renewals, manage plans,
   invoice and payment workflows, with explicit commercial rules.
4. Remaining platform operations: school-facing support requests and other
   enforced configuration, with narrowly scoped permissions. Internal support,
   read-only audit and token lifetimes are implemented; platform-user management
   remains future scope.

Before additional real writes or new reads, approve schemas, actor and tenant
permissions, invitation delivery and account lifecycle, CSV identifiers,
validation/duplicates/partial success/idempotency/retention, finance and tax
semantics, support authorization, audit retention, and security settings.
Define contracts and add server authorization, audit and isolation tests first.

## Acceptance and verification

- All 13 design views and the CSV setup preview are navigable in the Super Admin
  workspace; every unsupported view visibly states it is dummy and cannot
  execute mutations. Other roles cannot navigate directly to platform previews.
- The live directory shows only backend fields, true loading/error/empty states,
  retry and name/code search. No unsupported metric is presented as live.
- Platform-only sessions never select or query a school context. Missing
  directory permission does not expose directory data.
- Focused frontend tests cover preview routing and warning, disabled actions,
  permission gating, directory states and unchanged role behavior; run lint,
  typecheck and production build. Visual layouts remain usable on narrow screens.

### Verification evidence (2026-11-13)

- Frontend: 127 tests passed across 19 files; the final focused suite passed
  66 tests. Production build and TypeScript validation passed. Lint passed for
  changed files; full-project lint remains blocked by a pre-existing
  `react-hooks/set-state-in-effect` error in `student-record.tsx`.
- Backend: 17 existing tests passed across auth, JWT guard and platform
  directory service suites. The frontend integration test exercises the real
  hook and HTTP adapter with a simulated HTTP server response; it is not a
  live database-backed end-to-end test.
- Browser: mock-mode Super Admin sign-in, overview and subscription preview
  navigation were checked, including the warning and a narrow-screen menu.
  The Next.js development navigation inspector also reported the existing
  dashboard shell's dropped-segment insight; production build completed.
