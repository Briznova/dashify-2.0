import { ApiProperty } from "@nestjs/swagger";
import { IsDateString, IsString, MaxLength } from "class-validator";

export class CreateAcademicYearDto {
  @ApiProperty({
    description: "School-defined name for the academic year.",
    example: "2026-2027",
    maxLength: 80,
  })
  @IsString()
  @MaxLength(80)
  name!: string;

  @ApiProperty({
    description: "First date of the academic year.",
    example: "2026-04-01",
    format: "date",
  })
  @IsDateString()
  startDate!: string;

  @ApiProperty({
    description: "Last date of the academic year; must be after startDate.",
    example: "2027-03-31",
    format: "date",
  })
  @IsDateString()
  endDate!: string;
}
