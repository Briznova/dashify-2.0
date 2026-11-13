import { BadRequestException } from "@nestjs/common";
import { PrismaService } from "../../infrastructure/database/prisma.service";
import { ListPlatformAuditDto } from "./dto/list-platform-audit.dto";
import { PlatformAuditService } from "./platform-audit.service";

describe("PlatformAuditService", () => {
  const first = {
    id: "00000000-0000-4000-8000-000000000002",
    createdAt: new Date("2026-01-02T00:00:00.000Z"),
    action: "PLATFORM_SCHOOL_CREATED",
    actorUserId: "00000000-0000-4000-8000-000000000003",
  };
  const second = { ...first, id: "00000000-0000-4000-8000-000000000001" };
  function setup() {
    const tx = {
      auditLog: {
        findMany: jest.fn().mockResolvedValue([first, second]),
        create: jest.fn().mockResolvedValue({}),
      },
    };
    const prisma = { $transaction: jest.fn(async (fn: (value: typeof tx) => unknown) => fn(tx)) };
    return { tx, service: new PlatformAuditService(prisma as unknown as PrismaService) };
  }

  it("limits the query to known platform actions and safe fields and audits the read", async () => {
    const { tx, service } = setup();
    const result = await service.list("actor", { pageSize: 1 });
    expect(result.data).toEqual([first]);
    expect(result.nextCursor).toBeTruthy();
    expect(tx.auditLog.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ schoolId: null }),
      select: { id: true, createdAt: true, actorUserId: true, action: true },
      take: 2,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    }));
    const filter = tx.auditLog.findMany.mock.calls[0][0].where;
    expect(JSON.stringify(filter)).toContain("PLATFORM_SCHOOL_CREATED");
    expect(JSON.stringify(filter)).not.toContain("STUDENT_CREATED");
    expect(tx.auditLog.create).toHaveBeenCalledWith({
      data: { actorUserId: "actor", action: "PLATFORM_AUDIT_READ", resource: "platform_audit", summary: { resultCount: 1 } },
    });
    await service.list("actor", { pageSize: 1, cursor: result.nextCursor ?? undefined });
    expect(tx.auditLog.findMany.mock.calls[1][0].where.AND).toContainEqual({
      OR: [
        { createdAt: { lt: first.createdAt } },
        { createdAt: first.createdAt, id: { lt: first.id } },
      ],
    });
  });

  it("rejects malformed cursors and inverted date ranges without reading", async () => {
    const { tx, service } = setup();
    await expect(service.list("actor", { pageSize: 25, cursor: "invalid" })).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.list("actor", {
      pageSize: 25, from: "2026-02-01T00:00:00Z", to: "2026-01-01T00:00:00Z",
    })).rejects.toBeInstanceOf(BadRequestException);
    expect(tx.auditLog.findMany).not.toHaveBeenCalled();
  });

  it("propagates failure to record the read instead of returning data", async () => {
    const { tx, service } = setup();
    tx.auditLog.create.mockRejectedValue(new Error("audit unavailable"));
    await expect(service.list("actor", new ListPlatformAuditDto())).rejects.toThrow("audit unavailable");
  });
});
