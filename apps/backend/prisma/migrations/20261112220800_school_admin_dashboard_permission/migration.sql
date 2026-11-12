INSERT INTO "permissions" ("id", "key", "description")
VALUES (
    gen_random_uuid(),
    'dashboard.read',
    'Read school administrator dashboard counts'
)
ON CONFLICT ("key") DO NOTHING;

INSERT INTO "role_permissions" ("role_id", "permission_id")
SELECT role."id", permission."id"
FROM "roles" AS role
CROSS JOIN "permissions" AS permission
WHERE LOWER(role."key") = 'school_admin'
  AND permission."key" = 'dashboard.read'
ON CONFLICT ("role_id", "permission_id") DO NOTHING;
