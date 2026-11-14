INSERT INTO "permissions" ("id", "key", "description")
VALUES (
  gen_random_uuid(),
  'teacher.announcements.manage',
  'Create and read unpublished class notices for assigned sections'
)
ON CONFLICT ("key") DO NOTHING;

INSERT INTO "role_permissions" ("role_id", "permission_id")
SELECT role."id", permission."id"
FROM "roles" AS role
JOIN "permissions" AS permission
  ON permission."key" = 'teacher.announcements.manage'
WHERE LOWER(role."key") = 'teacher'
ON CONFLICT ("role_id", "permission_id") DO NOTHING;
