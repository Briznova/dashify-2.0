import { downloadCsv } from "@/lib/download-csv";
import type { PlatformSchool } from "@/types/school";

function csvCell(value: string): string {
  const safeValue = /^[ \t\r\n]*[\t\r\n]|^\s*[=+\-@]/.test(value) ? `'${value}` : value;
  return `"${safeValue.replace(/"/g, '""')}"`;
}

export function createPlatformSchoolsCsv(schools: readonly PlatformSchool[]): string {
  const rows = [
    ["id", "name", "code", "status", "created_at"],
    ...schools.map((school) => [
      school.id,
      school.name,
      school.code,
      school.isActive ? "Active" : "Inactive",
      school.createdAt,
    ]),
  ];
  return `${rows.map((row) => row.map(csvCell).join(",")).join("\r\n")}\r\n`;
}

export function downloadPlatformSchoolsCsv(schools: readonly PlatformSchool[]): void {
  downloadCsv(createPlatformSchoolsCsv(schools), "platform-schools.csv");
}
