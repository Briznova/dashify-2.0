export const platformAuditActions = [
  "PLATFORM_ADMIN_BOOTSTRAPPED",
  "PLATFORM_PERMISSION_GRANTED",
  "PLATFORM_SCHOOL_DIRECTORY_READ",
  "PLATFORM_SCHOOL_DETAIL_READ",
  "PLATFORM_SCHOOL_CREATED",
  "PLATFORM_SCHOOL_ADMIN_CREATED",
  "PLATFORM_AUDIT_READ",
  "PLATFORM_SETTINGS_READ",
  "PLATFORM_SUPPORT_CREATED",
  "PLATFORM_SUPPORT_UPDATED",
  "PLATFORM_SUPPORT_RETENTION_CLEANUP",
] as const;

export type PlatformAuditAction = (typeof platformAuditActions)[number];
export type PlatformAuditEvent = {
  id: string;
  createdAt: string;
  actorUserId: string | null;
  action: PlatformAuditAction;
};
export type PlatformAuditPageData = { data: PlatformAuditEvent[]; nextCursor: string | null };
