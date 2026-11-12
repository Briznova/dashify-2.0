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
