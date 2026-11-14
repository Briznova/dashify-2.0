import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsBoolean,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from "class-validator";

export class AssignTeacherDto {
  @ApiProperty({
    description: "Staff profile ID for the teacher being assigned.",
    format: "uuid",
    example: "11111111-1111-4111-8111-111111111111",
  })
  @IsUUID()
  staffId!: string;

  @ApiProperty({
    description: "Class to which this teacher is assigned.",
    format: "uuid",
    example: "22222222-2222-4222-8222-222222222222",
  })
  @IsUUID()
  classId!: string;

  @ApiPropertyOptional({
    description: "Optional section within the class. Leave null for a class-level assignment.",
    format: "uuid",
    example: "33333333-3333-4333-8333-333333333333",
  })
  @IsOptional()
  @IsUUID()
  sectionId?: string;

  @ApiPropertyOptional({
    description: "Optional subject or teaching focus.",
    example: "Mathematics",
    maxLength: 80,
  })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  subject?: string;

  @ApiPropertyOptional({
    description: "Whether this teacher is the designated class teacher for the section.",
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  isClassTeacher?: boolean;
}
