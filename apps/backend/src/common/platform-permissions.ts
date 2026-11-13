import type { PlatformPermission } from "@prisma/client";

export const PLATFORM_SCHOOLS_READ = "platform.schools.read";
export const PLATFORM_SCHOOLS_CREATE = "platform.schools.create";
export const PLATFORM_SCHOOL_ADMINS_CREATE = "platform.school-admins.create";
export const PLATFORM_AUDIT_READ = "platform.audit.read";
export const PLATFORM_SETTINGS_READ = "platform.settings.read";
export const PLATFORM_SUPPORT_READ = "platform.support.read";
export const PLATFORM_SUPPORT_UPDATE = "platform.support.update";

const PERMISSION_KEYS: Record<PlatformPermission, string> = {
  SCHOOLS_CREATE: PLATFORM_SCHOOLS_CREATE,
  SCHOOL_ADMINS_CREATE: PLATFORM_SCHOOL_ADMINS_CREATE,
  AUDIT_READ: PLATFORM_AUDIT_READ,
  SETTINGS_READ: PLATFORM_SETTINGS_READ,
  SUPPORT_READ: PLATFORM_SUPPORT_READ,
  SUPPORT_UPDATE: PLATFORM_SUPPORT_UPDATE,
};

// Read is implicit for every active grant; all other keys need an explicit, unrevoked row.
export const platformGrantSelect = {
  id: true,
  permissions: {
    where: { revokedAt: null },
    select: { permission: true },
  },
} as const;

export function platformPermissionKeys(
  grant: { permissions?: { permission: PlatformPermission }[] } | null,
): string[] {
  if (!grant) return [];
  return [
    PLATFORM_SCHOOLS_READ,
    ...new Set(
      (grant.permissions ?? []).map(({ permission }) => PERMISSION_KEYS[permission]),
    ),
  ];
}
