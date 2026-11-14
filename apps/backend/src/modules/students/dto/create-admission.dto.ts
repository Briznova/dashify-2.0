import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Gender, GuardianRelationship } from "@prisma/client";
import { Transform, Type, type TransformFnParams } from "class-transformer";
import {
  ArrayMaxSize, ArrayMinSize, IsArray, IsBoolean, IsDateString, IsDefined, IsEmail,
  IsEnum, IsIn, IsNotEmpty, IsOptional, IsPhoneNumber, IsString, IsUUID,
  IsObject, Matches, MaxLength, ValidateIf, ValidateNested,
} from "class-validator";

const trimmed = ({ obj, key }: TransformFnParams) => {
  const value: unknown = obj[key];
  return typeof value === "string" ? value.trim() : value;
};

export class AdmissionGuardianDto {
  @ApiProperty({ maxLength: 80 })
  @Transform(trimmed)
  @IsString() @IsNotEmpty() @MaxLength(80)
  firstName!: string;

  @ApiPropertyOptional({ maxLength: 80 })
  @Transform(trimmed)
  @IsOptional() @IsString() @MaxLength(80)
  lastName?: string;

  @ApiProperty({ enum: GuardianRelationship })
  @IsEnum(GuardianRelationship)
  relationship!: GuardianRelationship;

  @ApiProperty()
  @Transform(trimmed)
  @IsPhoneNumber()
  phone!: string;

  @ApiPropertyOptional()
  @Transform(trimmed)
  @IsOptional() @IsEmail()
  email?: string;

  @ApiProperty()
  @Transform(({ obj }) => obj.isPrimary)
  @IsBoolean()
  isPrimary!: boolean;
}

export class EmergencyContactDto {
  @ApiProperty({ enum: ["PRIMARY_GUARDIAN", "OTHER"] })
  @IsIn(["PRIMARY_GUARDIAN", "OTHER"])
  kind!: "PRIMARY_GUARDIAN" | "OTHER";

  @ApiPropertyOptional()
  @ValidateIf((object: EmergencyContactDto) => object.kind === "OTHER")
  @Transform(trimmed)
  @IsString() @IsNotEmpty() @MaxLength(160)
  name?: string;

  @ApiPropertyOptional()
  @ValidateIf((object: EmergencyContactDto) => object.kind === "OTHER")
  @Transform(trimmed)
  @IsPhoneNumber()
  phone?: string;
}

export class StudentAddressDto {
  @ApiPropertyOptional({ maxLength: 160 })
  @Transform(trimmed)
  @IsOptional() @IsString() @MaxLength(160)
  line1?: string;

  @ApiPropertyOptional({ maxLength: 80 })
  @Transform(trimmed)
  @IsOptional() @IsString() @MaxLength(80)
  city?: string;

  @ApiPropertyOptional({ maxLength: 80 })
  @Transform(trimmed)
  @IsOptional() @IsString() @MaxLength(80)
  state?: string;

  @ApiPropertyOptional({ maxLength: 20 })
  @Transform(trimmed)
  @IsOptional() @IsString() @MaxLength(20)
  postalCode?: string;
}

export class CreateAdmissionDto {
  @ApiProperty({ maxLength: 80 })
  @Transform(trimmed)
  @IsString() @IsNotEmpty() @MaxLength(80)
  firstName!: string;

  @ApiPropertyOptional({ maxLength: 80 })
  @Transform(trimmed)
  @IsOptional() @IsString() @MaxLength(80)
  middleName?: string;

  @ApiProperty({ maxLength: 80 })
  @Transform(trimmed)
  @IsString() @IsNotEmpty() @MaxLength(80)
  lastName!: string;

  @ApiProperty({ format: "date" })
  @Matches(/^(?!0000)\d{4}-\d{2}-\d{2}$/) @IsDateString({ strict: true })
  dateOfBirth!: string;

  @ApiPropertyOptional({ enum: Gender })
  @IsOptional() @IsEnum(Gender)
  gender?: Gender;

  @ApiProperty({ format: "date" })
  @Matches(/^(?!0000)\d{4}-\d{2}-\d{2}$/) @IsDateString({ strict: true })
  admissionDate!: string;

  @ApiProperty({ format: "uuid" }) @IsUUID()
  academicYearId!: string;
  @ApiProperty({ format: "uuid" }) @IsUUID()
  classId!: string;
  @ApiProperty({ format: "uuid" }) @IsUUID()
  sectionId!: string;

  @ApiProperty({ type: [AdmissionGuardianDto], minItems: 1, maxItems: 5 })
  @IsArray() @ArrayMinSize(1) @ArrayMaxSize(5) @ValidateNested({ each: true })
  @Type(() => AdmissionGuardianDto)
  guardians!: AdmissionGuardianDto[];

  @ApiProperty({ type: EmergencyContactDto })
  @IsDefined() @IsObject() @ValidateNested() @Type(() => EmergencyContactDto)
  emergencyContact!: EmergencyContactDto;

  @ApiPropertyOptional({ type: StudentAddressDto })
  @IsOptional() @IsObject() @ValidateNested() @Type(() => StudentAddressDto)
  address?: StudentAddressDto;

  @ApiPropertyOptional({ maxLength: 40 })
  @Transform(trimmed)
  @IsOptional() @IsString() @IsNotEmpty() @MaxLength(40)
  rollNumber?: string;
}
