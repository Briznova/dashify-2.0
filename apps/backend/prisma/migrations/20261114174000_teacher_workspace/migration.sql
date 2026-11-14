CREATE TYPE "TeacherAssessmentType" AS ENUM ('ASSIGNMENT', 'EXAM');
CREATE TYPE "TeacherAssessmentStatus" AS ENUM ('DRAFT', 'PUBLISHED');

CREATE TABLE "teacher_assessments" (
  "id" UUID NOT NULL,
  "school_id" UUID NOT NULL,
  "staff_id" UUID NOT NULL,
  "class_id" UUID NOT NULL,
  "section_id" UUID NOT NULL,
  "type" "TeacherAssessmentType" NOT NULL,
  "status" "TeacherAssessmentStatus" NOT NULL DEFAULT 'DRAFT',
  "title" TEXT NOT NULL,
  "description" TEXT,
  "due_date" DATE NOT NULL,
  "max_score" INTEGER NOT NULL,
  "created_by" UUID NOT NULL,
  "published_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "teacher_assessments_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "teacher_assessments_max_score_check" CHECK ("max_score" > 0),
  CONSTRAINT "teacher_assessments_school_id_fkey"
    FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "teacher_assessments_staff_id_fkey"
    FOREIGN KEY ("staff_id") REFERENCES "staff_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "teacher_assessments_class_id_fkey"
    FOREIGN KEY ("class_id") REFERENCES "classes"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "teacher_assessments_section_id_fkey"
    FOREIGN KEY ("section_id") REFERENCES "sections"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX "teacher_assessments_school_id_staff_id_status_due_date_idx"
  ON "teacher_assessments"("school_id", "staff_id", "status", "due_date");
CREATE INDEX "teacher_assessments_school_id_class_id_section_id_due_date_idx"
  ON "teacher_assessments"("school_id", "class_id", "section_id", "due_date");

CREATE TABLE "teacher_results" (
  "id" UUID NOT NULL,
  "school_id" UUID NOT NULL,
  "assessment_id" UUID NOT NULL,
  "student_id" UUID NOT NULL,
  "score" INTEGER NOT NULL,
  "updated_by" UUID NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "teacher_results_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "teacher_results_score_check" CHECK ("score" >= 0),
  CONSTRAINT "teacher_results_school_id_fkey"
    FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "teacher_results_assessment_id_fkey"
    FOREIGN KEY ("assessment_id") REFERENCES "teacher_assessments"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "teacher_results_student_id_fkey"
    FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "teacher_results_assessment_id_student_id_key"
  ON "teacher_results"("assessment_id", "student_id");
CREATE INDEX "teacher_results_school_id_assessment_id_idx"
  ON "teacher_results"("school_id", "assessment_id");
CREATE INDEX "teacher_results_school_id_student_id_updated_at_idx"
  ON "teacher_results"("school_id", "student_id", "updated_at");

INSERT INTO "permissions" ("id", "key", "description")
VALUES
  (gen_random_uuid(), 'teacher.classes.read', 'Read assigned teacher class sections'),
  (gen_random_uuid(), 'teacher.attendance.read', 'Read attendance for assigned teacher sections'),
  (gen_random_uuid(), 'teacher.attendance.mark', 'Record initial attendance for assigned teacher sections'),
  (gen_random_uuid(), 'teacher.assessments.read', 'Read teacher-created assignments and exams'),
  (gen_random_uuid(), 'teacher.assessments.manage', 'Create and publish assignments and exams for assigned sections'),
  (gen_random_uuid(), 'teacher.results.read', 'Read results for teacher-created assessments'),
  (gen_random_uuid(), 'teacher.results.write', 'Record and update results for teacher-created assessments')
ON CONFLICT ("key") DO NOTHING;

INSERT INTO "roles" ("id", "school_id", "key", "name", "is_system")
SELECT gen_random_uuid(), "id", 'TEACHER', 'Teacher', TRUE
FROM "schools"
ON CONFLICT ("school_id", "key") DO NOTHING;

INSERT INTO "role_permissions" ("role_id", "permission_id")
SELECT role."id", permission."id"
FROM "roles" AS role
CROSS JOIN "permissions" AS permission
WHERE LOWER(role."key") = 'teacher'
  AND permission."key" IN (
    'teacher.classes.read',
    'teacher.attendance.read',
    'teacher.attendance.mark',
    'teacher.assessments.read',
    'teacher.assessments.manage',
    'teacher.results.read',
    'teacher.results.write'
  )
ON CONFLICT ("role_id", "permission_id") DO NOTHING;
