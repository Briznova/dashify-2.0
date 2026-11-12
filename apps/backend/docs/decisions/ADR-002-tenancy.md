# ADR-002: Multi-tenancy

- Status: Accepted as architecture direction; operational controls incomplete
- Decision: one PostgreSQL database/shared schema; every school-owned record carries `school_id`; service queries are scoped; transaction-local `set_config('app.school_id', ..., true)` establishes RLS context.
- Required follow-up: RLS policies on all tenant tables; app DB role must be non-owner and NOBYPASSRLS; two-school tests against deployed-like pool.
