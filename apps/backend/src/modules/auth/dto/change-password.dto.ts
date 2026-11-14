import { ApiProperty } from "@nestjs/swagger";
import { IsString, MaxLength, MinLength } from "class-validator";

export class ChangePasswordDto {
  @ApiProperty({ minLength: 1, format: "password" })
  @IsString()
  @MinLength(1)
  currentPassword!: string;

  @ApiProperty({ minLength: 12, maxLength: 1024, format: "password" })
  @IsString()
  @MinLength(12)
  @MaxLength(1024)
  newPassword!: string;
}
