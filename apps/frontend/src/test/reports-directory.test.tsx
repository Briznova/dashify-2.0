import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getAttendanceReport: vi.fn(),
  downloadAttendanceReportCsv: vi.fn(),
  isApiMode: true,
}));

vi.mock("@/services", () => ({
  get isApiMode() {
    return mocks.isApiMode;
  },
  schoolService: {
    getAttendanceReport: mocks.getAttendanceReport,
  },
}));

vi.mock("@/lib/attendance-report-csv", () => ({
  downloadAttendanceReportCsv: mocks.downloadAttendanceReportCsv,
}));

import { AcademicReportsDirectory } from "@/components/school-dashboard";

describe("API-mode attendance report", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getAttendanceReport.mockResolvedValue({
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
      ],
    });
  });

  it("requests and renders only the selected real attendance summary", async () => {
    render(<AcademicReportsDirectory />);

    fireEvent.change(screen.getByLabelText("From date"), {
      target: { value: "2026-04-01" },
    });
    fireEvent.change(screen.getByLabelText("To date"), {
      target: { value: "2026-04-30" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Generate report" }));

    expect(await screen.findAllByText("Present")).toHaveLength(2);
    expect(screen.getByText("18")).toBeInTheDocument();
    expect(screen.getByText(/3 closed sessions · 24 attendance records/)).toBeInTheDocument();
    expect(await screen.findByRole("heading", { name: "Daily attendance breakdown" })).toBeInTheDocument();
    expect(screen.getByText("2026-04-01")).toBeInTheDocument();
    expect(await screen.findByRole("button", { name: "Download CSV" })).toBeInTheDocument();
    expect(screen.getByText(/downloaded to your device and is not stored by Dashify/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Download CSV" }));
    expect(mocks.downloadAttendanceReportCsv).toHaveBeenCalledWith({
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
      ],
    });
    expect(screen.queryByText("Term 1 academic performance")).not.toBeInTheDocument();
    expect(mocks.getAttendanceReport).toHaveBeenCalledWith(
      "2026-04-01",
      "2026-04-30",
      expect.any(AbortSignal),
    );
  });

  it("does not offer an export before an aggregate report is generated", () => {
    render(<AcademicReportsDirectory />);

    expect(screen.queryByRole("button", { name: "Download CSV" })).not.toBeInTheDocument();
  });

  it("rejects a reversed date range without making a request", () => {
    render(<AcademicReportsDirectory />);

    fireEvent.change(screen.getByLabelText("From date"), {
      target: { value: "2026-04-30" },
    });
    fireEvent.change(screen.getByLabelText("To date"), {
      target: { value: "2026-04-01" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Generate report" }));

    expect(screen.getByRole("alert")).toHaveTextContent(
      "start date on or before the end date",
    );
    expect(mocks.getAttendanceReport).not.toHaveBeenCalled();
  });

  it("shows an explicit empty state when the selected range has no closed sessions", async () => {
    mocks.getAttendanceReport.mockResolvedValueOnce({
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
    render(<AcademicReportsDirectory />);

    fireEvent.change(screen.getByLabelText("From date"), {
      target: { value: "2026-04-01" },
    });
    fireEvent.change(screen.getByLabelText("To date"), {
      target: { value: "2026-04-01" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Generate report" }));

    expect(
      await screen.findByText("No closed attendance sessions were found for this date range."),
    ).toBeInTheDocument();
  });

  it("surfaces report API failures without showing mock reports", async () => {
    mocks.getAttendanceReport.mockRejectedValueOnce(
      new Error("Report access denied."),
    );
    render(<AcademicReportsDirectory />);

    fireEvent.change(screen.getByLabelText("From date"), {
      target: { value: "2026-04-01" },
    });
    fireEvent.change(screen.getByLabelText("To date"), {
      target: { value: "2026-04-30" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Generate report" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Report access denied.",
    );
    expect(screen.queryByText("Term 1 academic performance")).not.toBeInTheDocument();
  });
});
