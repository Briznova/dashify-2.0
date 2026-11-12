# DASHIFY Implementation Plan

## Delivery status

This generated repository is a runnable-target starter for Phases 0–5, with a broad Prisma domain schema. It does not claim all phase acceptance criteria are met.

| Phase | State in this ZIP | Next work |
|---|---|---|
| 0 Bootstrap | Scaffolded | Install, generate Prisma client, run lint/typecheck/build and fix |
| 1 Tenant/RLS | Partial | Add RLS policies, least-privilege grants, two-school pooled-connection tests |
| 2 Auth/RBAC | Partial | Refresh rotation, reset delivery, login throttling, membership admin and full permission policy |
| 3 School/academics/staff | Partial | Academic CRUD lifecycle, staff and teacher assignments |
| 4 Students/guardians | Partial | Update/search, guardian linking lifecycle, documents and object policies |
| 5 Attendance | Partial | Corrections with reason, timezone-safe dates, daily/student reports |
| 6 Finance | Blocked pending approval | Confirm Part J decisions before implementation |
| 7 Dashboards/comms | Schema only | Reports, dashboard aggregates, announcement and notification APIs |
| 8 Operations | Partial | Storage adapter, observability, backups, restore drill |
| 9 Release | Not started | Full E2E, security review, staging, UAT |

## Phase 0 acceptance checklist

- [ ] Node version pinned by team
- [ ] npm install and Prisma generation work
- [ ] Docker PostgreSQL starts
- [ ] clean migration works
- [ ] seed works
- [ ] health endpoints work
- [ ] Swagger renders
- [ ] typecheck, lint, tests and build pass
- [ ] another developer verifies README setup

## Phase 1 critical work

1. Create RLS policies for all tenant tables.
2. Use application DB role that is not owner and has no BYPASSRLS.
3. Ensure every tenant read/write is inside `withTenant`.
4. Add two schools, users and resource fixtures.
5. Test cross-school read, update, delete and foreign-key/reference attempts.
6. Test pooled connection tenant context does not leak.

## ADRs required

- ADR-001 Authentication: access/refresh JWT selected provisionally; confirm client storage and refresh rotation.
- ADR-002 Tenancy: shared DB/schema, explicit school_id, transaction-local RLS context.
- ADR-003 Financial workflows: no implementation until Part J is approved.
- ADR-004 File storage: private S3-compatible adapter required; provider undecided.
