import {
  BadRequestException,
  Controller,
  Get,
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
import { SchoolAdminDashboardDto } from "./dto/school-admin-dashboard.dto";
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
}
