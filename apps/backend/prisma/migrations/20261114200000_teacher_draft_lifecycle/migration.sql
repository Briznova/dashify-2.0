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
