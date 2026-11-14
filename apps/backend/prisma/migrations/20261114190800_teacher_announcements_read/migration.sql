INSERT INTO "role_permissions" ("role_id", "permission_id")
SELECT role."id", permission."id"
FROM "roles" AS role
JOIN "permissions" AS permission
  ON permission."key" = 'announcements.read'
WHERE LOWER(role."key") = 'teacher'
ON CONFLICT ("role_id", "permission_id") DO NOTHING;
