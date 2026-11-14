# DASHIFY Backend

NestJS + TypeScript + PostgreSQL + Prisma modular-monolith foundation for the DASHIFY multi-tenant School ERP + LMS SaaS.

> This ZIP is an implementation starter aligned to the uploaded master specification. It is not a certified or production-ready release. Financial workflows are deliberately not implemented because the specification requires founder/CTO approval of the financial rules first.

## Included now

- NestJS application, strict TypeScript, Swagger, DTO validation, Helmet, CORS and structured logging
- PostgreSQL + Prisma schema for schools, users, memberships, roles/permissions, academics, students, guardians, enrolments, attendance, announcements, notifications, files and audit logs
- Login with Argon2id, short-lived access JWT, hashed refresh-token persistence, logout revocation, school listing and verified active-school selection
- School profile read/update
- Academic years, classes and sections
- Student create/list/read/archive with guardian and enrolment creation in a transaction
- Attendance session create, bulk mark and close
- Health/readiness endpoints, Docker Compose, platform administrator bootstrap, CI baseline

## Not yet implemented

Fee structures, fee assignments, payments, allocations, receipt numbering/PDFs and reversals; invitations and password reset delivery; staff workflows; guardian portal object-level policies; private S3/local object storage adapter and signed URLs; announcements/notifications controllers; report/dashboard endpoints; full refresh-token rotation endpoint; full RLS policy migration and deployed-role tenant-isolation tests; production deployment/backup automation.

The Prisma schema is the relational foundation. Do not onboard real student data until the missing security controls and acceptance tests are completed.

## Requirements

- Node.js 20+
- npm 10+
- Docker Desktop / Docker Engine
- PostgreSQL 16 (Docker Compose provided)

## Local setup

```bash
cp .env.example .env
docker compose up -d postgres
npm install
npx prisma generate
npm run prisma:deploy
# Set SEED_PLATFORM_ADMIN_EMAIL and SEED_PLATFORM_ADMIN_PASSWORD in the environment.
npm run prisma:seed
npm run start:dev
```

API: `http://localhost:3001/api/v1`
Swagger: `http://localhost:3001/docs`
Liveness: `http://localhost:3001/api/v1/health/live`
Readiness: `http://localhost:3001/api/v1/health/ready`

Browser authentication uses `dashify_access`, `dashify_refresh`, and `dashify_csrf` cookies. The frontend origin allow-list is configured with `WEB_APP_ORIGIN`; cookie-authenticated state-changing requests must include the CSRF header.

The seed requires a valid `SEED_PLATFORM_ADMIN_EMAIL` and
`SEED_PLATFORM_ADMIN_PASSWORD` of at least 12 characters. It creates one
dedicated platform Super Admin and grants school creation, School Admin creation,
audit read, settings read, and support read/update permissions. School directory
read is implicit. It creates no school, school membership, demo account, or
teacher. Keep credentials in deployment-managed secrets, not source control.

Run `npm run prisma:deploy` before `npm run prisma:seed`. Both `DATABASE_URL`
and `DIRECT_URL` must point to the intended database; the runtime database role
must have the privileges needed to seed. The seed is a no-op for a matching
active platform administrator with the same password and all bootstrap grants.
It refuses to elevate an existing account, change a password, or restore a
missing or revoked grant. It does not remove any pre-existing users or schools.
To revoke access, set `revoked_at` on that user's `platform_admin_grants` row;
active platform requests then fail closed. Changing a seed password does not
rotate an existing account's password.

These commands are not a production-readiness guarantee. Complete the RLS,
least-privilege, isolation, credential lifecycle and operational release gates
before onboarding real data.

School Admin account creation requires the separate `platform.school-admins.create`
grant and a server-side `SCHOOL_ADMIN_DEFAULT_PASSWORD` of at least 12
characters. Keep the password in deployment-managed secret configuration, not
source control. Every new account receives that same password; no invitation,
email verification or forced password change is performed. Changing the
configured password affects only future accounts, not existing password hashes.
Replace this temporary mechanism with individual credential setup before
relying on it for production.

For local development only, set `SCHOOL_ADMIN_EMAIL` to an existing School
Admin account to show a sign-in shortcut in the frontend. The shortcut uses
`SCHOOL_ADMIN_DEFAULT_PASSWORD`; it does not create or seed an account.

## Authentication flow

1. `POST /api/v1/auth/login` with email/password.
2. `GET /api/v1/auth/schools` using returned bearer access token.
3. `POST /api/v1/auth/active-school` with a school ID from that server response.
4. Use the newly returned school-scoped access token as `Authorization: Bearer ...`.

## API sample

```json
{
  "admissionNumber": "2026-001",
  "firstName": "Aarav",
  "lastName": "Kumar",
  "dateOfBirth": "2015-04-18",
  "gender": "MALE",
  "admissionDate": "2026-04-01",
  "academicYearId": "UUID",
  "classId": "UUID",
  "sectionId": "UUID",
  "guardians": [{
    "firstName": "Ravi",
    "lastName": "Kumar",
    "relationship": "FATHER",
    "phone": "+919876543210",
    "email": "parent@example.test",
    "isPrimary": true
  }]
}
```

## Important RLS status

`PrismaService.withTenant()` uses transaction-local `set_config('app.school_id', ..., true)` so a pooled connection does not retain tenant state after the transaction. The schema migration in this starter does **not** yet enable RLS policies. Add and test policies for every tenant-owned table before production. Also ensure the deployed application connects as a non-owner, `NOBYPASSRLS` database role; migrations must use a separate privileged role.

The local Compose setup creates a separate `dashify_app` role, but the example `DATABASE_URL` currently points to the migrator for ease of first boot. Before RLS testing, change `DATABASE_URL` to the app role and grant only required privileges. Never test RLS as a superuser or table owner.

## Quality commands

```bash
npm run format:check
npm run lint
npm run typecheck
npm test
npm run build
```

These commands are provided but have not been executed in this file-generation environment. Run them after installing dependencies and resolve any environment-specific issues.

## Security and product decisions still required

- Confirm cookie session vs access/refresh token architecture for browser/mobile clients.
- Implement refresh rotation, reset token issue/delivery and login throttling.
- Finalize guardian verification and parent/student access policy.
- Implement RLS migration and two-school tests using the application DB role.
- Confirm attendance correction workflow and timezone boundary rules.
- Approve Part J financial rules before any fee/payment implementation.
- Obtain appropriate Indian privacy, education-data, tax and contract review before live school onboarding.
