-- Source migration: 20261104181033_init
-- CreateEnum
CREATE TYPE "RecordStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "MembershipStatus" AS ENUM ('INVITED', 'ACTIVE', 'SUSPENDED', 'REVOKED');

-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY');

-- CreateEnum
CREATE TYPE "GuardianRelationship" AS ENUM ('FATHER', 'MOTHER', 'GUARDIAN', 'GRANDPARENT', 'OTHER');

-- CreateEnum
CREATE TYPE "AttendanceStatus" AS ENUM ('PRESENT', 'ABSENT', 'LATE', 'EXCUSED');

-- CreateEnum
CREATE TYPE "AttendanceSessionStatus" AS ENUM ('OPEN', 'CLOSED');

-- CreateEnum
CREATE TYPE "AcademicYearStatus" AS ENUM ('DRAFT', 'ACTIVE', 'COMPLETED');

-- CreateEnum
CREATE TYPE "AnnouncementStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('GENERAL', 'ATTENDANCE', 'FEE', 'ANNOUNCEMENT', 'SYSTEM');

-- CreateEnum
CREATE TYPE "FilePurpose" AS ENUM ('STUDENT_DOCUMENT', 'PROFILE_IMAGE', 'OTHER');

-- CreateTable
CREATE TABLE "schools" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "address" JSONB,
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Kolkata',
    "locale" TEXT NOT NULL DEFAULT 'en-IN',
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "schools_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT,
    "phone" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "email_verified_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "school_memberships" (
    "id" UUID NOT NULL,
    "school_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "status" "MembershipStatus" NOT NULL DEFAULT 'INVITED',
    "joined_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "school_memberships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roles" (
    "id" UUID NOT NULL,
    "school_id" UUID,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "is_system" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "permissions" (
    "id" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "role_permissions" (
    "role_id" UUID NOT NULL,
    "permission_id" UUID NOT NULL,

    CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("role_id","permission_id")
);

-- CreateTable
CREATE TABLE "membership_roles" (
    "membership_id" UUID NOT NULL,
    "role_id" UUID NOT NULL,

    CONSTRAINT "membership_roles_pkey" PRIMARY KEY ("membership_id","role_id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "revoked_at" TIMESTAMP(3),
    "replaced_by_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "password_reset_tokens" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "password_reset_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "academic_years" (
    "id" UUID NOT NULL,
    "school_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "status" "AcademicYearStatus" NOT NULL DEFAULT 'DRAFT',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "academic_years_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "classes" (
    "id" UUID NOT NULL,
    "school_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "classes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sections" (
    "id" UUID NOT NULL,
    "school_id" UUID NOT NULL,
    "class_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "capacity" INTEGER,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "staff_profiles" (
    "id" UUID NOT NULL,
    "school_id" UUID NOT NULL,
    "user_id" UUID,
    "employee_code" TEXT,
    "designation" TEXT,
    "department" TEXT,
    "joined_at" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "staff_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "students" (
    "id" UUID NOT NULL,
    "school_id" UUID NOT NULL,
    "admission_number" TEXT NOT NULL,
    "first_name" TEXT NOT NULL,
    "middle_name" TEXT,
    "last_name" TEXT,
    "date_of_birth" DATE,
    "gender" "Gender",
    "admission_date" DATE NOT NULL,
    "status" "RecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "archived_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "students_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "guardians" (
    "id" UUID NOT NULL,
    "school_id" UUID NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "guardians_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student_guardians" (
    "school_id" UUID NOT NULL,
    "student_id" UUID NOT NULL,
    "guardian_id" UUID NOT NULL,
    "relationship" "GuardianRelationship" NOT NULL,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "can_pickup" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "student_guardians_pkey" PRIMARY KEY ("student_id","guardian_id")
);

-- CreateTable
CREATE TABLE "student_enrolments" (
    "id" UUID NOT NULL,
    "school_id" UUID NOT NULL,
    "student_id" UUID NOT NULL,
    "academic_year_id" UUID NOT NULL,
    "class_id" UUID NOT NULL,
    "section_id" UUID NOT NULL,
    "start_date" DATE NOT NULL,
    "end_date" DATE,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "student_enrolments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attendance_sessions" (
    "id" UUID NOT NULL,
    "school_id" UUID NOT NULL,
    "class_id" UUID NOT NULL,
    "section_id" UUID NOT NULL,
    "date" DATE NOT NULL,
    "status" "AttendanceSessionStatus" NOT NULL DEFAULT 'OPEN',
    "created_by" UUID NOT NULL,
    "closed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "attendance_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attendance_records" (
    "id" UUID NOT NULL,
    "school_id" UUID NOT NULL,
    "session_id" UUID NOT NULL,
    "student_id" UUID NOT NULL,
    "status" "AttendanceStatus" NOT NULL,
    "remarks" TEXT,
    "marked_by" UUID NOT NULL,
    "marked_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "attendance_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "announcements" (
    "id" UUID NOT NULL,
    "school_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "status" "AnnouncementStatus" NOT NULL DEFAULT 'DRAFT',
    "audience" JSONB,
    "published_at" TIMESTAMP(3),
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "announcements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "school_id" UUID,
    "type" "NotificationType" NOT NULL DEFAULT 'GENERAL',
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "read_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "file_objects" (
    "id" UUID NOT NULL,
    "school_id" UUID NOT NULL,
    "student_id" UUID,
    "purpose" "FilePurpose" NOT NULL,
    "object_key" TEXT NOT NULL,
    "original_name" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "size_bytes" BIGINT NOT NULL,
    "checksum" TEXT,
    "uploaded_by" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "file_objects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL,
    "school_id" UUID,
    "actor_user_id" UUID,
    "action" TEXT NOT NULL,
    "resource" TEXT NOT NULL,
    "resource_id" TEXT,
    "request_id" TEXT,
    "summary" JSONB,
    "ip_address" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "schools_code_key" ON "schools"("code");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "school_memberships_user_id_status_idx" ON "school_memberships"("user_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "school_memberships_school_id_user_id_key" ON "school_memberships"("school_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "roles_school_id_key_key" ON "roles"("school_id", "key");

-- CreateIndex
CREATE UNIQUE INDEX "permissions_key_key" ON "permissions"("key");

-- CreateIndex
CREATE INDEX "refresh_tokens_user_id_expires_at_idx" ON "refresh_tokens"("user_id", "expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "password_reset_tokens_token_hash_key" ON "password_reset_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "password_reset_tokens_user_id_expires_at_idx" ON "password_reset_tokens"("user_id", "expires_at");

-- CreateIndex
CREATE INDEX "academic_years_school_id_status_idx" ON "academic_years"("school_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "academic_years_school_id_name_key" ON "academic_years"("school_id", "name");

-- CreateIndex
CREATE INDEX "classes_school_id_sort_order_idx" ON "classes"("school_id", "sort_order");

-- CreateIndex
CREATE UNIQUE INDEX "classes_school_id_code_key" ON "classes"("school_id", "code");

-- CreateIndex
CREATE INDEX "sections_school_id_class_id_idx" ON "sections"("school_id", "class_id");

-- CreateIndex
CREATE UNIQUE INDEX "sections_class_id_code_key" ON "sections"("class_id", "code");

-- CreateIndex
CREATE INDEX "staff_profiles_school_id_is_active_idx" ON "staff_profiles"("school_id", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "staff_profiles_school_id_employee_code_key" ON "staff_profiles"("school_id", "employee_code");

-- CreateIndex
CREATE INDEX "students_school_id_status_last_name_first_name_idx" ON "students"("school_id", "status", "last_name", "first_name");

-- CreateIndex
CREATE UNIQUE INDEX "students_school_id_admission_number_key" ON "students"("school_id", "admission_number");

-- CreateIndex
CREATE INDEX "guardians_school_id_phone_idx" ON "guardians"("school_id", "phone");

-- CreateIndex
CREATE INDEX "student_guardians_school_id_guardian_id_idx" ON "student_guardians"("school_id", "guardian_id");

-- CreateIndex
CREATE INDEX "student_enrolments_school_id_academic_year_id_class_id_sect_idx" ON "student_enrolments"("school_id", "academic_year_id", "class_id", "section_id");

-- CreateIndex
CREATE INDEX "student_enrolments_school_id_student_id_is_active_idx" ON "student_enrolments"("school_id", "student_id", "is_active");

-- CreateIndex
CREATE INDEX "attendance_sessions_school_id_date_idx" ON "attendance_sessions"("school_id", "date");

-- CreateIndex
CREATE UNIQUE INDEX "attendance_sessions_school_id_date_class_id_section_id_key" ON "attendance_sessions"("school_id", "date", "class_id", "section_id");

-- CreateIndex
CREATE INDEX "attendance_records_school_id_student_id_marked_at_idx" ON "attendance_records"("school_id", "student_id", "marked_at");

-- CreateIndex
CREATE UNIQUE INDEX "attendance_records_session_id_student_id_key" ON "attendance_records"("session_id", "student_id");

-- CreateIndex
CREATE INDEX "announcements_school_id_status_published_at_idx" ON "announcements"("school_id", "status", "published_at");

-- CreateIndex
CREATE INDEX "notifications_user_id_read_at_created_at_idx" ON "notifications"("user_id", "read_at", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "file_objects_object_key_key" ON "file_objects"("object_key");

-- CreateIndex
CREATE INDEX "file_objects_school_id_student_id_idx" ON "file_objects"("school_id", "student_id");

-- CreateIndex
CREATE INDEX "audit_logs_school_id_created_at_idx" ON "audit_logs"("school_id", "created_at");

-- CreateIndex
CREATE INDEX "audit_logs_actor_user_id_created_at_idx" ON "audit_logs"("actor_user_id", "created_at");

-- AddForeignKey
ALTER TABLE "school_memberships" ADD CONSTRAINT "school_memberships_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "school_memberships" ADD CONSTRAINT "school_memberships_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "permissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "membership_roles" ADD CONSTRAINT "membership_roles_membership_id_fkey" FOREIGN KEY ("membership_id") REFERENCES "school_memberships"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "membership_roles" ADD CONSTRAINT "membership_roles_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "academic_years" ADD CONSTRAINT "academic_years_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "classes" ADD CONSTRAINT "classes_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sections" ADD CONSTRAINT "sections_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "classes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_profiles" ADD CONSTRAINT "staff_profiles_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "students" ADD CONSTRAINT "students_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guardians" ADD CONSTRAINT "guardians_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_guardians" ADD CONSTRAINT "student_guardians_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_guardians" ADD CONSTRAINT "student_guardians_guardian_id_fkey" FOREIGN KEY ("guardian_id") REFERENCES "guardians"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_enrolments" ADD CONSTRAINT "student_enrolments_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_enrolments" ADD CONSTRAINT "student_enrolments_academic_year_id_fkey" FOREIGN KEY ("academic_year_id") REFERENCES "academic_years"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_enrolments" ADD CONSTRAINT "student_enrolments_section_id_fkey" FOREIGN KEY ("section_id") REFERENCES "sections"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_sessions" ADD CONSTRAINT "attendance_sessions_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_sessions" ADD CONSTRAINT "attendance_sessions_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "classes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_sessions" ADD CONSTRAINT "attendance_sessions_section_id_fkey" FOREIGN KEY ("section_id") REFERENCES "sections"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_records" ADD CONSTRAINT "attendance_records_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "attendance_sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_records" ADD CONSTRAINT "attendance_records_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "announcements" ADD CONSTRAINT "announcements_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "file_objects" ADD CONSTRAINT "file_objects_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "file_objects" ADD CONSTRAINT "file_objects_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Source migration: 20261112095000_browser_auth_sessions
ALTER TABLE "refresh_tokens"
ADD COLUMN "session_id" UUID,
ADD COLUMN "active_school_id" UUID,
ADD COLUMN "membership_id" UUID,
ADD COLUMN "active_workspace_role" TEXT;

CREATE INDEX "refresh_tokens_session_id_revoked_at_idx"
ON "refresh_tokens"("session_id", "revoked_at");

-- Source migration: 20261112140247_staff_teacher_assignments
-- CreateTable
CREATE TABLE "teacher_assignments" (
    "id" UUID NOT NULL,
    "school_id" UUID NOT NULL,
    "staff_id" UUID NOT NULL,
    "class_id" UUID NOT NULL,
    "section_id" UUID,
    "subject" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "teacher_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "teacher_assignments_school_id_class_id_section_id_idx" ON "teacher_assignments"("school_id", "class_id", "section_id");

-- CreateIndex
CREATE INDEX "teacher_assignments_school_id_staff_id_is_active_idx" ON "teacher_assignments"("school_id", "staff_id", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "teacher_assignments_school_id_staff_id_class_id_section_id_key" ON "teacher_assignments"("school_id", "staff_id", "class_id", "section_id");

-- AddForeignKey
ALTER TABLE "teacher_assignments" ADD CONSTRAINT "teacher_assignments_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teacher_assignments" ADD CONSTRAINT "teacher_assignments_staff_id_fkey" FOREIGN KEY ("staff_id") REFERENCES "staff_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teacher_assignments" ADD CONSTRAINT "teacher_assignments_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "classes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teacher_assignments" ADD CONSTRAINT "teacher_assignments_section_id_fkey" FOREIGN KEY ("section_id") REFERENCES "sections"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Source migration: 20261112140343_staff_teacher_assignments_fields
-- AlterTable
ALTER TABLE "staff_profiles" ADD COLUMN     "email" TEXT,
ADD COLUMN     "first_name" TEXT,
ADD COLUMN     "last_name" TEXT,
ADD COLUMN     "phone" TEXT;

-- Source migration: 20261112220800_school_admin_dashboard_permission
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

-- Source migration: 20261112225100_principal_attendance_dashboard
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

-- Source migration: 20261112235000_teacher_attendance_dashboard
INSERT INTO "permissions" ("id", "key", "description")
VALUES (
    gen_random_uuid(),
    'dashboard.teacher.read',
    'Read the authenticated teacher assigned-class attendance dashboard'
)
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
  AND permission."key" = 'dashboard.teacher.read'
ON CONFLICT ("role_id", "permission_id") DO NOTHING;

-- Source migration: 20261113010000_staff_account_management
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM "staff_profiles"
        WHERE "user_id" IS NOT NULL
        GROUP BY "school_id", "user_id"
        HAVING COUNT(*) > 1
    ) THEN
        RAISE EXCEPTION 'Cannot enforce one staff profile per school user while duplicate links exist';
    END IF;
END $$;

CREATE UNIQUE INDEX "staff_profiles_school_id_user_id_key"
ON "staff_profiles"("school_id", "user_id");

-- Source migration: 20261113020000_school_announcements
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

-- Source migration: 20261113030000_platform_admin_scope
CREATE TYPE "AuthScope" AS ENUM ('PLATFORM', 'SCHOOL_SELECTION', 'SCHOOL');

ALTER TABLE "refresh_tokens"
ADD COLUMN "scope" "AuthScope" NOT NULL DEFAULT 'SCHOOL_SELECTION';

UPDATE "refresh_tokens"
SET "scope" = 'SCHOOL'
WHERE "active_school_id" IS NOT NULL OR "membership_id" IS NOT NULL;

CREATE TABLE "platform_admin_grants" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "granted_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revoked_at" TIMESTAMPTZ,

    CONSTRAINT "platform_admin_grants_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "platform_admin_grants_user_id_key"
ON "platform_admin_grants"("user_id");

CREATE INDEX "platform_admin_grants_revoked_at_idx"
ON "platform_admin_grants"("revoked_at");

ALTER TABLE "platform_admin_grants"
ADD CONSTRAINT "platform_admin_grants_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

INSERT INTO "permissions" ("id", "key", "description")
VALUES (
    gen_random_uuid(),
    'platform.schools.read',
    'Read platform-wide school directory metadata'
)
ON CONFLICT ("key") DO NOTHING;

-- Source migration: 20261113030100_platform_admin_timestamp_precision
-- AlterTable
ALTER TABLE "platform_admin_grants" ALTER COLUMN "granted_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "revoked_at" SET DATA TYPE TIMESTAMP(3);

-- Source migration: 20261114000000_platform_school_provisioning
-- CreateEnum
CREATE TYPE "SchoolOnboardingStatus" AS ENUM ('NOT_STARTED');

-- CreateEnum
CREATE TYPE "PlatformPermission" AS ENUM ('SCHOOLS_CREATE');

-- CreateTable
CREATE TABLE "platform_admin_grant_permissions" (
    "id" UUID NOT NULL,
    "grant_id" UUID NOT NULL,
    "permission" "PlatformPermission" NOT NULL,
    "granted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revoked_at" TIMESTAMP(3),

    CONSTRAINT "platform_admin_grant_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "school_onboarding_states" (
    "id" UUID NOT NULL,
    "school_id" UUID NOT NULL,
    "status" "SchoolOnboardingStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "school_onboarding_states_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "platform_admin_grant_permissions_grant_id_permission_key" ON "platform_admin_grant_permissions"("grant_id", "permission");

-- CreateIndex
CREATE INDEX "platform_admin_grant_permissions_revoked_at_idx" ON "platform_admin_grant_permissions"("revoked_at");

-- CreateIndex
CREATE UNIQUE INDEX "school_onboarding_states_school_id_key" ON "school_onboarding_states"("school_id");

-- AddForeignKey
ALTER TABLE "platform_admin_grant_permissions" ADD CONSTRAINT "platform_admin_grant_permissions_grant_id_fkey" FOREIGN KEY ("grant_id") REFERENCES "platform_admin_grants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "school_onboarding_states" ADD CONSTRAINT "school_onboarding_states_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Source migration: 20261114010000_platform_audit_read
ALTER TYPE "PlatformPermission" ADD VALUE 'AUDIT_READ';

CREATE INDEX "audit_logs_platform_action_created_at_id_idx"
  ON "audit_logs" ("action", "created_at" DESC, "id" DESC)
  WHERE "school_id" IS NULL;

-- Source migration: 20261114020000_platform_settings_read
ALTER TYPE "PlatformPermission" ADD VALUE 'SETTINGS_READ';

-- Source migration: 20261114030000_platform_support
ALTER TYPE "PlatformPermission" ADD VALUE 'SUPPORT_READ';
ALTER TYPE "PlatformPermission" ADD VALUE 'SUPPORT_UPDATE';

CREATE TYPE "SupportTicketStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'RESOLVED');
CREATE TYPE "SupportTicketPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');

CREATE TABLE "platform_support_tickets" (
  "id" UUID NOT NULL,
  "school_id" UUID NOT NULL,
  "title" VARCHAR(120) NOT NULL,
  "description" VARCHAR(4000) NOT NULL,
  "status" "SupportTicketStatus" NOT NULL DEFAULT 'OPEN',
  "priority" "SupportTicketPriority" NOT NULL DEFAULT 'NORMAL',
  "created_by_id" UUID NOT NULL,
  "assignee_id" UUID,
  "version" INTEGER NOT NULL DEFAULT 1,
  "resolved_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "platform_support_tickets_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "platform_support_tickets_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "platform_support_tickets_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "platform_support_tickets_assignee_id_fkey" FOREIGN KEY ("assignee_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "platform_support_tickets_created_at_id_idx" ON "platform_support_tickets" ("created_at" DESC, "id" DESC);
CREATE INDEX "platform_support_tickets_status_resolved_at_idx" ON "platform_support_tickets" ("status", "resolved_at");

CREATE TABLE "platform_support_ticket_events" (
  "id" UUID NOT NULL,
  "ticket_id" UUID NOT NULL,
  "actor_user_id" UUID NOT NULL,
  "action" VARCHAR(32) NOT NULL,
  "from_value" VARCHAR(64),
  "to_value" VARCHAR(64),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "platform_support_ticket_events_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "platform_support_ticket_events_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "platform_support_tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "platform_support_ticket_events_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "platform_support_ticket_events_ticket_id_created_at_id_idx" ON "platform_support_ticket_events" ("ticket_id", "created_at" DESC, "id" DESC);

-- Source migration: 20261114040000_school_onboarding_completion
ALTER TYPE "SchoolOnboardingStatus" ADD VALUE 'COMPLETED';

-- Source migration: 20261114050000_school_admin_create
ALTER TYPE "PlatformPermission" ADD VALUE 'SCHOOL_ADMINS_CREATE';

-- Source migration: 20261114100000_student_admissions
ALTER TABLE "schools" ADD COLUMN "admission_prefix" TEXT;

CREATE TABLE "admission_sequences" (
  "school_id" UUID NOT NULL,
  "year" INTEGER NOT NULL,
  "last_value" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "admission_sequences_pkey" PRIMARY KEY ("school_id", "year"),
  CONSTRAINT "admission_sequences_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

ALTER TABLE "students"
  ADD COLUMN "address" JSONB,
  ADD COLUMN "emergency_contact_kind" TEXT,
  ADD COLUMN "emergency_contact_name" TEXT,
  ADD COLUMN "emergency_contact_phone" TEXT;

ALTER TABLE "student_enrolments" ADD COLUMN "roll_number" TEXT;
CREATE UNIQUE INDEX "student_enrolments_active_roll_unique"
  ON "student_enrolments" ("school_id", "academic_year_id", "section_id", "roll_number")
  WHERE "is_active" = true AND "end_date" IS NULL AND "roll_number" IS NOT NULL;

-- Source migration: 20261114110000_teacher_accounts_departments
CREATE TABLE "school_departments" (
  "id" UUID NOT NULL,
  "school_id" UUID NOT NULL,
  "name" TEXT NOT NULL,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "school_departments_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "school_departments_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "school_departments_school_id_id_key" ON "school_departments" ("school_id", "id");
CREATE UNIQUE INDEX "school_departments_school_name_unique" ON "school_departments" ("school_id", LOWER("name"));
CREATE INDEX "school_departments_school_id_is_active_idx" ON "school_departments" ("school_id", "is_active");

ALTER TABLE "staff_profiles" ADD COLUMN "department_id" UUID;
ALTER TABLE "staff_profiles" ADD CONSTRAINT "staff_profiles_school_department_fkey"
  FOREIGN KEY ("school_id", "department_id") REFERENCES "school_departments"("school_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Source migration: 20261114174000_teacher_workspace
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

-- Source migration: 20261114174001_teacher_approved_workflows
-- AlterEnum
ALTER TYPE "AttendanceSessionStatus" ADD VALUE 'SUBMITTED';

-- AlterTable
ALTER TABLE "announcements" ADD COLUMN     "schoolClassId" UUID;

-- AlterTable
ALTER TABLE "attendance_sessions" ADD COLUMN     "submitted_at" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "teacher_assessments" ADD COLUMN     "academic_year_id" UUID,
ADD COLUMN     "pass_mark" INTEGER;

-- AlterTable
ALTER TABLE "teacher_assignments" ADD COLUMN     "is_class_teacher" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "grade_scales" (
    "id" UUID NOT NULL,
    "school_id" UUID NOT NULL,
    "academic_year_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "grade_scales_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "grade_bands" (
    "id" UUID NOT NULL,
    "scale_id" UUID NOT NULL,
    "label" VARCHAR(20) NOT NULL,
    "min_percent" INTEGER NOT NULL,
    "max_percent" INTEGER NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "grade_bands_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "grade_scales_academic_year_id_key" ON "grade_scales"("academic_year_id");

-- CreateIndex
CREATE INDEX "grade_scales_school_id_idx" ON "grade_scales"("school_id");

-- CreateIndex
CREATE INDEX "grade_bands_scale_id_sort_order_idx" ON "grade_bands"("scale_id", "sort_order");

-- CreateIndex
CREATE UNIQUE INDEX "grade_bands_scale_id_label_key" ON "grade_bands"("scale_id", "label");

-- CreateIndex
CREATE INDEX "teacher_assessments_school_id_academic_year_id_due_date_idx" ON "teacher_assessments"("school_id", "academic_year_id", "due_date");

-- RenameForeignKey
ALTER TABLE "staff_profiles" RENAME CONSTRAINT "staff_profiles_school_department_fkey" TO "staff_profiles_school_id_department_id_fkey";

-- AddForeignKey
ALTER TABLE "teacher_assessments" ADD CONSTRAINT "teacher_assessments_academic_year_id_fkey" FOREIGN KEY ("academic_year_id") REFERENCES "academic_years"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "grade_scales" ADD CONSTRAINT "grade_scales_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "grade_scales" ADD CONSTRAINT "grade_scales_academic_year_id_fkey" FOREIGN KEY ("academic_year_id") REFERENCES "academic_years"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "grade_bands" ADD CONSTRAINT "grade_bands_scale_id_fkey" FOREIGN KEY ("scale_id") REFERENCES "grade_scales"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "announcements" ADD CONSTRAINT "announcements_schoolClassId_fkey" FOREIGN KEY ("schoolClassId") REFERENCES "classes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Source migration: 20261114190800_teacher_announcements_read
INSERT INTO "role_permissions" ("role_id", "permission_id")
SELECT role."id", permission."id"
FROM "roles" AS role
JOIN "permissions" AS permission
  ON permission."key" = 'announcements.read'
WHERE LOWER(role."key") = 'teacher'
ON CONFLICT ("role_id", "permission_id") DO NOTHING;

-- Source migration: 20261114200000_teacher_draft_lifecycle
ALTER TYPE "AttendanceSessionStatus" ADD VALUE IF NOT EXISTS 'DRAFT';
ALTER TYPE "TeacherAssessmentType" ADD VALUE IF NOT EXISTS 'TEST';

ALTER TABLE "teacher_assessments"
  ADD COLUMN "start_time" TEXT,
  ADD COLUMN "duration_minutes" INTEGER,
  ADD COLUMN "results_published_at" TIMESTAMP(3),
  ADD CONSTRAINT "teacher_assessments_duration_minutes_check"
    CHECK ("duration_minutes" IS NULL OR "duration_minutes" BETWEEN 1 AND 1440),
  ADD CONSTRAINT "teacher_assessments_start_time_check"
    CHECK ("start_time" IS NULL OR "start_time" ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$');

ALTER TABLE "teacher_results"
  ADD COLUMN "feedback" TEXT,
  ADD CONSTRAINT "teacher_results_feedback_length_check"
    CHECK ("feedback" IS NULL OR char_length("feedback") <= 2000);

ALTER TABLE "announcements"
  ADD COLUMN "section_id" UUID,
  ADD COLUMN "category" TEXT,
  ADD CONSTRAINT "announcements_section_id_fkey"
    FOREIGN KEY ("section_id") REFERENCES "sections"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "announcements_school_id_section_id_status_created_at_idx"
  ON "announcements"("school_id", "section_id", "status", "created_at");

-- Source migration: 20261114201500_teacher_class_notice_permission
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

-- Source migration: 20261115120100_teacher_workflow_constraints
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

-- Source migration: 20261115130000_teacher_workspace_role_grants
INSERT INTO "permissions" ("id", "key", "description")
VALUES
  (gen_random_uuid(), 'dashboard.teacher.read', 'Read the authenticated teacher assigned-class attendance dashboard'),
  (gen_random_uuid(), 'announcements.read', 'Read published school-wide announcements')
ON CONFLICT ("key") DO NOTHING;

INSERT INTO "role_permissions" ("role_id", "permission_id")
SELECT role."id", permission."id"
FROM "roles" AS role
CROSS JOIN "permissions" AS permission
WHERE role."school_id" IS NOT NULL
  AND role."key" = 'TEACHER'
  AND permission."key" IN ('dashboard.teacher.read', 'announcements.read')
ON CONFLICT ("role_id", "permission_id") DO NOTHING;

