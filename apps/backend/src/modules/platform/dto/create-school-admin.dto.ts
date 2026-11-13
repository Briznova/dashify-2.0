import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { IsEmail, IsOptional, IsString, Length, MaxLength } from "class-validator";

const trim = ({ value }: { value: unknown }) => typeof value === "string" ? value.trim() : value;

export class CreateSchoolAdminDto {
  @ApiProperty({ minLength: 1, maxLength: 80 })
  @Transform(trim)
  @IsString()
  @Length(1, 80)
  firstName!: string;

  @ApiPropertyOptional({ minLength: 1, maxLength: 80 })
  @Transform(trim)
  @IsOptional()
  @IsString()
  @Length(1, 80)
  lastName?: string;

  @ApiProperty({ format: "email", maxLength: 254 })
  @Transform(({ value }: { value: unknown }) => typeof value === "string" ? value.trim().toLowerCase() : value)
  @IsEmail()
  @MaxLength(254)
  email!: string;
}
