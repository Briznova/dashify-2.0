import { ApiProperty } from "@nestjs/swagger";

export class SchoolAdminDashboardDto {
  @ApiProperty({ format: "uuid" })
  schoolId!: string;

  @ApiProperty()
  schoolName!: string;

  @ApiProperty({ minimum: 0 })
  activeStudentCount!: number;

  @ApiProperty({ minimum: 0 })
  activeStaffCount!: number;

  @ApiProperty({ minimum: 0 })
  activeClassCount!: number;

  @ApiProperty({ minimum: 0 })
  activeSectionCount!: number;
}
