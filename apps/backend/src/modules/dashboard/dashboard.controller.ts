import {
  BadRequestException,
  Controller,
  ForbiddenException,
  Get,
  ParseUUIDPipe,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBadRequestResponse,
  ApiCookieAuth,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from "@nestjs/swagger";
import { RequirePermissions } from "../../common/decorators/permissions.decorator";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { PermissionsGuard } from "../../common/guards/permissions.guard";
import { AuthenticatedRequest } from "../../common/interfaces/authenticated-request";
import { PrincipalDashboardDto } from "./dto/principal-dashboard.dto";
import { SchoolAdminDashboardDto } from "./dto/school-admin-dashboard.dto";
import { TeacherDashboardDto } from "./dto/teacher-dashboard.dto";
import { DashboardService } from "./dashboard.service";

@ApiTags("dashboard")
@ApiCookieAuth("accessCookie")
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller("dashboard")
export class DashboardController {
  constructor(private readonly dashboard: DashboardService) {}

  @Get()
  @RequirePermissions("dashboard.read")
  @ApiOperation({
    summary: "Get the active school's school-administrator KPI counts",
  })
  @ApiOkResponse({ type: SchoolAdminDashboardDto })
  @ApiBadRequestResponse({
    description: "The session has no active school context",
  })
  @ApiUnauthorizedResponse({ description: "Authentication is required" })
  @ApiForbiddenResponse({ description: "The session lacks dashboard.read" })
  @ApiNotFoundResponse({
    description: "The active school is missing or inactive",
  })
  getSchoolAdminDashboard(@Req() req: AuthenticatedRequest) {
    const schoolId = req.user.activeSchoolId;
    if (!schoolId)
      throw new BadRequestException("Select an active school first");
    return this.dashboard.getSchoolAdminDashboard(schoolId);
  }

  @Get("principal")
  @RequirePermissions("dashboard.principal.read")
  @ApiOperation({
    summary: "Get the active school's principal attendance snapshot",
  })
  @ApiOkResponse({ type: PrincipalDashboardDto })
  @ApiBadRequestResponse({
    description: "The session has no active school context",
  })
  @ApiUnauthorizedResponse({ description: "Authentication is required" })
  @ApiForbiddenResponse({
    description: "The session lacks dashboard.principal.read",
  })
  @ApiNotFoundResponse({
    description: "The active school is missing or inactive",
  })
  getPrincipalDashboard(@Req() req: AuthenticatedRequest) {
    const schoolId = req.user.activeSchoolId;
    if (!schoolId)
      throw new BadRequestException("Select an active school first");
    return this.dashboard.getPrincipalDashboard(schoolId);
  }

  @Get("teacher")
  @RequirePermissions("dashboard.teacher.read")
  @ApiOperation({
    summary: "Get the authenticated teacher's assigned-class attendance snapshot",
  })
  @ApiOkResponse({ type: TeacherDashboardDto })
  @ApiBadRequestResponse({
    description: "The session has no active school context",
  })
  @ApiUnauthorizedResponse({ description: "Authentication is required" })
  @ApiForbiddenResponse({
    description: "The session lacks the Teacher role or dashboard.teacher.read",
  })
  @ApiNotFoundResponse({
    description: "The active school is missing or inactive",
  })
  getTeacherDashboard(
    @Req() req: AuthenticatedRequest,
    @Query("academicYearId", new ParseUUIDPipe({ optional: true }))
    academicYearId?: string,
  ) {
    if (req.user.activeWorkspaceRole?.toLowerCase() !== "teacher") {
      throw new ForbiddenException();
    }
    const schoolId = req.user.activeSchoolId;
    if (!schoolId)
      throw new BadRequestException("Select an active school first");
    return this.dashboard.getTeacherDashboard(
      schoolId,
      req.user.id,
      academicYearId,
    );
  }
}
