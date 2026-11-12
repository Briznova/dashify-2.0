import { BadRequestException, Injectable } from "@nestjs/common";
import type { AttendanceStatus } from "@prisma/client";
import { parseCalendarDate } from "../../common/utils/calendar-date";
import { PrismaService } from "../../infrastructure/database/prisma.service";
import { AttendanceReportDto } from "./dto/attendance-report.dto";
import { AttendanceReportQueryDto } from "./dto/attendance-report-query.dto";

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async getAttendanceReport(
    schoolId: string,
    query: AttendanceReportQueryDto,
  ): Promise<AttendanceReportDto> {
    const fromDate = parseCalendarDate(query.fromDate);
    const toDate = parseCalendarDate(query.toDate);
    if (fromDate > toDate) {
      throw new BadRequestException("fromDate must be on or before toDate");
    }

    return this.prisma.withTenant(schoolId, async (tx) => {
      const sessionScope = {
        schoolId,
        status: "CLOSED" as const,
        date: { gte: fromDate, lte: toDate },
      };
      const [totalSessions, groupedRecords] = await Promise.all([
        tx.attendanceSession.count({ where: sessionScope }),
        tx.attendanceRecord.groupBy({
          by: ["status"],
          where: {
            schoolId,
            session: { is: sessionScope },
          },
          _count: { _all: true },
        }),
      ]);

      const statusCounts: Record<AttendanceStatus, number> = {
        PRESENT: 0,
        ABSENT: 0,
        LATE: 0,
        EXCUSED: 0,
      };
      for (const group of groupedRecords) {
        statusCounts[group.status] = group._count._all;
      }

      return {
        fromDate: query.fromDate,
        toDate: query.toDate,
        totalSessions,
        totalRecords: Object.values(statusCounts).reduce(
          (total, count) => total + count,
          0,
        ),
        statusCounts,
      };
    });
  }
}
