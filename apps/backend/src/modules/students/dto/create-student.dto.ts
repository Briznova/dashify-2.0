import { Type } from "class-transformer";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEmail,
  IsEnum,
  IsOptional,
  IsPhoneNumber,
  IsString,
  IsUUID,
  MaxLength,
  ValidateNested,
} from "class-validator";
import { Gender, GuardianRelationship } from "@prisma/client";

export class GuardianInput {
  @ApiPropertyOptional({
    description: "Guardian record ID when updating an existing guardian relationship.",
    format: "uuid",
    example: "77777777-7777-4777-8777-777777777777",
  })
  @IsOptional()
  @IsUUID()
  id?: string;

  @ApiProperty({
    description: "First name of the guardian.",
    example: "Priya",
    maxLength: 80,
  })
  @IsString()
  @MaxLength(80)
  firstName!: string;

  @ApiPropertyOptional({
    description: "Last name of the guardian.",
    example: "Sharma",
    maxLength: 80,
  })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  lastName?: string;

  @ApiProperty({
    description: "Relationship of the guardian to the student.",
    enum: GuardianRelationship,
    enumName: "GuardianRelationship",
    example: GuardianRelationship.MOTHER,
  })
  @IsEnum(GuardianRelationship)
  relationship!: GuardianRelationship;

  @ApiProperty({
    description: "Guardian phone number in international format.",
    example: "+919876543210",
  })
  @IsPhoneNumber()
  phone!: string;

  @ApiPropertyOptional({
    description: "Guardian email address.",
    example: "priya.sharma@example.test",
    format: "email",
  })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({
    description:
      "Whether this is the primary guardian for the student. Defaults to false.",
    example: true,
    type: Boolean,
  })
  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;
}

export class CreateStudentDto {
  @ApiProperty({
    description:
      "School-assigned admission number; unique within the active school.",
    example: "ADM-2026-001",
    maxLength: 40,
  })
  @IsString()
  @MaxLength(40)
  admissionNumber!: string;

  @ApiProperty({
    description: "Student first name.",
    example: "Aarav",
    maxLength: 80,
  })
  @IsString()
  @MaxLength(80)
  firstName!: string;

  @ApiPropertyOptional({
    description: "Student middle name.",
    example: "Raj",
    maxLength: 80,
  })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  middleName?: string;

  @ApiPropertyOptional({
    description: "Student last name.",
    example: "Sharma",
    maxLength: 80,
  })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  lastName?: string;

  @ApiPropertyOptional({
    description: "Student date of birth.",
    example: "2016-08-15",
    format: "date",
  })
  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;

  @ApiPropertyOptional({
    description: "Student gender.",
    enum: Gender,
    enumName: "Gender",
    example: Gender.MALE,
  })
  @IsOptional()
  @IsEnum(Gender)
  gender?: Gender;

  @ApiProperty({
    description: "Date the student was admitted to the school.",
    example: "2026-04-01",
    format: "date",
  })
  @IsDateString()
  admissionDate!: string;

  @ApiProperty({
    description: "ID of the academic year for the student enrolment.",
    format: "uuid",
    example: "11111111-1111-4111-8111-111111111111",
  })
  @IsUUID()
  academicYearId!: string;

  @ApiProperty({
    description: "ID of the class assigned to the student.",
    format: "uuid",
    example: "22222222-2222-4222-8222-222222222222",
  })
  @IsUUID()
  classId!: string;

  @ApiProperty({
    description: "ID of an active section within the specified class.",
    format: "uuid",
    example: "33333333-3333-4333-8333-333333333333",
  })
  @IsUUID()
  sectionId!: string;

  @ApiProperty({
    description:
      "Student guardians. Provide an empty array when there are no guardians to add.",
    type: [GuardianInput],
    example: [],
    maxItems: 5,
  })
  @IsArray()
  @ArrayMaxSize(5)
  @ValidateNested({ each: true })
  @Type(() => GuardianInput)
  guardians!: GuardianInput[];
}
