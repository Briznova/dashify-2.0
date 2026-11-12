# Frontend/Backend Contract Baseline

**Status:** Observed baseline; not an approved target contract  
**Last reviewed:** 2026-11-12 (live local validation)

## Current architecture snapshot

### Frontend

- Next.js App Router, TypeScript, CSS Modules.
- `src/services/auth-service.ts` and `school-service.ts` define UI-facing service contracts.
- `src/services/http/` contains HTTP adapters; `src/services/mock/` contains browser mock implementations.
- `src/services/index.ts` selects API mode using `NEXT_PUBLIC_DASHIFY_API_MODE === "api"`.
- `src/services/api-client.ts` sends `credentials: "include"` but does not attach a bearer access token.
- `src/types/auth.ts` models one `UserRole` and an optional `schoolName`; it does not model memberships, active school ID, or permissions.
- HTTP service paths are relative to the configured base URL; the documented backend prefix is not included in the adapter paths.

### Backend

- NestJS REST API; `src/main.ts` applies `API_PREFIX` defaulting to `api/v1`.
- Controllers observed for auth, schools, academic structure, students, attendance, and audit logs.
- JWT authentication reads an `Authorization: Bearer ...` header.
- School-scoped APIs require an active school ID and permission keys from the token.
- Prisma schema includes memberships, roles, permissions, refresh tokens, password-reset tokens, and multiple planned domains.
- `docs/implementation-plan.md` labels RLS, refresh rotation, password-reset delivery, finance, dashboard/comms, and other work incomplete or blocked.

## Verified local runtime and baseline checks

### Configuration and environment

- Frontend Next.js dev server defaults to port `3000`; backend defaults to port `3000` as well. The frontend README's API example uses backend port `3001`.
- Backend `API_PREFIX` defaults to `api/v1`; frontend adapter paths omit that prefix. Including the prefix in the API base URL still leaves endpoint and method mismatches.
- Backend CORS defaults to `http://localhost:5173`, while this Next.js frontend defaults to `http://localhost:3000`.
- Backend Docker Compose maps PostgreSQL host port `5433` to container port `5432`; backend `.env.example` database URLs use host port `5432`.
- Frontend README instructs copying `.env.example`, but the frontend repo has no `.env.example`. The actual mode switch is `NEXT_PUBLIC_DASHIFY_API_MODE=api`; absent/other values select the mock adapter. The API base URL variable is `NEXT_PUBLIC_DASHIFY_API_BASE_URL`.
- A temporary local verification used backend port `3001`, CORS origin `http://localhost:3000`, and database port `5433`; no `.env` files or secrets were created. These overrides prove the processes can run together but do not fix committed defaults/documentation.
- Backend `.env.example` defines database, token-secret, token TTL, API prefix, app URL, CORS origin, logging, and storage settings. Secret values were not copied into this plan.
- Docker Compose created the local `dashify-backend_dashify_pgdata` volume for checks. The container was stopped; the volume was deliberately retained.

### Baseline results

| Repository | Check | Result |
|---|---|---|
| Frontend | `npm ci --no-audit --no-fund` | Passed |
| Frontend | `npm run lint` | Passed |
| Frontend | `npm run build` | Passed; Next.js generated routes |
| Frontend | `npm run dev -- --port 3100`, GET `/` and `/auth/sign-in` | Passed; root redirects to sign-in; sign-in responds 200 with API mode unset (mock default) |
| Backend | `npm ci --no-audit --no-fund` | Passed |
| Backend | `npm run prisma:generate` | Passed |
| Backend | `npm run lint` | **Blocked:** ESLint 9.39.5 cannot find `eslint.config.*`; no ESLint config file is present |
| Backend | `npm run typecheck` | Passed |
| Backend | `npm test -- --runInBand` | Passed; 2 suites, 7 tests |
| Backend | `npm run build` | Passed |
| Backend | `npm run format:check` | **Failed baseline:** Prettier reports 42 source/test files need formatting; no files were changed |
| Backend | `npm run test:e2e -- --runInBand` with local PostgreSQL | Passed; 1 health E2E test |
| Backend | `/api/v1/health/ready` | Passed; returned `{"status":"ready"}` |
| Backend | `/docs-json` | Passed; returned OpenAPI 3.0.0, title `DASHIFY API`, version `1.0.0` |

