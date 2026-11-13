import type { PrismaClient } from '@prisma/client';

export const SCHOOLS_CREATE_FLAG = 'SEED_PLATFORM_ADMIN_GRANT_SCHOOLS_CREATE';
export const AUDIT_READ_FLAG = 'SEED_PLATFORM_ADMIN_GRANT_AUDIT_READ';
export const SETTINGS_READ_FLAG = 'SEED_PLATFORM_ADMIN_GRANT_SETTINGS_READ';
export const SUPPORT_READ_FLAG = 'SEED_PLATFORM_ADMIN_GRANT_SUPPORT_READ';
export const SUPPORT_UPDATE_FLAG = 'SEED_PLATFORM_ADMIN_GRANT_SUPPORT_UPDATE';
export const SCHOOL_ADMINS_CREATE_FLAG = 'SEED_PLATFORM_ADMIN_GRANT_SCHOOL_ADMINS_CREATE';

type SeedClient = Pick<PrismaClient, '$transaction'>;

function assertPermissionSeedInputs(
  env: Record<string, string | undefined>,
  flag: string,
): boolean {
  if (env[flag] !== 'true') return false;
  if (!env.SEED_PLATFORM_ADMIN_EMAIL?.trim() || !env.SEED_PLATFORM_ADMIN_PASSWORD) {
    throw new Error(
      `${flag} requires SEED_PLATFORM_ADMIN_EMAIL and SEED_PLATFORM_ADMIN_PASSWORD.`,
    );
  }
  return true;
}

export function assertCreatePermissionSeedInputs(env: Record<string, string | undefined>): boolean {
  return assertPermissionSeedInputs(env, SCHOOLS_CREATE_FLAG);
}

export function assertAuditPermissionSeedInputs(
  env: Record<string, string | undefined>,
): boolean {
  return assertPermissionSeedInputs(env, AUDIT_READ_FLAG);
}

export function assertSettingsPermissionSeedInputs(env: Record<string, string | undefined>): boolean {
  return assertPermissionSeedInputs(env, SETTINGS_READ_FLAG);
}

export function assertSupportReadPermissionSeedInputs(env: Record<string, string | undefined>): boolean {
  return assertPermissionSeedInputs(env, SUPPORT_READ_FLAG);
}

export function assertSupportUpdatePermissionSeedInputs(env: Record<string, string | undefined>): boolean {
  return assertPermissionSeedInputs(env, SUPPORT_UPDATE_FLAG);
}

export function assertSchoolAdminsCreatePermissionSeedInputs(env: Record<string, string | undefined>): boolean {
  return assertPermissionSeedInputs(env, SCHOOL_ADMINS_CREATE_FLAG);
}

// Idempotent: audits only when the permission is newly granted or reactivated.
export async function grantPlatformPermission(
  client: SeedClient,
  platformAdminEmail: string,
  permission: 'SCHOOLS_CREATE' | 'SCHOOL_ADMINS_CREATE' | 'AUDIT_READ' | 'SETTINGS_READ' | 'SUPPORT_READ' | 'SUPPORT_UPDATE',
): Promise<'granted' | 'reactivated' | 'unchanged'> {
  return client.$transaction(async (tx) => {
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
        'Cannot grant platform permission without an active platform administrator grant.',
      );
    }
    const where = {
      grantId_permission: { grantId: grant.id, permission },
    };
    const existing = await tx.platformAdminGrantPermission.findUnique({
      where,
      select: { revokedAt: true },
    });
    if (existing && !existing.revokedAt) return 'unchanged';

    await tx.platformAdminGrantPermission.upsert({
      where,
      create: { grantId: grant.id, permission },
      update: { revokedAt: null },
    });
    const change = existing ? 'reactivated' : 'granted';
    await tx.auditLog.create({
      data: {
        actorUserId: null,
        action: 'PLATFORM_PERMISSION_GRANTED',
        resource: 'platform_admin_grant_permission',
        resourceId: grant.id,
        summary: {
          permission: {
            SCHOOLS_CREATE: 'platform.schools.create',
            SCHOOL_ADMINS_CREATE: 'platform.school-admins.create',
            AUDIT_READ: 'platform.audit.read',
            SETTINGS_READ: 'platform.settings.read',
            SUPPORT_READ: 'platform.support.read',
            SUPPORT_UPDATE: 'platform.support.update',
          }[permission],
          change,
          provisioning: 'environment-seed',
        },
      },
    });
    return change;
  });
}

export function grantSchoolsCreatePermission(client: SeedClient, platformAdminEmail: string) {
  return grantPlatformPermission(client, platformAdminEmail, 'SCHOOLS_CREATE');
}
