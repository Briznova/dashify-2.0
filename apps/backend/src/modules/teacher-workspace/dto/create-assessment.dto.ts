import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { TeacherAssessmentType } from "@prisma/client";
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from "class-validator";

export class CreateAssessmentDto {
  @ApiProperty({ format: "uuid" })
  @IsUUID()
  academicYearId!: string;

  @ApiProperty({ format: "uuid" })
  @IsUUID()
  sectionId!: string;

  @ApiProperty({ enum: TeacherAssessmentType })
  @IsEnum(TeacherAssessmentType)
  type!: TeacherAssessmentType;

  @ApiProperty({ maxLength: 150 })
  @IsString()
  @Matches(/\S/)
  @MaxLength(150)
  title!: string;

  @ApiPropertyOptional({ maxLength: 5000 })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;

  @ApiProperty({ format: "date", example: "2026-04-01" })
  @IsDateString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  dueDate!: string;

  @ApiProperty({ minimum: 1, type: Number })
  @IsInt()
  @Min(1)
  maxScore!: number;

  @ApiProperty({ minimum: 0, type: Number })
  @IsInt()
  @Min(0)
  passMark!: number;

  @ApiPropertyOptional({
    pattern: "^([01][0-9]|2[0-3]):[0-5][0-9]$",
    description: "Required for TEST assessments; school-local time.",
  })
  @ValidateIf((dto: CreateAssessmentDto) => dto.type === "TEST")
  @IsString()
  @Matches(/^([01][0-9]|2[0-3]):[0-5][0-9]$/)
  startTime?: string;

  @ApiPropertyOptional({
    minimum: 1,
    maximum: 1440,
    description: "Required for TEST assessments.",
  })
  @ValidateIf((dto: CreateAssessmentDto) => dto.type === "TEST")
  @IsInt()
  @Min(1)
  @Max(1440)
  durationMinutes?: number;
}
