import { ApiProperty } from "@nestjs/swagger";
import { IsDateString, IsUUID, Matches } from "class-validator";

export class CreateAttendanceSessionDto {
  @ApiProperty({
    description: "ID of the class for which attendance is being recorded.",
    format: "uuid",
    example: "11111111-1111-4111-8111-111111111111",
  })
  @IsUUID()
  classId!: string;

  @ApiProperty({
    description: "ID of an active section belonging to the specified class.",
    format: "uuid",
    example: "22222222-2222-4222-8222-222222222222",
  })
  @IsUUID()
  sectionId!: string;

  @ApiProperty({
    description: "Calendar date in YYYY-MM-DD format for the attendance session.",
    example: "2026-04-01",
    format: "date",
  })
  @IsDateString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  date!: string;
}
