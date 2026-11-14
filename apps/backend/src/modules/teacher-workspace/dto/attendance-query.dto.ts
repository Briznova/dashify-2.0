import { ApiProperty } from "@nestjs/swagger";
import { IsDateString, IsUUID, Matches } from "class-validator";

export class AttendanceQueryDto {
  @ApiProperty({ format: "uuid" })
  @IsUUID()
  academicYearId!: string;

  @ApiProperty({ format: "uuid" })
  @IsUUID()
  sectionId!: string;

  @ApiProperty({ format: "date", example: "2026-04-01" })
  @IsDateString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  date!: string;
}
