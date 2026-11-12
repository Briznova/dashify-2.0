-- AlterTable
ALTER TABLE "platform_admin_grants" ALTER COLUMN "granted_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "revoked_at" SET DATA TYPE TIMESTAMP(3);