Install-session correction: the first `npm ci` attempt ran from the unrelated Briznova website working directory and failed with `EPERM` while attempting to clean its existing `node_modules`. A follow-up check found 16 declared direct dependencies missing from that directory. They were restored with `bun install --frozen-lockfile`; all 73 declared direct dependencies are present now, and the website Git worktree remains clean. Both Dashify installs were then run with explicit repository working directories. No tracked dependency manifests or lockfiles changed.

### Observed role/workspace behavior

| Frontend role | Home path | Current sidebar baseline |
|---|---|---|
| Super Admin | `/dashboard` | Overview, Schools, Students, Staff, Classes, Attendance, Fees, Academics, Analytics, Reports |
| School Admin | `/dashboard` | Same as Super Admin except Schools |
| Principal | `/dashboard` | Same as School Admin |
| Teacher | `/dashboard/teacher` | Overview, My teaching day, Classes, Attendance, Academics |
| Accountant | `/dashboard/accountant` | Overview, Finance overview, Fees, Reports |
| Parent | `/dashboard/parent` | Overview, My child |
| Student | `/dashboard/student` | Overview, My learning, Academics |

Settings is currently allowed to Super Admin, School Admin, and Principal. The four portal roles render portal dashboards; the other three render school dashboards. This table records current UI behavior only, not approved backend permissions.

### Live OpenAPI route inventory

OpenAPI was retrieved from the running local backend's `/docs-json` endpoint. The document had 19 path entries:

| Method(s) | Path |
|---|---|
| GET | `/api/v1/health/live`, `/api/v1/health/ready` |
| POST | `/api/v1/auth/login`, `/api/v1/auth/logout`, `/api/v1/auth/active-school` |
| GET | `/api/v1/auth/me`, `/api/v1/auth/schools` |
| GET, PATCH | `/api/v1/schools/current` |
| GET, POST | `/api/v1/academic-years`, `/api/v1/classes` |
| POST | `/api/v1/sections` |
| GET, POST | `/api/v1/students` |
| GET | `/api/v1/students/{id}` |
| POST | `/api/v1/students/{id}/archive` |
| GET, POST | `/api/v1/attendance/sessions` |
| PUT | `/api/v1/attendance/sessions/{id}/records` |
| POST | `/api/v1/attendance/sessions/{id}/close` |
| GET | `/api/v1/audit-logs` |

The inventory above is the live OpenAPI snapshot taken before the Phase 4 attendance roster addition. The current backend controller now also exposes `GET /api/v1/attendance/sessions/{id}/roster`; the live OpenAPI document was not regenerated after that change. The snapshot confirmed the then-missing frontend-expected dashboard, staff, reports, finance, assignments, signup, reset, and refresh endpoints.

## Endpoint comparison

