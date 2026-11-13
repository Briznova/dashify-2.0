import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma, SupportTicketPriority, SupportTicketStatus } from "@prisma/client";
import { PrismaService } from "../../infrastructure/database/prisma.service";
import { CreateSupportTicketDto, ListSupportTicketsDto, SupportTicketActionDto } from "./dto/platform-support.dto";

const ticketSelect = {
  id: true, schoolId: true, title: true, description: true, status: true,
  priority: true, createdById: true, assigneeId: true, version: true,
  resolvedAt: true, createdAt: true, updatedAt: true,
  school: { select: { id: true, name: true, code: true } },
} as const;

function decodeCursor(cursor: string): { createdAt: Date; id: string } {
  try {
    const value: unknown = JSON.parse(Buffer.from(cursor, "base64url").toString("utf8"));
    if (typeof value !== "object" || value === null ||
      !("id" in value) || typeof value.id !== "string" ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value.id) ||
      !("createdAt" in value) || typeof value.createdAt !== "string" ||
      !Number.isFinite(Date.parse(value.createdAt)) ||
      new Date(value.createdAt).toISOString() !== value.createdAt) {
      throw new BadRequestException("Invalid support cursor");
    }
    return { id: value.id, createdAt: new Date(value.createdAt) };
  } catch (error) {
    if (error instanceof SyntaxError) throw new BadRequestException("Invalid support cursor");
    throw error;
  }
}

@Injectable()
export class PlatformSupportService {
  constructor(private readonly prisma: PrismaService) {}

  async summary() {
    const unresolved = await this.prisma.platformSupportTicket.count({
      where: { status: { in: [SupportTicketStatus.OPEN, SupportTicketStatus.IN_PROGRESS] } },
    });
    return { unresolved };
  }

  async list(query: ListSupportTicketsDto) {
    const cursor = query.cursor ? decodeCursor(query.cursor) : undefined;
    const tickets = await this.prisma.platformSupportTicket.findMany({
      where: {
        ...(query.status && { status: query.status }),
        ...(cursor && { OR: [
          { createdAt: { lt: cursor.createdAt } },
          { createdAt: cursor.createdAt, id: { lt: cursor.id } },
        ] }),
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: query.pageSize + 1,
      select: ticketSelect,
    });
    const data = tickets.slice(0, query.pageSize);
    const last = data[data.length - 1];
    return {
      data,
      nextCursor: tickets.length > query.pageSize && last
        ? Buffer.from(JSON.stringify({ createdAt: last.createdAt.toISOString(), id: last.id })).toString("base64url")
        : null,
    };
  }

  async detail(id: string) {
    const ticket = await this.prisma.platformSupportTicket.findUnique({
      where: { id },
      select: {
        ...ticketSelect,
        events: {
          select: { id: true, actorUserId: true, action: true, fromValue: true, toValue: true, createdAt: true },
          orderBy: [{ createdAt: "desc" }, { id: "desc" }],
          take: 100,
        },
      },
    });
    if (!ticket) throw new NotFoundException("Support ticket not found");
    return ticket;
  }

  async create(actorUserId: string, input: CreateSupportTicketDto) {
    return this.prisma.withTenant(input.schoolId, async (tx) => {
      const school = await tx.school.findUnique({ where: { id: input.schoolId }, select: { id: true } });
      if (!school) throw new NotFoundException("School not found");
      const ticket = await tx.platformSupportTicket.create({
        data: {
          schoolId: input.schoolId, title: input.title, description: input.description,
          priority: input.priority ?? SupportTicketPriority.NORMAL, createdById: actorUserId,
        },
        select: ticketSelect,
      });
      await tx.platformSupportTicketEvent.create({
        data: { ticketId: ticket.id, actorUserId, action: "CREATED" },
      });
      await tx.auditLog.create({
        data: { actorUserId, action: "PLATFORM_SUPPORT_CREATED", resource: "platform_support_ticket", resourceId: ticket.id },
      });
      return ticket;
    });
  }

  async act(actorUserId: string, id: string, input: SupportTicketActionDto) {
    return this.prisma.$transaction(async (tx) => {
      const ticket = await tx.platformSupportTicket.findUnique({ where: { id }, select: ticketSelect });
      if (!ticket) throw new NotFoundException("Support ticket not found");
      if (ticket.version !== input.version) throw new ConflictException("Ticket changed; reload and try again");

      const data: Prisma.PlatformSupportTicketUncheckedUpdateManyInput = { version: { increment: 1 } };
      let fromValue: string | null = null;
      let toValue: string | null = null;
      if (input.action === "SET_STATUS") {
        const status = Object.values(SupportTicketStatus).find((value) => value === input.value);
        if (!status) throw new BadRequestException("Invalid support status");
        const allowed: Record<SupportTicketStatus, SupportTicketStatus[]> = {
          OPEN: ["IN_PROGRESS", "RESOLVED"],
          IN_PROGRESS: ["OPEN", "RESOLVED"],
          RESOLVED: ["OPEN"],
        };
        if (!allowed[ticket.status].includes(status)) throw new ConflictException("Invalid status transition");
        fromValue = ticket.status;
        toValue = status;
        data.status = status;
        data.resolvedAt = status === "RESOLVED" ? new Date() : null;
      } else if (input.action === "SET_PRIORITY") {
        const priority = Object.values(SupportTicketPriority).find((value) => value === input.value);
        if (!priority) throw new BadRequestException("Invalid support priority");
        if (ticket.priority === priority) throw new ConflictException("Priority is unchanged");
        fromValue = ticket.priority;
        toValue = priority;
        data.priority = priority;
      } else {
        if (input.value !== undefined) throw new BadRequestException("This action does not accept a value");
        if (input.action === "CLAIM") {
          if (ticket.assigneeId) throw new ConflictException("Ticket is already assigned");
          data.assigneeId = actorUserId;
          toValue = actorUserId;
        } else if (input.action === "RELEASE") {
          if (ticket.assigneeId !== actorUserId) throw new ConflictException("Only the assignee can release this ticket");
          data.assigneeId = null;
          fromValue = actorUserId;
        } else {
          throw new BadRequestException("Invalid support action");
        }
      }

      const changed = await tx.platformSupportTicket.updateMany({ where: { id, version: input.version }, data });
      if (changed.count !== 1) throw new ConflictException("Ticket changed; reload and try again");
      await tx.platformSupportTicketEvent.create({
        data: { ticketId: id, actorUserId, action: input.action, fromValue, toValue },
      });
      await tx.auditLog.create({
        data: { actorUserId, action: "PLATFORM_SUPPORT_UPDATED", resource: "platform_support_ticket", resourceId: id, summary: { action: input.action } },
      });
      return tx.platformSupportTicket.findUniqueOrThrow({ where: { id }, select: ticketSelect });
    });
  }
}
