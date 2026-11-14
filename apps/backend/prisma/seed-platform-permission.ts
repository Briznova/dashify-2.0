import type { PlatformPermission, Prisma, PrismaClient } from "@prisma/client";

type SeedClient = Pick<PrismaClient, "$transaction">;

// Idempotent: audits only when the permission is newly granted or reactivated.
export async function grantPlatformPermission(
  client: SeedClient,
  platformAdminEmail: string,
  permission: PlatformPermission,
): Promise<"granted" | "reactivated" | "unchanged"> {
  return client.$transaction((tx) =>
    grantPlatformPermissionInTransaction(tx, platformAdminEmail, permission),
  );
}

export async function grantPlatformPermissionInTransaction(
  tx: Prisma.TransactionClient,
  platformAdminEmail: string,
  permission: PlatformPermission,
): Promise<"granted" | "reactivated" | "unchanged"> {
  const admin = await tx.user.findUnique({
    where: { email: platformAdminEmail },
    select: {
      isActive: true,
      platformAdminGrant: { select: { id: true, revokedAt: true } },
    },
  });
  const grant = admin?.platformAdminGrant;
  if (!admin?.isActive || !grant || grant.revokedAt) {
    throw new Error(
      "Cannot grant platform permission without an active platform administrator grant.",
    );
  }
  const where = {
    grantId_permission: { grantId: grant.id, permission },
  };
  const existing = await tx.platformAdminGrantPermission.findUnique({
    where,
    select: { revokedAt: true },
  });
  if (existing && !existing.revokedAt) return "unchanged";

  await tx.platformAdminGrantPermission.upsert({
    where,
    create: { grantId: grant.id, permission },
    update: { revokedAt: null },
  });
  const change = existing ? "reactivated" : "granted";
  await tx.auditLog.create({
    data: {
      actorUserId: null,
      action: "PLATFORM_PERMISSION_GRANTED",
      resource: "platform_admin_grant_permission",
      resourceId: grant.id,
      summary: {
        permission: {
          SCHOOLS_CREATE: "platform.schools.create",
          SCHOOL_ADMINS_CREATE: "platform.school-admins.create",
          AUDIT_READ: "platform.audit.read",
          SETTINGS_READ: "platform.settings.read",
          SUPPORT_READ: "platform.support.read",
          SUPPORT_UPDATE: "platform.support.update",
        }[permission],
        change,
        provisioning: "environment-seed",
      },
    },
  });
  return change;
}

export function grantSchoolsCreatePermission(
  client: SeedClient,
  platformAdminEmail: string,
) {
  return grantPlatformPermission(client, platformAdminEmail, "SCHOOLS_CREATE");
}
