# Railway staging deployment playbook

**Status:** Plan; not yet deployed
**Scope:** Synthetic-data staging only
**Applications:** Separate Next.js frontend and NestJS backend, plus PostgreSQL

## 1. Guardrails and prerequisites

- [ ] Select the Railway project, `staging` environment, region, operator, and
  spending limits. Keep staging isolated from production, including database
  credentials and auth secrets.
- [ ] Use synthetic accounts and records only. Do not copy real student data,
  local `.env` files, passwords, cookies, or tokens into Railway, logs, or this
  document.
- [ ] Review and commit the intended repository changes, including the
  [single migration baseline](../../apps/backend/prisma/migrations/20261116000000_baseline/migration.sql).
  A GitHub-sourced deployment cannot use uncommitted local changes.
- [ ] Configure the same-origin proxy in section 2 and verify it in the staging
  environment before exposing the frontend.
- [ ] Use a new, empty staging database. The baseline does not provide an
  automatic upgrade path for databases with the previous migration history.
  Never reset an existing database or mark the baseline applied without a
  separately approved and verified migration plan.
- [ ] Confirm the selected build includes the Prisma CLI and migration files in
  the backend runtime image. The current backend Dockerfile copies both
  `node_modules` and `prisma` from the build.

This playbook does not approve production use. The production security and
isolation gates remain in [Verification and release](./06-verification-and-release.md).

## 2. Required frontend-to-backend proxy

The browser client reads `dashify_csrf` from `document.cookie`, but the backend
sets host-only cookies. Different frontend and API hostnames do not share that
cookie, even when they are subdomains of the same site. The current separate
public-origin configuration therefore cannot reliably perform authenticated
state-changing requests. `SameSite=Lax` also makes unrelated Railway domains
unsuitable for cross-site cookie authentication.

The frontend implements an optional same-origin Next.js rewrite. Configure and
verify it before deploying the frontend:

1. Route browser requests at `/api/v1/*` through the Next.js service to the
   backend service on Railway private networking. Keep both services separate;
   do not start the backend process inside the frontend.
2. Set `BACKEND_INTERNAL_URL` in the frontend build environment to the private
   backend HTTP(S) origin, without credentials, path, query, or fragment. The
   rewrite is omitted when this variable is unset; a configured invalid value
   fails the build. Changing the target requires a frontend rebuild.
3. Configure the browser API base as `/api/v1`, not the internal hostname.
   The frontend currently recognizes an existing `/api/v1` suffix and does not
   append it again. `NEXT_PUBLIC_*` values are included in the frontend build.
4. Verify that the proxy preserves request methods, bodies, query strings,
   `Origin`, cookies, CSRF headers, status codes, and **all** `Set-Cookie`
   headers. Do not log cookie or token values. Ensure backend connectivity
   works with Railway private DNS and the environment's IP configuration.
5. Test login, session restore, an authenticated write, refresh, and logout in
   a real browser over HTTPS. Confirm auth cookies are Secure and HttpOnly,
   the CSRF cookie is readable by the frontend, and missing/incorrect CSRF and
   unapproved origins are rejected. Do not weaken CSRF or change cookie
   attributes merely to make deployment work.
6. Check rate limiting behind the proxy; configure trusted proxy handling only
   after identifying Railway's actual proxy chain. Avoid blindly trusting
   client-provided forwarding headers.

The backend's public domain is not required for this design. If temporarily
enabled for troubleshooting, restrict access and remove it afterwards.

## 3. Create the three Railway services

Create these in the same Railway project and `staging` environment:

| Service | Source and settings | Networking |
|---|---|---|
| `postgres` | Railway PostgreSQL service, fresh database, persistent volume; choose and document a supported PostgreSQL version | Private; do not enable a public TCP proxy by default |
| `backend` | GitHub repository; service root `/apps/backend`; use the existing Dockerfile | Private; listens on Railway's configured `PORT` |
| `frontend` | Same repository; service root `/apps/frontend`; Railpack/Node | Public HTTPS domain; private connection to backend |

