import { ApiProperty } from "@nestjs/swagger";
import { AttendanceStatus } from "@prisma/client";
import { Transform, Type } from "class-transformer";
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Matches,
  ValidateNested,
} from "class-validator";

class AttendanceEntryDto {
  @ApiProperty({ format: "uuid" })
  @IsUUID()
  studentId!: string;

  @ApiProperty({ enum: AttendanceStatus })
  @IsEnum(AttendanceStatus)
  status!: AttendanceStatus;

  @ApiProperty({ maxLength: 500, required: false })
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  @IsOptional()
  @IsString()
  @MaxLength(500)
  remarks?: string;
}

export class RecordAttendanceDto {
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

  @ApiProperty({ type: [AttendanceEntryDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => AttendanceEntryDto)
  records!: AttendanceEntryDto[];
}

export class SubmitAttendanceDto {
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
