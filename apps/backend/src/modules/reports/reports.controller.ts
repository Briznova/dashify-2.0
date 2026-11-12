import {
  BadRequestException,
  Controller,
  Get,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBadRequestResponse,
  ApiCookieAuth,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
  ApiUnauthorizedResponse,
} from "@nestjs/swagger";
import { RequirePermissions } from "../../common/decorators/permissions.decorator";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { PermissionsGuard } from "../../common/guards/permissions.guard";
import { AuthenticatedRequest } from "../../common/interfaces/authenticated-request";
import { AttendanceReportDto } from "./dto/attendance-report.dto";
import { AttendanceReportQueryDto } from "./dto/attendance-report-query.dto";
import { ReportsService } from "./reports.service";

@ApiTags("reports")
@ApiCookieAuth("accessCookie")
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller("reports")
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  @Get("attendance")
  @RequirePermissions("reports.read")
  @ApiOperation({
    summary: "Get closed-session attendance counts for the active school",
  })
  @ApiQuery({ type: AttendanceReportQueryDto })
  @ApiOkResponse({ type: AttendanceReportDto })
  @ApiBadRequestResponse({ description: "Invalid or reversed date range" })
  @ApiUnauthorizedResponse({ description: "Authentication is required" })
  @ApiForbiddenResponse({ description: "The session lacks reports.read" })
  getAttendanceReport(
    @Req() req: AuthenticatedRequest,
    @Query() query: AttendanceReportQueryDto,
  ) {
    const schoolId = req.user.activeSchoolId;
    if (!schoolId)
      throw new BadRequestException("Select an active school first");
    return this.reports.getAttendanceReport(schoolId, query);
  }
}
