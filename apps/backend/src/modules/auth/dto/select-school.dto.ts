import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString, IsUUID } from "class-validator";

export class SelectSchoolDto {
  @ApiProperty({
    description: "ID of an active school the authenticated user belongs to.",
    format: "uuid",
    example: "11111111-1111-4111-8111-111111111111",
  })
  @IsUUID()
  schoolId!: string;

  @ApiProperty({
    description: "Workspace role assigned to the active school membership.",
    example: "school_admin",
  })
  @IsString()
  @IsNotEmpty()
  workspaceRole!: string;
}
