import { BadRequestException } from "@nestjs/common";
import { PrismaService } from "../../infrastructure/database/prisma.service";
import { ReportsService } from "./reports.service";

describe("ReportsService attendance report", () => {
  const schoolId = "school-1";
  const transaction = {
    $queryRaw: jest.fn(),
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
    transaction.$queryRaw.mockResolvedValue([
      {
        date: "2026-04-01",
        totalSessions: 1,
        totalRecords: 8,
        present: 6,
        absent: 1,
        late: 1,
        excused: 0,
      },
      {
        date: "2026-04-30",
        totalSessions: 2,
        totalRecords: 16,
        present: 12,
        absent: 2,
        late: 1,
        excused: 1,
      },
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
      dailyBreakdown: [
        {
          date: "2026-04-01",
          totalSessions: 1,
          totalRecords: 8,
          statusCounts: {
            PRESENT: 6,
            ABSENT: 1,
            LATE: 1,
            EXCUSED: 0,
          },
        },
        {
          date: "2026-04-30",
          totalSessions: 2,
          totalRecords: 16,
          statusCounts: {
            PRESENT: 12,
            ABSENT: 2,
            LATE: 1,
            EXCUSED: 1,
          },
        },
      ],
    });

    expect(withTenant).toHaveBeenCalledWith(schoolId, expect.any(Function));
    expect(transaction.$queryRaw).toHaveBeenCalledTimes(1);
    const query = transaction.$queryRaw.mock.calls[0][0] as {
      sql: string;
      values: unknown[];
    };
    expect(query.sql).toContain('"attendance_sessions"');
    expect(query.sql).toContain('"attendance_records"');
    expect(query.sql).toContain('"school_id"');
    expect(query.sql).toContain(`s."status"::text = 'CLOSED'`);
    expect(query.sql).toContain('s."date" >= ');
    expect(query.sql).toContain('s."date" <= ');
    expect(query.values).toEqual([schoolId, "2026-04-01", "2026-04-30"]);
  });

  it("returns empty aggregates when the range has no closed sessions", async () => {
    transaction.$queryRaw.mockResolvedValue([]);

    await expect(
      service.getAttendanceReport(schoolId, {
        fromDate: "2026-04-01",
        toDate: "2026-04-01",
      }),
    ).resolves.toEqual({
      fromDate: "2026-04-01",
      toDate: "2026-04-01",
      totalSessions: 0,
      totalRecords: 0,
      statusCounts: {
        PRESENT: 0,
        ABSENT: 0,
        LATE: 0,
        EXCUSED: 0,
      },
      dailyBreakdown: [],
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
