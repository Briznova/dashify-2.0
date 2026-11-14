import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { IsEmail, IsString, IsUUID, Length, MaxLength, MinLength, ValidateIf } from "class-validator";

const trim = ({ value }: { value: unknown }) => typeof value === "string" ? value.trim() : value;

export class CreateTeacherAccountDto {
  @ApiProperty({ minLength: 1, maxLength: 20 })
  @Transform(trim) @IsString() @Length(1, 20)
  employeeCode!: string;

  @ApiProperty({ minLength: 1, maxLength: 80 })
  @Transform(trim) @IsString() @Length(1, 80)
  firstName!: string;

  @ApiPropertyOptional({ minLength: 1, maxLength: 80 })
  @Transform(trim) @ValidateIf((_object, value: unknown) => value !== undefined) @IsString() @Length(1, 80)
  lastName?: string;

  @ApiProperty({ format: "email", maxLength: 160 })
  @Transform(({ value }: { value: unknown }) => typeof value === "string" ? value.trim().toLowerCase() : value)
  @IsEmail() @MaxLength(160)
  email!: string;

  @ApiProperty({ format: "password", minLength: 12, maxLength: 1024 })
  @IsString() @MinLength(12) @MaxLength(1024)
  password!: string;

  @ApiPropertyOptional({ maxLength: 30 })
  @Transform(trim) @ValidateIf((_object, value: unknown) => value !== undefined) @IsString() @MaxLength(30)
  phone?: string;

  @ApiPropertyOptional({ format: "uuid" })
  @ValidateIf((_object, value: unknown) => value !== undefined) @IsUUID()
  departmentId?: string;
}
