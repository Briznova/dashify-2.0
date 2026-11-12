# Security Notes

- Passwords use Argon2id.
- Access tokens are signed with an environment secret; do not commit secrets.
- Refresh tokens are random and only SHA-256 hashes are persisted. Rotation endpoint remains to be implemented.
- DTO validation is globally enabled with whitelist and forbidNonWhitelisted.
- Helmet is enabled; CORS is restricted to configured origins.
- Permission checks use permission keys on school-scoped tokens.
- Tenant queries use `PrismaService.withTenant` and transaction-local PostgreSQL settings.
- RLS policies are not yet present in the initial migration: production use is blocked until they are added and tested with the non-owner app role.
- Avoid logging credentials, tokens, student PII, payment credentials or document contents.
- Use synthetic data outside production.