Use the exact service names in Railway variable references; examples below
assume the names in the table. Railway service root directories use `/` syntax.
Optionally configure service watch paths so unrelated app changes do not
redeploy both services.

On PostgreSQL, confirm the volume is attached and configure an appropriate
staging backup schedule. Restrict Railway project and environment access.
Record the database version, region, and recovery owner without recording
connection strings.

## 4. Configure backend

Set these in the **backend service's staging variables**:

| Variable | Staging value or source |
|---|---|
| `NODE_ENV` | `production`, so cookies are Secure and development-only login shortcuts are disabled |
| `PORT` | `3001` for the private proxy; let Railway use the same value for its health check |
| `API_PREFIX` | `api/v1` |
| `DATABASE_URL` | Private reference to `${{postgres.DATABASE_URL}}` |
| `DIRECT_URL` | Private direct database connection for migrations; initially `${{postgres.DATABASE_URL}}` for an isolated staging database |
| `WEB_APP_ORIGIN` | Exact public HTTPS frontend origin, without a trailing slash |
| `AUTH_ACCESS_TOKEN_SECRET` | New staging-only secret, at least 32 characters |
| `AUTH_REFRESH_TOKEN_SECRET` | A different new staging-only secret, at least 32 characters |
| `SEED_PLATFORM_ADMIN_EMAIL` | Synthetic staging platform-admin account |
| `SEED_PLATFORM_ADMIN_PASSWORD` | Staging-only secret, at least 12 characters |
| `SCHOOL_ADMIN_DEFAULT_PASSWORD` | Separate staging-only secret, at least 12 characters, needed to create School Admin accounts |

Set secrets through Railway's secret variables, not the repository or command
line. The School Admin creation flow currently gives all newly created School
Admins the same configured initial password; no invitation or forced password
change exists. Treat this as a staging limitation, not a production-ready
credential workflow. `SCHOOL_ADMIN_EMAIL` is only for a local development
shortcut and is not needed in staging.

For staging, using the template's DB role for both URLs is a temporary
expedient; it does not meet production least-privilege requirements. Before
production, use a restricted non-owner runtime role for `DATABASE_URL` and a
separate privileged direct migration role for `DIRECT_URL`, with RLS and
isolation verified.

Backend deployment settings:

- Build with [`apps/backend/Dockerfile`](../../apps/backend/Dockerfile); it
  starts `node dist/src/main` and includes the Prisma migration files.
  Do not assume the current `start:prod` package script is equivalent: it
  points to a different build path.
- Pre-deploy command: `npm run prisma:deploy`. Set a bounded timeout. Railway
  runs this in a separate container on its private network and aborts
  deployment on a nonzero exit; its filesystem changes do not persist.
- Health-check path: `/api/v1/health/ready`. It checks database connectivity.
  Railway's deployment health check is not continuous monitoring.
- Apply staged variable/settings changes and deploy. Confirm the pre-deploy
  log says the baseline was applied successfully before proceeding.

## 5. Bootstrap the staging platform administrator

Once the backend is healthy and migrations have completed, run the seed
**once**, in the backend deployment container, after confirming project,
environment, and service. For example, with Railway CLI installed and access
configured:

```powershell
railway ssh --project YOUR_PROJECT_ID --environment staging --service backend -- npm run prisma:seed
```

The command uses the backend service's configured environment. If SSH or secret
access is unavailable, use an approved private one-off execution method with
the same image and staging variables; do not fall back to a public database
URL. Check the command result without printing environment variables.

The seed creates a dedicated platform administrator and its initial platform
grants. It does **not** create a school, School Admin, Teacher, or academic
year. It refuses to elevate an unrelated existing account or silently repair
revoked grants. Do not run it automatically on every deployment.

