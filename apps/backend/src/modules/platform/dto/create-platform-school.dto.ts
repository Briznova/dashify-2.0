import { ApiProperty } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { IsString, Length, Matches } from "class-validator";

const trim = ({ value }: { value: unknown }) =>
  typeof value === "string" ? value.trim() : value;

export class CreatePlatformSchoolDto {
  @ApiProperty({ description: "School display name.", example: "Example School", minLength: 2, maxLength: 120 })
  @Transform(trim)
  @IsString()
  @Length(2, 120)
  name!: string;

  @ApiProperty({
    description: "Explicit unique school code; stored upper-case.",
    example: "EXAMPLE-01",
    minLength: 2,
    maxLength: 32,
  })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === "string" ? value.trim().toUpperCase() : value,
  )
  @IsString()
  @Matches(/^[A-Z0-9][A-Z0-9-]{1,31}$/, {
    message:
      "code must be 2-32 characters of letters, digits or hyphens and start with a letter or digit",
  })
  code!: string;
}
