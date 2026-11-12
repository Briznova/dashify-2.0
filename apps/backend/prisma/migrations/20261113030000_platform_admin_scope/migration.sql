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
