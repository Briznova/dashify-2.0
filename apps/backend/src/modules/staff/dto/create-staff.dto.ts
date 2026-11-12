import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsEmail,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from "class-validator";

export class CreateStaffDto {
  @ApiPropertyOptional({
    description:
      "Optional existing user record to associate with this staff profile.",
    format: "uuid",
    example: "11111111-1111-4111-8111-111111111111",
  })
  @IsOptional()
  @IsUUID()
  userId?: string;

  @ApiPropertyOptional({
    description:
      "Email address of an existing login account to link and grant the Teacher role in this school.",
    example: "teacher@example.test",
    maxLength: 160,
  })
  @IsOptional()
  @IsEmail()
  @MaxLength(160)
  accountEmail?: string;

  @ApiProperty({
    description: "Employee code used in the school roster.",
    example: "EMP-101",
    maxLength: 20,
  })
  @IsString()
  @MaxLength(20)
  employeeCode!: string;

  @ApiProperty({
    description: "Staff member's first name.",
    example: "Priya",
    maxLength: 80,
  })
  @IsString()
  @MaxLength(80)
  firstName!: string;

  @ApiPropertyOptional({
    description: "Staff member's last name.",
    example: "Nair",
    maxLength: 80,
  })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  lastName?: string;

  @ApiPropertyOptional({
    description:
      "Staff member email address if it is separate from the linked user account.",
    example: "priya.nair@dashify.test",
    maxLength: 160,
  })
  @IsOptional()
  @IsEmail()
  @MaxLength(160)
  email?: string;

  @ApiPropertyOptional({
    description: "Phone number for the staff member.",
    example: "+919876543210",
    maxLength: 30,
  })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;

  @ApiPropertyOptional({
    description: "Designation such as Teacher or Accountant.",
    example: "Teacher",
    maxLength: 80,
  })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  designation?: string;

  @ApiPropertyOptional({
    description: "Department or team.",
    example: "Mathematics",
    maxLength: 80,
  })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  department?: string;
}
