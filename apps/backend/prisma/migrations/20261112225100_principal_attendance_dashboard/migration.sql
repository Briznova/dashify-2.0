INSERT INTO "permissions" ("id", "key", "description")
VALUES (
    gen_random_uuid(),
    'dashboard.principal.read',
    'Read the active school daily attendance dashboard'
)
ON CONFLICT ("key") DO NOTHING;

INSERT INTO "roles" ("id", "school_id", "key", "name", "is_system")
SELECT gen_random_uuid(), "id", 'PRINCIPAL', 'Principal', TRUE
FROM "schools"
ON CONFLICT ("school_id", "key") DO NOTHING;

INSERT INTO "role_permissions" ("role_id", "permission_id")
SELECT role."id", permission."id"
FROM "roles" AS role
CROSS JOIN "permissions" AS permission
WHERE LOWER(role."key") = 'principal'
  AND permission."key" = 'dashboard.principal.read'
ON CONFLICT ("role_id", "permission_id") DO NOTHING;
