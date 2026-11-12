import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import { ApiBody, ApiCookieAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { PermissionsGuard } from "../../common/guards/permissions.guard";
import { RequirePermissions } from "../../common/decorators/permissions.decorator";
import { AuthenticatedRequest } from "../../common/interfaces/authenticated-request";
import { AttendanceService } from "./attendance.service";
import { CreateAttendanceSessionDto } from "./dto/create-session.dto";
import { MarkRecordsDto } from "./dto/mark-records.dto";

@ApiTags("attendance")
@ApiCookieAuth("accessCookie")
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller("attendance")
export class AttendanceController {
  constructor(private readonly attendance: AttendanceService) {}
  private school(req: AuthenticatedRequest): string {
    if (!req.user.activeSchoolId)
      throw new Error("Select an active school first");
    return req.user.activeSchoolId;
  }

  @Get("sessions")
  @RequirePermissions("attendance.read")
  @ApiOperation({ summary: "List attendance sessions for a date" })
  list(@Req() req: AuthenticatedRequest, @Query("date") date: string) {
    return this.attendance.list(this.school(req), date);
  }

  @Get("sessions/:id/roster")
  @RequirePermissions("attendance.read")
  @ApiOperation({ summary: "Get the enrolled roster for an attendance session" })
  roster(
    @Req() req: AuthenticatedRequest,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    return this.attendance.roster(this.school(req), id);
  }

  @Post("sessions")
  @RequirePermissions("attendance.mark")
  @ApiOperation({
    summary: "Create an attendance session for a class and section",
  })
  @ApiBody({ type: CreateAttendanceSessionDto })
  create(
    @Req() req: AuthenticatedRequest,
    @Body() dto: CreateAttendanceSessionDto,
  ) {
    return this.attendance.createSession(this.school(req), req.user.id, dto);
  }

  @Put("sessions/:id/records")
  @RequirePermissions("attendance.mark")
  @ApiOperation({
    summary: "Record attendance for students in a session",
  })
  @ApiBody({ type: MarkRecordsDto })
  mark(
    @Req() req: AuthenticatedRequest,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: MarkRecordsDto,
  ) {
    return this.attendance.mark(this.school(req), req.user.id, id, dto);
  }

  @Post("sessions/:id/close")
  @RequirePermissions("attendance.correct")
  @ApiOperation({ summary: "Close an attendance session" })
  close(
    @Req() req: AuthenticatedRequest,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    return this.attendance.close(this.school(req), req.user.id, id);
  }
}
