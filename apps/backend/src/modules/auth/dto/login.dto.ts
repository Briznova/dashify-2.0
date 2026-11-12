import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, IsString } from "class-validator";

export class LoginDto {
  @ApiProperty({
    description: "Account email address.",
    example: "admin@dashify.test",
    format: "email",
  })
  @IsEmail()
  email!: string;

  @ApiProperty({
    description: "Account password.",
    example: "Example-Password-For-Docs",
  })
  @IsString()
  password!: string;
}
