ALTER TABLE "refresh_tokens"
ADD COLUMN "session_id" UUID,
ADD COLUMN "active_school_id" UUID,
ADD COLUMN "membership_id" UUID,
ADD COLUMN "active_workspace_role" TEXT;

CREATE INDEX "refresh_tokens_session_id_revoked_at_idx"
ON "refresh_tokens"("session_id", "revoked_at");