## 6. Configure and deploy frontend

After the proxy in section 2 is included in the deployed commit, configure the
frontend service:

| Setting | Value |
|---|---|
| Root directory | `/apps/frontend` |
| Builder | Railpack |
| Node version | `RAILPACK_NODE_VERSION=22` |
| Build command | `npm run build` |
| Start command | `npm start` |
| `NEXT_PUBLIC_DASHIFY_API_MODE` | `api` |
| `NEXT_PUBLIC_DASHIFY_API_BASE_URL` | `/api/v1` |
| `BACKEND_INTERNAL_URL` | `http://${{backend.RAILWAY_PRIVATE_DOMAIN}}:3001` |
| Health-check path | `/auth/sign-in`; verify it returns HTTP 2xx in the deployed build |

Generate a Railway HTTPS domain or attach the approved staging domain. Set
backend `WEB_APP_ORIGIN` to that exact origin and deploy the backend settings.
Ensure the proxy target resolves during build/configuration and is reachable
at runtime; the browser must never call the private hostname. Deploy or rebuild
the frontend after public build variables or rewrite configuration change.

## 7. Staging acceptance checklist

- [ ] Confirm the backend readiness endpoint through the intended proxy and
  verify the browser is using API mode, not mock mode.
- [ ] Sign in as the synthetic platform admin. Confirm session restore, refresh,
  logout, correct cookie attributes, origin checks, and CSRF rejection.
- [ ] Create a synthetic school and School Admin; sign in as School Admin.
- [ ] Create a draft academic year whose date range includes the current
  school-local date, activate it, and confirm the Teacher workspace displays
  it. Verify another year cannot be activated while one is active.
- [ ] Create a synthetic Teacher and assignment. Verify assigned-class access
  and that unassigned or cross-school data is denied.
- [ ] Use two synthetic schools to check school switching and tenant isolation;
  verify denied requests on the backend, not just hidden UI.
- [ ] Inspect logs for errors and secret/PII leakage without copying sensitive
  values into release evidence. Verify backups, restore procedure, alerts,
  and a responsible operator.
- [ ] Record the frontend/backend commit, migration name, deployment IDs,
  verification date, known issues, and operator. Do not record credentials.

## 8. Troubleshooting and rollback

- **Migration fails:** stop rollout; inspect the pre-deploy error, database
  target, migration privileges, and history. Do not run `prisma migrate reset`
  or edit migration history to force success. Railway leaves the previous
  deployment in place when pre-deploy fails.
- **Backend unavailable:** check deploy logs, `PORT`, readiness, private DB
  connectivity, `DIRECT_URL`, and required secrets. Do not print secret values.
- **Login or writes fail:** inspect status and cookie attributes, exact HTTPS
  origin, proxy forwarding, and CSRF behavior. Multiple `Set-Cookie` headers
  must survive the proxy.
- **Frontend shows mock data:** check `NEXT_PUBLIC_DASHIFY_API_MODE` at build
  time and rebuild. Verify the browser calls the same-origin `/api/v1` path.
- **Rollback:** revert frontend/backend deployments only after verifying they
  remain compatible with the database schema. Application rollback does not
  undo a successful database migration. For database recovery, coordinate an
  approved backup restore and assess data loss; do not reset or restore blindly.

## References

- [Railway monorepo services](https://docs.railway.com/deployments/monorepo)
- [Railway variables and references](https://docs.railway.com/variables)
- [Railway private networking](https://docs.railway.com/networking/private-networking)
- [Railway pre-deploy commands](https://docs.railway.com/deployments/pre-deploy-command)
- [Railway PostgreSQL](https://docs.railway.com/databases/postgresql)
- [Railway health checks](https://docs.railway.com/deployments/healthchecks)
- [Railway volume backups](https://docs.railway.com/volumes/backups)
- [Railway SSH](https://docs.railway.com/cli/ssh)
