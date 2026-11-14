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
