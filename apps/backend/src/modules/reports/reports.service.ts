import { BadRequestException, Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { parseCalendarDate } from "../../common/utils/calendar-date";
import { PrismaService } from "../../infrastructure/database/prisma.service";
import { AttendanceReportDto } from "./dto/attendance-report.dto";
import { AttendanceReportQueryDto } from "./dto/attendance-report-query.dto";

type DailyAttendanceAggregate = {
  date: string;
  totalSessions: number;
  totalRecords: number;
  present: number;
  absent: number;
  late: number;
  excused: number;
};

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
      const dailyAggregates = await tx.$queryRaw<DailyAttendanceAggregate[]>(
        Prisma.sql`
          SELECT
            s."date"::text AS "date",
            COUNT(DISTINCT s."id")::int AS "totalSessions",
            COUNT(r."id")::int AS "totalRecords",
            (COUNT(r."id") FILTER (WHERE r."status"::text = 'PRESENT'))::int AS "present",
            (COUNT(r."id") FILTER (WHERE r."status"::text = 'ABSENT'))::int AS "absent",
            (COUNT(r."id") FILTER (WHERE r."status"::text = 'LATE'))::int AS "late",
            (COUNT(r."id") FILTER (WHERE r."status"::text = 'EXCUSED'))::int AS "excused"
          FROM "attendance_sessions" s
          LEFT JOIN "attendance_records" r
            ON r."session_id" = s."id"
            AND r."school_id" = s."school_id"
          WHERE s."school_id" = ${schoolId}::uuid
            AND s."status"::text = 'CLOSED'
            AND s."date" >= ${query.fromDate}::date
            AND s."date" <= ${query.toDate}::date
          GROUP BY s."date"
          ORDER BY s."date" ASC
        `,
      );
      const dailyBreakdown = dailyAggregates.map((day) => ({
        date: day.date,
        totalSessions: day.totalSessions,
        totalRecords: day.totalRecords,
        statusCounts: {
          PRESENT: day.present,
          ABSENT: day.absent,
          LATE: day.late,
          EXCUSED: day.excused,
        },
      }));
      const statusCounts = dailyBreakdown.reduce(
        (total, day) => ({
          PRESENT: total.PRESENT + day.statusCounts.PRESENT,
          ABSENT: total.ABSENT + day.statusCounts.ABSENT,
          LATE: total.LATE + day.statusCounts.LATE,
          EXCUSED: total.EXCUSED + day.statusCounts.EXCUSED,
        }),
        { PRESENT: 0, ABSENT: 0, LATE: 0, EXCUSED: 0 },
      );

      return {
        fromDate: query.fromDate,
        toDate: query.toDate,
        totalSessions: dailyBreakdown.reduce(
          (total, day) => total + day.totalSessions,
          0,
        ),
        totalRecords: dailyBreakdown.reduce(
          (total, day) => total + day.totalRecords,
          0,
        ),
        statusCounts,
        dailyBreakdown,
      };
    });
  }
}
