# Dashify Full-Stack Delivery Plan

This folder is the shared, spec-driven planning hub for the Dashify frontend and backend applications in this monorepo.

## Applications

- Frontend: [`../../apps/frontend/`](../../apps/frontend/)
- Backend: [`../../apps/backend/`](../../apps/backend/)

The monorepo uses these links as the source of truth for coordinated feature work.

## Document map

| Document | Purpose |
|---|---|
| [Execution roadmap](./00-execution-roadmap.md) | Dependency-ordered phases, gates, ownership, and deliverables |
| [Execution checklist](./00-execution-checklist.md) | Ordered, checkable tasks and progress log for doing the work one item at a time |
| [Contract baseline](./01-contract-baseline.md) | Observed frontend/backend contracts and verified mismatches |
| [Identity and tenancy spec](./02-identity-auth-tenancy-spec.md) | Auth/session, school selection, role mapping, and tenant boundaries |
| [Auth/session OpenAPI contract](../api-contracts/auth-session.openapi.yaml) | Browser auth, school/workspace selection, and platform-only session; reset operations remain proposed |
| [Platform schools OpenAPI contract](../api-contracts/platform-schools.openapi.yaml) | School metadata, onboarding state and explicitly authorized creation for a platform-only session |
| [Platform audit OpenAPI contract](../api-contracts/platform-audit.openapi.yaml) | Whitelisted, redacted platform-origin events with separately authorized access |
| [Platform settings OpenAPI contract](../api-contracts/platform-settings.openapi.yaml) | Read-only enforced token lifetimes with separately authorized access |
| [Platform support OpenAPI contract](../api-contracts/platform-support.openapi.yaml) | Platform-only internal tickets, permission-gated actions and history |
| [Dashboard OpenAPI contract](../api-contracts/dashboard.openapi.yaml) | School-administrator counts, Principal daily attendance snapshot, and Teacher assigned-class attendance; other roles and trend metrics remain out of scope |
| [Attendance report OpenAPI contract](../api-contracts/attendance-report.openapi.yaml) | Approved school-administrator aggregate report for closed sessions; no exports or student-level detail |
| [Access and workspace spec](./03-access-and-workspace-spec.md) | Frontend role policy and its relationship to backend permissions |
| [Core integration slices](./04-core-integration-slices.md) | Student, academic structure, and attendance vertical slices |
| [Backend capability backlog](./05-backend-capability-backlog.md) | Missing or incomplete backend capabilities and proposed sequencing |
| [Phase 5 proposed specs](./05a-phase5-proposed-specs.md) | Feature proposals and scope decisions for the Phase 5 backlog |
| [Role workspace and navigation design](./05b-role-workspace-design.md) | Proposed role-specific pages, actions, and Super Admin CSV school setup |
| [Verification and release](./06-verification-and-release.md) | Contract, integration, authorization, isolation, and release criteria |
| [Figma design reference](./07-figma-design-reference.md) | Figma file and frame links for role workspaces and related screens |
| [Super Admin workspace LLD](./08-super-admin-workspace-lld.md) | Approved frontend previews and existing platform directory integration |
| [Super Admin end-to-end spec](./09-super-admin-end-to-end-spec.md) | Approved school setup, CSV, support, audit and settings direction and remaining gates |
| [Students end-to-end spec](./10-students-end-to-end-spec.md) | Draft screenshot-based student directory, records and phased delivery plan; decisions and contracts remain unapproved |
| [Decision register](./decisions/README.md) | Open architecture/product decisions that block implementation |
| [Feature spec template](./templates/feature-spec-template.md) | Required format for implementation-ready feature specs |
| [Decision record template](./templates/decision-record-template.md) | Record decisions that affect contracts or architecture |

## Existing frontend plan

The original role/workspace migration plan remains with the frontend app:
[User-Type Modular Structure Plan](../../apps/frontend/docs/user-type-modular-structure-plan.md).
Its frontend-only migration detail is retained there. The shared roadmap and
[Access and Workspace Specification](./03-access-and-workspace-spec.md) carry its
role-policy and workspace phases into the coordinated full-stack sequence; use
the shared specs for cross-repository API, auth, and tenancy decisions.

## Working rules

1. Treat the specs as proposals until their status is `Approved`. Do not infer product decisions from mock UI, seed data, or sample DTOs.
2. Implement one vertical slice at a time across frontend and backend. Keep the slice small enough to test and review independently.
3. Before implementation, agree on endpoint, authentication, authorization, tenant scope, request/response, error, and acceptance-test behavior.
4. Update the contract baseline and affected specs when an approved implementation changes the API.
5. Backend authorization and tenant isolation are authoritative. Frontend roles and route checks only shape user experience.
6. Never claim a feature is API-integrated until a real frontend adapter call and backend integration test exercise the agreed contract.

## Baseline provenance

The initial baseline was prepared on 2026-11-12 by comparing:

- Frontend `src/services/`, `src/types/`, `README.md`, and role/dashboard code.
- Backend `src/modules/`, `src/common/`, `src/main.ts`, `prisma/schema.prisma`, and `docs/implementation-plan.md`.

The baseline describes repository contents inspected at that date. Re-check source and generated OpenAPI before treating it as current.
