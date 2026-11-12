# ADR-001: Authentication pattern

- Status: Provisional
- Decision: short-lived bearer access JWT and opaque random refresh token whose SHA-256 hash is stored server-side.
- Rationale: supports browser and mobile API clients.
- Required follow-up: implement refresh rotation, reuse detection, revocation, secure mobile storage guidance and preferably HttpOnly Secure SameSite cookies for browser clients where compatible.
