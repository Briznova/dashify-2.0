import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsEmail, IsOptional, IsString, MaxLength } from "class-validator";

export class UpdateSchoolDto {
  @ApiPropertyOptional({
    description: "School display name.",
    example: "DASHIFY Demo School",
    maxLength: 160,
  })
  @IsOptional()
  @IsString()
  @MaxLength(160)
  name?: string;

  @ApiPropertyOptional({
    description: "School contact email address.",
    example: "office@school.example.test",
    format: "email",
  })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({
    description: "School contact phone number.",
    example: "+919876543210",
    maxLength: 30,
  })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;

  @ApiPropertyOptional({
    description: "IANA time zone used by the school.",
    example: "Asia/Kolkata",
  })
  @IsOptional()
  @IsString()
  timezone?: string;

  @ApiPropertyOptional({
    description: "School locale identifier.",
    example: "en-IN",
  })
  @IsOptional()
  @IsString()
  locale?: string;
}
