# ADR-004: File storage

- Status: Open
- Decision: metadata in PostgreSQL; bytes in private object storage via an abstraction.
- Required follow-up: select S3-compatible provider, upload/download signed URL flow, MIME/size validation, malware scanning policy, retention and tenant access checks.
