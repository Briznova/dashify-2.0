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
