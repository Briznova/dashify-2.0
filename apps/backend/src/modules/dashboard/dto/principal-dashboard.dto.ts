import { ApiProperty } from "@nestjs/swagger";

export class PrincipalDashboardDto {
  @ApiProperty({ format: "uuid" })
  schoolId!: string;

  @ApiProperty()
  schoolName!: string;

  @ApiProperty({ format: "date" })
  localDate!: string;

  @ApiProperty({ minimum: 0 })
  presentCount!: number;

  @ApiProperty({ minimum: 0 })
  absentCount!: number;

  @ApiProperty({ minimum: 0 })
  lateCount!: number;

  @ApiProperty({ minimum: 0 })
  excusedCount!: number;

  @ApiProperty({ minimum: 0 })
  unmarkedCount!: number;
}
