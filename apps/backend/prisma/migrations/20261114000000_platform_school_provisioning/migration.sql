-- CreateEnum
CREATE TYPE "SchoolOnboardingStatus" AS ENUM ('NOT_STARTED');

-- CreateEnum
CREATE TYPE "PlatformPermission" AS ENUM ('SCHOOLS_CREATE');

-- CreateTable
CREATE TABLE "platform_admin_grant_permissions" (
    "id" UUID NOT NULL,
    "grant_id" UUID NOT NULL,
    "permission" "PlatformPermission" NOT NULL,
    "granted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revoked_at" TIMESTAMP(3),

    CONSTRAINT "platform_admin_grant_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "school_onboarding_states" (
    "id" UUID NOT NULL,
    "school_id" UUID NOT NULL,
    "status" "SchoolOnboardingStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "school_onboarding_states_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "platform_admin_grant_permissions_grant_id_permission_key" ON "platform_admin_grant_permissions"("grant_id", "permission");

-- CreateIndex
CREATE INDEX "platform_admin_grant_permissions_revoked_at_idx" ON "platform_admin_grant_permissions"("revoked_at");

-- CreateIndex
CREATE UNIQUE INDEX "school_onboarding_states_school_id_key" ON "school_onboarding_states"("school_id");

-- AddForeignKey
ALTER TABLE "platform_admin_grant_permissions" ADD CONSTRAINT "platform_admin_grant_permissions_grant_id_fkey" FOREIGN KEY ("grant_id") REFERENCES "platform_admin_grants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "school_onboarding_states" ADD CONSTRAINT "school_onboarding_states_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