| Capability | Frontend expectation | Backend observed | Status / next action |
|---|---|---|---|
| API prefix | Frontend base URL documentation describes backend URL; adapters call paths such as `/auth/sign-in` | Global prefix defaults to `/api/v1` | **Mismatch.** Define one base URL convention and test it. |
| Login | `POST /auth/sign-in` with `SignInInput` including `rememberMe`; expects `AuthSession` | `POST /api/v1/auth/login`; `LoginDto` requires email/password (minimum 10 chars); returns access + refresh tokens and a partial user | **Mismatch.** Current frontend body includes `rememberMe`, which the backend global validation pipe rejects as non-whitelisted. Agree request/response and remember-me semantics. |
| Session restore | `GET /auth/session`, expects `AuthSession | null` | `GET /api/v1/auth/me`, requires Bearer access token, returns a partial user profile | **Mismatch.** Define token renewal and session shape. |
| Logout | `POST /auth/sign-out`, no body | `POST /api/v1/auth/logout`, expects refresh token in body | **Mismatch.** Align revocation and client credential lifecycle. |
| Sign-up | `POST /auth/sign-up` | No signup route found in inspected auth controller | **Not implemented / confirm scope.** |
| Password reset | `/auth/password-reset/request` and `/confirm` | No password-reset routes found; schema has token model | **Not implemented.** Delivery, enumeration behavior, expiry, and one-time use need a spec. |
| Membership selection | No explicit membership/school selection in frontend service contract | `GET /api/v1/auth/schools`; `POST /api/v1/auth/active-school` returns a school-scoped token | **Frontend gap.** Model memberships and switching. |
| Dashboard overview | `/school/dashboard?role=...` and `/school/portal-dashboard?role=...` | No dashboard controller found | **Not implemented.** Define aggregate needs before building. |
| Students list | `GET /api/v1/students?page=&pageSize=` now returns a mapped page; UI uses page size 20 and backend pagination metadata | `{ data, meta }`; each row includes enrolments with academic year, section, and class | **Read aligned.** API-mode search is intentionally omitted because no server-side search contract exists. List payload does not include guardians or attendance. |
| Student detail | `GET /api/v1/students/:id` now backs the profile screen and maps enrollment and guardian records | School-scoped student with guardians and enrolments | **Read aligned.** Unavailable attendance, fees, assignment, and document information is not shown in API mode. |
| Student create | `POST /api/v1/students` now sends the backend DTO; form loads academic years and classes and accepts up to five optional guardians | Requires admission number, first/last name, admission date, academic year/class/section IDs, and a guardian array | **Create aligned.** Validations and academic references remain enforced by the backend. |
| Student update | API-mode edit UI is hidden and no update request is sent | No update endpoint found | **Deferred/not implemented.** |
| Student archive | No API-mode archive action | `POST /api/v1/students/:id/archive` | **Deferred.** Archive workflow and permission/UI behavior have not been approved. |
| Staff | `GET /school/staff` | No staff controller found | **Not implemented.** |
| Classes and sections | `GET /api/v1/classes` is now used by the frontend read-only class directory; the adapter validates and maps class/section fields | `GET /api/v1/classes` returns active classes with nested sections; create APIs also exist | **Read aligned.** Teacher assignments, enrollment totals, schedules, and academic-year UI are not supplied/integrated. Class/section writes remain out of scope. |
| Academic years | `GET` and `POST /academic-years` | Returns and creates academic-year records for the active school | **Aligned.** API mode lists years and allows creation with `academic_structure.manage`; class/section creation remains out of scope. |
| Schools | `GET /schools` returns platform directory | `GET /api/v1/auth/schools` returns the authenticated user’s memberships; `/schools/current` handles active school profile | **Different semantics.** Platform directory is not available in inspected routes. |
| School settings | `GET /schools/current`, `PATCH /schools/current` with name, email, phone, timezone, and locale | Same active-school profile routes; API mode maps these fields directly and gates edits on `school.update` | **Aligned.** The mock-only notification and school-type fields are not sent to the backend. |
| Attendance | Session workflow: list by date, create, read enrolled roster, mark unmarked records, close | `GET /attendance/sessions?date=...`, `GET /attendance/sessions/:id/roster`, `POST /attendance/sessions`, `PUT /attendance/sessions/:id/records`, `POST /attendance/sessions/:id/close` | **Aligned.** The roster is tenant- and enrollment-date-scoped. The UI derives its date using the active school's IANA timezone; post-mark corrections are intentionally deferred, and the mark route rejects attempts to overwrite existing records. No aggregate summary is invented. |
| Reports | `GET /school/reports` | No reports controller found | **Not implemented.** |
| Fees | `GET /school/fees` | No finance controller found; finance phase blocked pending decisions | **Blocked/not implemented.** |
| Assignments | `GET /school/assignments` | No assignment controller found | **Not implemented.** |

## Cross-cutting mismatches and concerns

1. **Auth response/session mismatch:** frontend expects cookie-backed `AuthSession`; backend returns bearer tokens. The selected storage/refresh mechanism is a blocking decision.
2. **No automatic bearer header:** current frontend API client cannot call protected backend endpoints as implemented.
3. **No refresh route observed:** schema stores refresh token hashes, but refresh rotation is explicitly listed as pending.
4. **Role semantics differ:** frontend has seven role strings; backend authorization is based on membership roles and permission keys. Mapping is not established by the current UI session type.
5. **Tenant context is absent from frontend types:** no active school ID or membership context exists; school-scoped APIs require it in the backend token.
6. **DTOs are domain-shaped, not UI-shaped:** examples include student creation and school settings. Avoid pretending the shapes are interchangeable.
7. **Environment examples need reconciliation:** backend and frontend both default to port 3000; backend CORS defaults to 5173; frontend README examples use backend port 3001; Compose database port differs from the backend env template; frontend env example is missing; API base URL must include the prefix if adapter paths remain prefix-relative.
8. **Security readiness is separate from connectivity:** backend docs say RLS policies are absent in the initial migration and production use is blocked pending RLS and isolation tests.

