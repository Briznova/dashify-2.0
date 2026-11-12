import { ApiProperty } from "@nestjs/swagger";

export class TeacherDashboardAssignmentDto {
  @ApiProperty({ format: "uuid" })
  classId!: string;

  @ApiProperty()
  className!: string;

  @ApiProperty({ format: "uuid" })
  sectionId!: string;

  @ApiProperty()
  sectionName!: string;

  @ApiProperty({ nullable: true })
  subject!: string | null;

  @ApiProperty({ enum: ["OPEN", "CLOSED"], nullable: true })
  sessionStatus!: "OPEN" | "CLOSED" | null;

  @ApiProperty({ minimum: 0, nullable: true })
  unmarkedCount!: number | null;
}

export class TeacherDashboardDto {
  @ApiProperty({ format: "uuid" })
  schoolId!: string;

  @ApiProperty()
  schoolName!: string;

  @ApiProperty({ format: "date" })
  localDate!: string;

  @ApiProperty({ type: [TeacherDashboardAssignmentDto] })
  assignments!: TeacherDashboardAssignmentDto[];
}
