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
