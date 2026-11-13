import type { AttendanceReport } from "@/types/school";
import { downloadCsv } from "@/lib/download-csv";

export function createAttendanceReportCsv(report: AttendanceReport): string {
  const rows: (string | number)[][] = [
    [
      "row_type",
      "from_date",
      "to_date",
      "date",
      "total_sessions",
      "total_records",
      "present",
      "absent",
      "late",
      "excused",
    ],
    [
      "SUMMARY",
      report.fromDate,
      report.toDate,
      "",
      report.totalSessions,
      report.totalRecords,
      report.statusCounts.PRESENT,
      report.statusCounts.ABSENT,
      report.statusCounts.LATE,
      report.statusCounts.EXCUSED,
    ],
  ];
  for (const day of report.dailyBreakdown) {
    rows.push([
      "DAILY",
      "",
      "",
      day.date,
      day.totalSessions,
      day.totalRecords,
      day.statusCounts.PRESENT,
      day.statusCounts.ABSENT,
      day.statusCounts.LATE,
      day.statusCounts.EXCUSED,
    ]);
  }

  return `${rows
    .map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(","))
    .join("\r\n")}\r\n`;
}

export function downloadAttendanceReportCsv(report: AttendanceReport): void {
  downloadCsv(
    createAttendanceReportCsv(report),
    `attendance-report-${report.fromDate}-to-${report.toDate}.csv`,
  );
}
