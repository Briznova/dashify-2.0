import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from "class-validator";

export class CreateSectionDto {
  @ApiProperty({
    description: "ID of the active class this section belongs to.",
    format: "uuid",
    example: "11111111-1111-4111-8111-111111111111",
  })
  @IsUUID()
  classId!: string;

  @ApiProperty({
    description: "Display name of the section.",
    example: "A",
    maxLength: 40,
  })
  @IsString()
  @MaxLength(40)
  name!: string;

  @ApiProperty({
    description: "Code identifying the section within its class.",
    example: "A",
    maxLength: 20,
  })
  @IsString()
  @MaxLength(20)
  code!: string;

  @ApiPropertyOptional({
    description: "Maximum number of students in the section.",
    example: 40,
    minimum: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  capacity?: number;
}
