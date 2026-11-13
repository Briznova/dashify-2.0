ALTER TYPE "PlatformPermission" ADD VALUE 'AUDIT_READ';

CREATE INDEX "audit_logs_platform_action_created_at_id_idx"
  ON "audit_logs" ("action", "created_at" DESC, "id" DESC)
  WHERE "school_id" IS NULL;
