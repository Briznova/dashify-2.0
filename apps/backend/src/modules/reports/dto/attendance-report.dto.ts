import { ApiProperty } from "@nestjs/swagger";

export class AttendanceReportStatusCountsDto {
  @ApiProperty({ minimum: 0 })
  PRESENT!: number;

  @ApiProperty({ minimum: 0 })
  ABSENT!: number;

  @ApiProperty({ minimum: 0 })
  LATE!: number;

  @ApiProperty({ minimum: 0 })
  EXCUSED!: number;
}

export class AttendanceReportDailyBreakdownDto {
  @ApiProperty({ format: "date" })
  date!: string;

  @ApiProperty({ minimum: 1 })
  totalSessions!: number;

  @ApiProperty({ minimum: 0 })
  totalRecords!: number;

  @ApiProperty({ type: AttendanceReportStatusCountsDto })
  statusCounts!: AttendanceReportStatusCountsDto;
}

export class AttendanceReportDto {
  @ApiProperty({ format: "date" })
  fromDate!: string;

  @ApiProperty({ format: "date" })
  toDate!: string;

  @ApiProperty({ minimum: 0 })
  totalSessions!: number;

  @ApiProperty({ minimum: 0 })
  totalRecords!: number;

  @ApiProperty({ type: AttendanceReportStatusCountsDto })
  statusCounts!: AttendanceReportStatusCountsDto;

  @ApiProperty({ type: [AttendanceReportDailyBreakdownDto] })
  dailyBreakdown!: AttendanceReportDailyBreakdownDto[];
}