## Contract rules

- Use generated OpenAPI as a verification artifact, not as a substitute for approved product behavior.
- Keep UI view models separate from wire DTOs where the shapes differ.
- Every adapter transformation must be typed, tested, and explicit; do not cast unknown API responses directly to UI types.
- Document status codes and error envelopes, including validation, unauthorized, forbidden, not-found, conflict, and rate-limit responses.
- Prefer additive/versioned API changes; breaking changes require coordinated frontend/backend rollout notes.

## Revalidation checklist

- [x] Re-run controller/route inventory.
- [x] Generate current OpenAPI and diff it against the inspected controllers and frontend adapters.
- [x] Verify `API_PREFIX`, frontend base URL, port, and CORS origins; mismatches are recorded above.
- [x] Confirm observed auth and permission guards for the inventoried protected endpoints.
- [x] Compare service response types with controller and DTO contracts; mismatches are recorded above.
- [ ] Update this table after each approved API change.

## Phase 2 implementation snapshot

**Reviewed:** 2026-11-12  
**Status:** Live database/API integration and generated Swagger verification passed; frontend auth interaction tests remain open. The baseline above is the pre-implementation inventory and should be treated as historical where it conflicts with this snapshot.

### Auth/session contract now implemented

- Backend routes provide login, refresh, logout, current-session lookup, membership listing, and active-school/workspace selection. Login/session responses do not include credentials; the backend sets HttpOnly access/refresh cookies and a readable double-submit CSRF cookie.
- Access JWTs expire after 15 minutes by default. Refresh credentials are random, stored as SHA-256 hashes, rotated on refresh, and revocable by session lineage. Guards consult active session and membership state and derive the union of current school permissions from assigned roles.
- Unsafe cookie-authenticated requests require an allowed Origin and matching CSRF cookie/header. API CORS and default port are aligned to the frontend at `http://localhost:3000` and backend port `3001`.
- Frontend API mode uses `credentials: include`, attaches the CSRF header, attempts one shared refresh for eligible 401 responses, and retries the original request once. Auth wire responses are mapped into the UI session type; signup and password reset fail closed and remain unavailable in API mode.
- School memberships/workspace roles are selected before entering a school session. Platform authority is not inferred from school membership; platform-only login is not issued because no approved platform-grant model exists in the current schema.
- The database migration adds nullable session lineage and selected-school/workspace fields to refresh-token records. Both migrations were applied to the empty local Compose database and the synthetic demo account was seeded; no reset was performed. The current frontend has no shared query/data cache to invalidate on workspace selection.

### Verification and remaining contract gates

| Repository | Check | Result |
|---|---|---|
| Backend | `npm test -- --runInBand` | Passed; 6 suites, 22 tests, including auth service, cookie, CSRF, and JWT-guard tests |
| Backend | `npm run typecheck` / `npm run build` | Passed |
| Backend | `prisma validate` with local dummy URLs | Passed; validation only, no database connection or migration |
| Backend | `npm run lint` | Still blocked by the pre-existing missing ESLint 9 configuration |
| Frontend | `npm run lint` | Passed |
| Frontend | TypeScript check / `npm run build` | Passed |
| Local PostgreSQL | Initial and browser-session migrations / synthetic seed | Passed against the empty local Compose database; no reset was performed |
| Backend HTTP API | Login through school selection, protected read, refresh, replay revocation, and logout | Passed against the local API using the synthetic seeded account |
| Backend HTTP API | CSRF rejection, auth cookie attributes/clearing, and immediate access invalidation | Passed |
| Generated Swagger | Six auth routes and active-school response status | Passed; `POST /api/v1/auth/active-school` documents HTTP 200 |
| Frontend | Auth interaction tests | Passed; 12 tests across 2 suites covering session state, workspace selection, protected request refresh, API-mode gating, and logout failures |

Phase 2's live API integration gate is satisfied for the synthetic local school-admin account. The manual HTTP integration probe was not retained as a persistent test; automated frontend tests cover the UI and HTTP adapter behavior. Platform-only login remains deliberately unavailable pending a dedicated platform grant model.
