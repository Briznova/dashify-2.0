import { Type } from "class-transformer";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  ArrayMaxSize,
  ArrayNotEmpty,
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateNested,
} from "class-validator";
import { AttendanceStatus } from "@prisma/client";

export class AttendanceRecordInput {
  @ApiProperty({
    description:
      "ID of a student enrolled in this session section on the session date.",
    format: "uuid",
    example: "33333333-3333-4333-8333-333333333333",
  })
  @IsUUID()
  studentId!: string;

  @ApiProperty({
    description: "Attendance status for the student.",
    enum: AttendanceStatus,
    enumName: "AttendanceStatus",
    example: AttendanceStatus.PRESENT,
  })
  @IsEnum(AttendanceStatus)
  status!: AttendanceStatus;

  @ApiPropertyOptional({
    description: "Optional note for this attendance record.",
    example: "Arrived after the morning bell.",
    maxLength: 250,
  })
  @IsOptional()
  @IsString()
  @MaxLength(250)
  remarks?: string;
}

export class MarkRecordsDto {
  @ApiProperty({
    description:
      "Attendance records to create. Must contain between 1 and 500 records.",
    type: [AttendanceRecordInput],
    example: [
      {
        studentId: "33333333-3333-4333-8333-333333333333",
        status: AttendanceStatus.PRESENT,
        remarks: "Arrived after the morning bell.",
      },
    ],
  })
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(500)
  @ValidateNested({ each: true })
  @Type(() => AttendanceRecordInput)
  records!: AttendanceRecordInput[];
}
