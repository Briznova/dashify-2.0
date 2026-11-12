import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createAttendanceReportCsv,
  downloadAttendanceReportCsv,
} from "@/lib/attendance-report-csv";
import type { AttendanceReport } from "@/types/school";

const report: AttendanceReport = {
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
};

const originalCreateObjectUrl = Object.getOwnPropertyDescriptor(
  URL,
  "createObjectURL",
);
const originalRevokeObjectUrl = Object.getOwnPropertyDescriptor(
  URL,
  "revokeObjectURL",
);

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  if (originalCreateObjectUrl) {
    Object.defineProperty(URL, "createObjectURL", originalCreateObjectUrl);
  } else {
    Reflect.deleteProperty(URL, "createObjectURL");
  }
  if (originalRevokeObjectUrl) {
    Object.defineProperty(URL, "revokeObjectURL", originalRevokeObjectUrl);
  } else {
    Reflect.deleteProperty(URL, "revokeObjectURL");
  }
});

describe("attendance report CSV", () => {
  it("serializes only the aggregate date range and counts", () => {
    expect(createAttendanceReportCsv(report)).toBe(
      '"row_type","from_date","to_date","date","total_sessions","total_records","present","absent","late","excused"\r\n' +
        '"SUMMARY","2026-04-01","2026-04-30","","3","24","18","3","2","1"\r\n' +
        '"DAILY","","","2026-04-01","1","8","6","1","1","0"\r\n' +
        '"DAILY","","","2026-04-30","2","16","12","2","1","1"\r\n',
    );
  });

  it("downloads a range-named CSV and releases the temporary object URL", () => {
    const createdBlobs: Blob[] = [];
    const createObjectUrl = vi.fn((blob: Blob) => {
      createdBlobs.push(blob);
      return "blob:attendance-report";
    });
    const revokeObjectUrl = vi.fn();
    const clickedDownloads: string[] = [];
    Object.defineProperty(URL, "createObjectURL", {
      configurable: true,
      value: createObjectUrl,
    });
    Object.defineProperty(URL, "revokeObjectURL", {
      configurable: true,
      value: revokeObjectUrl,
    });
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(function (this: HTMLAnchorElement) {
        clickedDownloads.push(this.download);
      });
    vi.useFakeTimers();

    downloadAttendanceReportCsv(report);

    expect(createObjectUrl).toHaveBeenCalledOnce();
    expect(createdBlobs).toHaveLength(1);
    expect(createdBlobs[0]).toBeInstanceOf(Blob);
    expect(createdBlobs[0].type).toBe("text/csv;charset=utf-8");
    expect(click).toHaveBeenCalledOnce();
    expect(clickedDownloads).toEqual([
      "attendance-report-2026-04-01-to-2026-04-30.csv",
    ]);
    expect(
      document.querySelector(
        'a[download="attendance-report-2026-04-01-to-2026-04-30.csv"]',
      ),
    ).toBeNull();

    vi.runOnlyPendingTimers();
    expect(revokeObjectUrl).toHaveBeenCalledWith("blob:attendance-report");
  });
});
