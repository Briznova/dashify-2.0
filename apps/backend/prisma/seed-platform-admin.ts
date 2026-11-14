import { PlatformPermission, PrismaClient } from "@prisma/client";
import * as argon2 from "argon2";
import { isEmail } from "class-validator";
import { grantPlatformPermissionInTransaction } from "./seed-platform-permission";

const BOOTSTRAP_PERMISSIONS: readonly PlatformPermission[] = [
  "SCHOOLS_CREATE",
  "SCHOOL_ADMINS_CREATE",
  "AUDIT_READ",
  "SETTINGS_READ",
  "SUPPORT_READ",
  "SUPPORT_UPDATE",
];

export async function bootstrapPlatformAdmin(
  prisma: PrismaClient,
  env: Record<string, string | undefined>,
): Promise<void> {
  const email = env.SEED_PLATFORM_ADMIN_EMAIL?.trim().toLowerCase();
  const password = env.SEED_PLATFORM_ADMIN_PASSWORD;
  if (
    !email ||
    email.length > 254 ||
    !isEmail(email) ||
    !password ||
    password.length < 12
  ) {
    throw new Error(
      "Set a valid SEED_PLATFORM_ADMIN_EMAIL and SEED_PLATFORM_ADMIN_PASSWORD of at least 12 characters.",
    );
  }

  await prisma.$transaction(async (tx) => {
    const existing = await tx.user.findFirst({
      where: { email: { equals: email, mode: "insensitive" } },
      include: {
        platformAdminGrant: { include: { permissions: true } },
        memberships: { where: { status: "ACTIVE" }, select: { id: true } },
      },
    });
    if (existing) {
      const grant = existing.platformAdminGrant;
      if (
        existing.email !== email ||
        !existing.isActive ||
        !grant ||
        grant.revokedAt ||
        existing.memberships.length
      ) {
        throw new Error(
          "The seed email is already in use by an account that is not an active dedicated platform administrator.",
        );
      }
      if (!(await argon2.verify(existing.passwordHash, password))) {
        throw new Error(
          "SEED_PLATFORM_ADMIN_PASSWORD does not match the existing platform administrator.",
        );
      }
      if (
        BOOTSTRAP_PERMISSIONS.some(
          (permission) =>
            !grant.permissions.some(
              (entry) => entry.permission === permission && !entry.revokedAt,
            ),
        )
      ) {
        throw new Error(
          "The existing platform administrator lacks bootstrap permissions; review its grants instead of restoring them through the seed.",
        );
      }
      return;
    }

    const admin = await tx.user.create({
      data: {
        email,
        passwordHash: await argon2.hash(password),
        firstName: "Platform",
        lastName: "Super Admin",
        platformAdminGrant: { create: {} },
      },
      select: { id: true },
    });
    await tx.auditLog.create({
      data: {
        actorUserId: null,
        action: "PLATFORM_ADMIN_BOOTSTRAPPED",
        resource: "platform_admin_grant",
        resourceId: admin.id,
        summary: { provisioning: "environment-seed" },
      },
    });
    for (const permission of BOOTSTRAP_PERMISSIONS) {
      await grantPlatformPermissionInTransaction(tx, email, permission);
    }
  });
}
