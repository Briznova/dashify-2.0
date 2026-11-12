import { PrismaService } from "../../infrastructure/database/prisma.service";
import { PlatformSchoolsService } from "./platform-schools.service";

describe("PlatformSchoolsService", () => {
  it("returns and audits only the approved school directory metadata", async () => {
    const schools = [
      {
        id: "school-1",
        name: "Example School",
        code: "EXAMPLE",
        isActive: true,
        createdAt: new Date("2026-04-03T08:00:00.000Z"),
      },
    ];
    const transaction = {
      school: { findMany: jest.fn().mockResolvedValue(schools) },
      auditLog: { create: jest.fn().mockResolvedValue({ id: "audit-1" }) },
    };
    const prisma = {
      $transaction: jest.fn(
        async (callback: (tx: typeof transaction) => Promise<unknown>) =>
          callback(transaction),
      ),
    };
    const service = new PlatformSchoolsService(
      prisma as unknown as PrismaService,
    );

    await expect(service.list("platform-user-1")).resolves.toEqual(schools);
    expect(transaction.school.findMany).toHaveBeenCalledWith({
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        code: true,
        isActive: true,
        createdAt: true,
      },
    });
    expect(transaction.auditLog.create).toHaveBeenCalledWith({
      data: {
        actorUserId: "platform-user-1",
        action: "PLATFORM_SCHOOL_DIRECTORY_READ",
        resource: "school_directory",
        summary: { resultCount: 1 },
      },
    });
  });
});
