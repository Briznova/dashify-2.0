# Architecture

DASHIFY is a NestJS modular monolith. REST controllers expose `/api/v1`; DTOs validate inputs; services implement business rules; Prisma accesses PostgreSQL. School memberships bind global users to tenants and roles. School-owned rows carry `school_id`. The database isolation plan combines explicit scoped queries with transaction-local RLS context.

Modules are organized by domain under `src/modules`. Infrastructure adapters live under `src/infrastructure`. Do not split modules into microservices for the pilot.
