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

  @ApiProperty()
  isClassTeacher!: boolean;

  @ApiProperty({ nullable: true })
  classTeacherName!: string | null;

  @ApiProperty({ minimum: 0 })
  studentCount!: number;

  @ApiProperty({ enum: ["DRAFT", "SUBMITTED", "OPEN", "CLOSED"], nullable: true })
  sessionStatus!: "DRAFT" | "SUBMITTED" | "OPEN" | "CLOSED" | null;

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

  @ApiProperty({ format: "uuid", nullable: true })
  academicYearId!: string | null;

  @ApiProperty({ nullable: true })
  academicYearName!: string | null;

  @ApiProperty({ nullable: true })
  academicYearStatus!: string | null;

  @ApiProperty({ type: [TeacherDashboardAssignmentDto] })
  assignments!: TeacherDashboardAssignmentDto[];
}
