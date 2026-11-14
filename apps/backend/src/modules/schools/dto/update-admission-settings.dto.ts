import { ApiProperty } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { IsString, Matches, MaxLength, MinLength } from "class-validator";

export class UpdateAdmissionSettingsDto {
  @ApiProperty({ minLength: 2, maxLength: 32, pattern: "^[A-Za-z0-9][A-Za-z0-9-]*$", description: "Trimmed and stored in uppercase." })
  @Transform(({ obj }) => typeof obj.prefix === "string" ? obj.prefix.trim().toUpperCase() : obj.prefix)
  @IsString()
  @MinLength(2)
  @MaxLength(32)
  @Matches(/^[A-Z0-9][A-Z0-9-]*$/)
  prefix!: string;
}
