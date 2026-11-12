import { BadRequestException } from "@nestjs/common";
import { PrismaService } from "../../infrastructure/database/prisma.service";
import { ReportsService } from "./reports.service";

describe("ReportsService attendance report", () => {
  const schoolId = "school-1";
  const transaction = {
    attendanceSession: { count: jest.fn() },
    attendanceRecord: { groupBy: jest.fn() },
  };
  const withTenant = jest.fn(
    (_schoolId: string, work: (tx: typeof transaction) => Promise<unknown>) =>
      work(transaction),
  );
  const service = new ReportsService({
    withTenant,
  } as unknown as PrismaService);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("counts only closed sessions and their records in the active-school range", async () => {
    transaction.attendanceSession.count.mockResolvedValue(3);
    transaction.attendanceRecord.groupBy.mockResolvedValue([
      { status: "PRESENT", _count: { _all: 18 } },
      { status: "ABSENT", _count: { _all: 3 } },
      { status: "LATE", _count: { _all: 2 } },
      { status: "EXCUSED", _count: { _all: 1 } },
    ]);

    await expect(
      service.getAttendanceReport(schoolId, {
        fromDate: "2026-04-01",
        toDate: "2026-04-30",
      }),
    ).resolves.toEqual({
      fromDate: "2026-04-01",
      toDate: "2026-04-30",
      totalSessions: 3,
      totalRecords: 24,
      statusCounts: {
        PRESENT: 18,
        ABSENT: 3,
        LATE: 2,
        EXCUSED: 1,
      },
    });

    const from = new Date("2026-04-01T00:00:00.000Z");
    const to = new Date("2026-04-30T00:00:00.000Z");
    const sessionScope = {
      schoolId,
      status: "CLOSED",
      date: { gte: from, lte: to },
    };
    expect(withTenant).toHaveBeenCalledWith(schoolId, expect.any(Function));
    expect(transaction.attendanceSession.count).toHaveBeenCalledWith({
      where: sessionScope,
    });
    expect(transaction.attendanceRecord.groupBy).toHaveBeenCalledWith({
      by: ["status"],
      where: { schoolId, session: { is: sessionScope } },
      _count: { _all: true },
    });
  });

  it.each([
    ["invalid calendar date", "2026-02-30", "2026-03-01"],
    ["reversed date range", "2026-04-02", "2026-04-01"],
  ])(
    "rejects an %s before querying",
    async (_description, fromDate, toDate) => {
      await expect(
        service.getAttendanceReport(schoolId, { fromDate, toDate }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(withTenant).not.toHaveBeenCalled();
    },
  );
});
