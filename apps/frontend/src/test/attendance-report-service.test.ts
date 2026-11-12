import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiClient, ApiError } from "@/services/api-client";
import { HttpSchoolService } from "@/services/http/http-school-service";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("HttpSchoolService.getAttendanceReport", () => {
  const fromDate = "2026-04-01";
  const toDate = "2026-04-30";
  const report = {
    fromDate,
    toDate,
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
        totalSessions: 3,
        totalRecords: 24,
        statusCounts: {
          PRESENT: 18,
          ABSENT: 3,
          LATE: 2,
          EXCUSED: 1,
        },
      },
    ],
  };

  it("requests the selected date range and validates the aggregate response", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(report), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const service = new HttpSchoolService(new ApiClient("https://dashify.test/api/v1"));

    await expect(
      service.getAttendanceReport(fromDate, toDate),
    ).resolves.toEqual(report);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://dashify.test/api/v1/reports/attendance?fromDate=2026-04-01&toDate=2026-04-30",
      expect.objectContaining({ credentials: "include" }),
    );
  });

  it("rejects inconsistent report totals", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ ...report, totalRecords: 25 }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const service = new HttpSchoolService(new ApiClient("https://dashify.test/api/v1"));

    await expect(
      service.getAttendanceReport(fromDate, toDate),
    ).rejects.toBeInstanceOf(ApiError);
  });

  it("rejects a daily breakdown that does not reconcile with the report totals", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          ...report,
          dailyBreakdown: [
            {
              date: "2026-04-01",
              totalSessions: 2,
              totalRecords: 24,
              statusCounts: report.statusCounts,
            },
          ],
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);
    const service = new HttpSchoolService(new ApiClient("https://dashify.test/api/v1"));

    await expect(
      service.getAttendanceReport(fromDate, toDate),
    ).rejects.toBeInstanceOf(ApiError);
  });
});
