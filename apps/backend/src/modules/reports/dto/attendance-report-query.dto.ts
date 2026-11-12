import { ApiProperty } from "@nestjs/swagger";
import { IsDateString, Matches } from "class-validator";

export class AttendanceReportQueryDto {
  @ApiProperty({
    description: "Inclusive start calendar date in YYYY-MM-DD format.",
    example: "2026-04-01",
    format: "date",
  })
  @IsDateString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  fromDate!: string;

  @ApiProperty({
    description: "Inclusive end calendar date in YYYY-MM-DD format.",
    example: "2026-04-30",
    format: "date",
  })
  @IsDateString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  toDate!: string;
}
