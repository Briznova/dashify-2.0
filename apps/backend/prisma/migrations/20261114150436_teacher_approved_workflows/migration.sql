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
