import { BadRequestException, ConflictException, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../infrastructure/database/prisma.service";
import { PlatformSupportService } from "./platform-support.service";
import { PlatformSupportRetentionService } from "./platform-support-retention.service";

const ticket = {
  id: "00000000-0000-4000-8000-000000000001",
  schoolId: "00000000-0000-4000-8000-000000000002",
  title: "Synthetic issue", description: "Synthetic description", status: "OPEN",
  priority: "NORMAL", createdById: "actor", assigneeId: null, version: 1,
  resolvedAt: null, createdAt: new Date("2026-01-01T00:00:00Z"),
  updatedAt: new Date("2026-01-01T00:00:00Z"),
  school: { id: "00000000-0000-4000-8000-000000000002", name: "Example", code: "EX" },
};

function setup() {
  const tx = {
    school: { findUnique: jest.fn().mockResolvedValue({ id: ticket.schoolId }) },
    platformSupportTicket: {
      findUnique: jest.fn().mockResolvedValue(ticket),
      findUniqueOrThrow: jest.fn().mockResolvedValue(ticket),
      create: jest.fn().mockResolvedValue(ticket),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      deleteMany: jest.fn().mockResolvedValue({ count: 2 }),
    },
    platformSupportTicketEvent: { create: jest.fn().mockResolvedValue({}) },
    auditLog: { create: jest.fn().mockResolvedValue({}) },
  };
  const prisma = {
    withTenant: jest.fn(async (_id: string, fn: (value: typeof tx) => unknown) => fn(tx)),
    $transaction: jest.fn(async (fn: (value: typeof tx) => unknown) => fn(tx)),
  };
  return { tx, prisma, service: new PlatformSupportService(prisma as unknown as PrismaService) };
}

describe("platform support", () => {
  it("counts both unresolved statuses without counting resolved tickets", async () => {
    const count = jest.fn().mockResolvedValue(3);
    const service = new PlatformSupportService({ platformSupportTicket: { count } } as unknown as PrismaService);
    await expect(service.summary()).resolves.toEqual({ unresolved: 3 });
    expect(count).toHaveBeenCalledWith({ where: { status: { in: ["OPEN", "IN_PROGRESS"] } } });
  });

  it("creates a ticket and redacted audit under the target school transaction", async () => {
    const { tx, prisma, service } = setup();
    await service.create("actor", { schoolId: ticket.schoolId, title: ticket.title, description: ticket.description });
    expect(prisma.withTenant).toHaveBeenCalledWith(ticket.schoolId, expect.any(Function));
    expect(tx.platformSupportTicketEvent.create).toHaveBeenCalled();
    const audit = tx.auditLog.create.mock.calls[0][0];
    expect(audit.data.action).toBe("PLATFORM_SUPPORT_CREATED");
    expect(JSON.stringify(audit)).not.toContain(ticket.title);
    expect(JSON.stringify(audit)).not.toContain(ticket.description);
  });

  it("rejects unknown schools without creating a ticket", async () => {
    const { tx, service } = setup();
    tx.school.findUnique.mockResolvedValue(null);
    await expect(service.create("actor", { schoolId: ticket.schoolId, title: ticket.title, description: ticket.description })).rejects.toBeInstanceOf(NotFoundException);
    expect(tx.platformSupportTicket.create).not.toHaveBeenCalled();
  });

  it("records resolution and reopening while clearing the retention clock", async () => {
    const { tx, service } = setup();
    await service.act("actor", ticket.id, { action: "SET_STATUS", version: 1, value: "RESOLVED" });
    expect(tx.platformSupportTicket.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: ticket.id, version: 1 },
      data: expect.objectContaining({ status: "RESOLVED", resolvedAt: expect.any(Date) }),
    }));
    tx.platformSupportTicket.findUnique.mockResolvedValue({ ...ticket, status: "RESOLVED", version: 2 });
    await service.act("actor", ticket.id, { action: "SET_STATUS", version: 2, value: "OPEN" });
    expect(tx.platformSupportTicket.updateMany).toHaveBeenLastCalledWith(expect.objectContaining({
      data: expect.objectContaining({ status: "OPEN", resolvedAt: null }),
    }));
    expect(JSON.stringify(tx.auditLog.create.mock.calls)).not.toContain(ticket.description);
  });

  it("rejects stale changes and forbidden transitions or assignment", async () => {
    const { tx, service } = setup();
    await expect(service.act("actor", ticket.id, { action: "CLAIM", version: 2 })).rejects.toBeInstanceOf(ConflictException);
    tx.platformSupportTicket.findUnique.mockResolvedValue({ ...ticket, status: "RESOLVED", assigneeId: "other" });
    await expect(service.act("actor", ticket.id, { action: "SET_STATUS", version: 1, value: "IN_PROGRESS" })).rejects.toBeInstanceOf(ConflictException);
    await expect(service.act("actor", ticket.id, { action: "CLAIM", version: 1 })).rejects.toBeInstanceOf(ConflictException);
    await expect(service.act("actor", ticket.id, { action: "RELEASE", version: 1 })).rejects.toBeInstanceOf(ConflictException);
    await expect(service.act("actor", ticket.id, { action: "CLAIM", version: 1, value: "unexpected" })).rejects.toBeInstanceOf(BadRequestException);
    expect(tx.platformSupportTicket.updateMany).not.toHaveBeenCalled();
  });

  it("rejects concurrent changes instead of recording a false success", async () => {
    const { tx, service } = setup();
    tx.platformSupportTicket.updateMany.mockResolvedValue({ count: 0 });
    await expect(service.act("actor", ticket.id, { action: "CLAIM", version: 1 })).rejects.toBeInstanceOf(ConflictException);
    expect(tx.platformSupportTicketEvent.create).not.toHaveBeenCalled();
    expect(tx.auditLog.create).not.toHaveBeenCalled();
  });

  it("deletes only tickets still resolved at the 365-day cutoff and audits the count", async () => {
    const { tx, prisma } = setup();
    const retention = new PlatformSupportRetentionService(prisma as unknown as PrismaService);
    await expect(retention.cleanup(new Date("2026-11-14T00:00:00Z"))).resolves.toBe(2);
    expect(tx.platformSupportTicket.deleteMany).toHaveBeenCalledWith({
      where: { status: "RESOLVED", resolvedAt: { lte: new Date("2025-11-14T00:00:00Z") } },
    });
    expect(tx.auditLog.create).toHaveBeenCalledWith({
      data: { action: "PLATFORM_SUPPORT_RETENTION_CLEANUP", resource: "platform_support_ticket", summary: { deletedCount: 2 } },
    });
  });
});
