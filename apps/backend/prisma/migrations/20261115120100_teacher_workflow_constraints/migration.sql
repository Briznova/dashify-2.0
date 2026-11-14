CREATE UNIQUE INDEX "teacher_assignments_one_class_teacher_per_section"
ON "teacher_assignments"("school_id", "section_id")
WHERE "is_active" = TRUE
  AND "is_class_teacher" = TRUE
  AND "section_id" IS NOT NULL;

ALTER TABLE "teacher_assessments"
ADD CONSTRAINT "teacher_assessments_pass_mark_range_check"
CHECK ("pass_mark" IS NULL OR ("pass_mark" >= 0 AND "pass_mark" <= "max_score"));

ALTER TABLE "grade_bands"
ADD CONSTRAINT "grade_bands_percent_range_check"
CHECK (
  "min_percent" >= 0
  AND "max_percent" <= 100
  AND "min_percent" <= "max_percent"
);

DELETE FROM "role_permissions"
WHERE "permission_id" IN (
  SELECT "id" FROM "permissions"
  WHERE "key" = 'teacher.announcements.manage'
);

DELETE FROM "permissions"
WHERE "key" = 'teacher.announcements.manage';
