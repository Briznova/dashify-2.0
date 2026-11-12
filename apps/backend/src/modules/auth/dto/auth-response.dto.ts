import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class AuthUserResponseDto {
  @ApiProperty({ format: "uuid" })
  id!: string;

  @ApiProperty({ format: "email" })
  email!: string;

  @ApiProperty()
  firstName!: string;

  @ApiProperty({ nullable: true })
  lastName!: string | null;
}

export class SchoolSummaryResponseDto {
  @ApiProperty({ format: "uuid" })
  id!: string;

  @ApiProperty()
  name!: string;
}

export class AuthMembershipResponseDto {
  @ApiProperty({ format: "uuid" })
  membershipId!: string;

  @ApiProperty({ type: SchoolSummaryResponseDto })
  school!: SchoolSummaryResponseDto;

  @ApiProperty({ type: [String] })
  workspaceRoles!: string[];
}

export class ActiveSchoolResponseDto {
  @ApiProperty({ format: "uuid" })
  id!: string;

  @ApiProperty()
  name!: string;
}

export class AuthLoginResponseDto {
  @ApiProperty({ type: AuthUserResponseDto })
  user!: AuthUserResponseDto;

  @ApiProperty({ enum: ["platform", "school-selection", "school"] })
  scope!: "platform" | "school-selection" | "school";

  @ApiProperty({ type: [AuthMembershipResponseDto] })
  memberships!: AuthMembershipResponseDto[];

  @ApiProperty({ type: ActiveSchoolResponseDto, nullable: true })
  activeSchool!: ActiveSchoolResponseDto | null;

  @ApiPropertyOptional({ type: [String] })
  workspaceRoles?: string[];

  @ApiPropertyOptional({ nullable: true })
  activeWorkspaceRole?: string | null;

  @ApiPropertyOptional({ type: [String] })
  permissionKeys?: string[];
}

export class AuthSessionResponseDto {
  @ApiProperty({ type: AuthUserResponseDto })
  user!: AuthUserResponseDto;

  @ApiProperty({ enum: ["platform", "school-selection", "school"] })
  scope!: "platform" | "school-selection" | "school";

  @ApiProperty({ type: [AuthMembershipResponseDto] })
  memberships!: AuthMembershipResponseDto[];

  @ApiProperty({ type: ActiveSchoolResponseDto, nullable: true })
  activeSchool!: ActiveSchoolResponseDto | null;

  @ApiProperty({ type: [String] })
  workspaceRoles!: string[];

  @ApiProperty({ nullable: true })
  activeWorkspaceRole!: string | null;

  @ApiProperty({ type: [String] })
  permissionKeys!: string[];
}
