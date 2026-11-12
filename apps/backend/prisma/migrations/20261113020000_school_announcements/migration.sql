INSERT INTO "permissions" ("id", "key", "description")
VALUES
    (gen_random_uuid(), 'announcements.read', 'Read published school-wide announcements'),
    (gen_random_uuid(), 'announcements.manage', 'Create and publish school-wide announcements')
ON CONFLICT ("key") DO NOTHING;

INSERT INTO "role_permissions" ("role_id", "permission_id")
SELECT role."id", permission."id"
FROM "roles" AS role
JOIN "permissions" AS permission
  ON permission."key" = 'announcements.read'
WHERE role."school_id" IS NOT NULL
  AND role."key" IN ('SCHOOL_ADMIN', 'PRINCIPAL', 'TEACHER')
ON CONFLICT ("role_id", "permission_id") DO NOTHING;

INSERT INTO "role_permissions" ("role_id", "permission_id")
SELECT role."id", permission."id"
FROM "roles" AS role
JOIN "permissions" AS permission
  ON permission."key" = 'announcements.manage'
WHERE role."school_id" IS NOT NULL
  AND role."key" = 'SCHOOL_ADMIN'
ON CONFLICT ("role_id", "permission_id") DO NOTHING;
