import { BadRequestException, Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../infrastructure/database/prisma.service";
import { ListPlatformAuditDto, PLATFORM_AUDIT_ACTIONS, PlatformAuditAction } from "./dto/list-platform-audit.dto";

const AUDIT_RESOURCES: Record<PlatformAuditAction, string> = {
  PLATFORM_ADMIN_BOOTSTRAPPED: "platform_admin_grant",
  PLATFORM_PERMISSION_GRANTED: "platform_admin_grant_permission",
  PLATFORM_SCHOOL_DIRECTORY_READ: "school_directory",
  PLATFORM_SCHOOL_DETAIL_READ: "school",
  PLATFORM_SCHOOL_CREATED: "school",
  PLATFORM_SCHOOL_ADMIN_CREATED: "school",
  PLATFORM_AUDIT_READ: "platform_audit",
  PLATFORM_SETTINGS_READ: "platform_settings",
  PLATFORM_SUPPORT_CREATED: "platform_support_ticket",
  PLATFORM_SUPPORT_UPDATED: "platform_support_ticket",
  PLATFORM_SUPPORT_RETENTION_CLEANUP: "platform_support_ticket",
};

type Cursor = { createdAt: string; id: string };

function decodeCursor(cursor: string): Cursor {
  try {
    const value: unknown = JSON.parse(Buffer.from(cursor, "base64url").toString("utf8"));
    if (
      typeof value !== "object" || value === null ||
      !("createdAt" in value) || typeof value.createdAt !== "string" ||
      !("id" in value) || typeof value.id !== "string" ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value.id) ||
      !Number.isFinite(Date.parse(value.createdAt)) ||
      new Date(value.createdAt).toISOString() !== value.createdAt
    ) throw new BadRequestException("Invalid audit cursor");
    return { createdAt: value.createdAt, id: value.id };
  } catch (error) {
    if (error instanceof BadRequestException) throw error;
    if (error instanceof SyntaxError) throw new BadRequestException("Invalid audit cursor");
    throw error;
  }
}

@Injectable()
export class PlatformAuditService {
  constructor(private readonly prisma: PrismaService) {}

  async list(actorUserId: string, query: ListPlatformAuditDto) {
    const from = query.from ? new Date(query.from) : undefined;
    const to = query.to ? new Date(query.to) : undefined;
    if (from && to && from > to) throw new BadRequestException("from must not be after to");
    const cursor = query.cursor ? decodeCursor(query.cursor) : undefined;
    const actions = query.action ? [query.action] : PLATFORM_AUDIT_ACTIONS;
    const where: Prisma.AuditLogWhereInput = {
      schoolId: null,
      AND: [
        { OR: actions.map((action) => ({ action, resource: AUDIT_RESOURCES[action] })) },
        ...(from || to ? [{ createdAt: { ...(from && { gte: from }), ...(to && { lte: to }) } }] : []),
        ...(cursor ? [{ OR: [
          { createdAt: { lt: new Date(cursor.createdAt) } },
          { createdAt: new Date(cursor.createdAt), id: { lt: cursor.id } },
        ] }] : []),
      ],
    };
    return this.prisma.$transaction(async (tx) => {
      const entries = await tx.auditLog.findMany({
        where,
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take: query.pageSize + 1,
        select: { id: true, createdAt: true, actorUserId: true, action: true },
      });
      const data = entries.slice(0, query.pageSize);
      const last = data[data.length - 1];
      const nextCursor = entries.length > query.pageSize && last
        ? Buffer.from(JSON.stringify({ createdAt: last.createdAt.toISOString(), id: last.id })).toString("base64url")
        : null;
      await tx.auditLog.create({
        data: {
          actorUserId,
          action: "PLATFORM_AUDIT_READ",
          resource: "platform_audit",
          summary: { resultCount: data.length },
        },
      });
      return { data, nextCursor };
    });
  }
}
