import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBody,
  ApiCookieAuth,
  ApiHeader,
  ApiOperation,
  ApiTags,
} from "@nestjs/swagger";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { PermissionsGuard } from "../../common/guards/permissions.guard";
import { RequirePermissions } from "../../common/decorators/permissions.decorator";
import { AuthenticatedRequest } from "../../common/interfaces/authenticated-request";
import { AssignTeacherDto } from "./dto/assign-teacher.dto";
import { CreateStaffDto } from "./dto/create-staff.dto";
import { UpdateStaffDto } from "./dto/update-staff.dto";
import { StaffService } from "./staff.service";

@ApiTags("staff")
@ApiCookieAuth("accessCookie")
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller()
export class StaffController {
  constructor(private readonly staff: StaffService) {}

  private school(req: AuthenticatedRequest): string {
    if (!req.user.activeSchoolId) {
      throw new Error("Select an active school first");
    }
    return req.user.activeSchoolId;
  }

  @Get("staff")
  @RequirePermissions("staff.read")
  @ApiOperation({ summary: "List active school staff" })
  list(@Req() req: AuthenticatedRequest) {
    return this.staff.list(this.school(req));
  }

  @Get("staff/:id")
  @RequirePermissions("staff.read")
  @ApiOperation({ summary: "Get a staff profile" })
  get(
    @Req() req: AuthenticatedRequest,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    return this.staff.get(this.school(req), id);
  }

  @Post("staff")
  @RequirePermissions("staff.manage")
  @ApiHeader({ name: "Origin", required: true })
  @ApiHeader({ name: "X-CSRF-Token", required: true })
  @ApiOperation({ summary: "Create a staff profile" })
  @ApiBody({ type: CreateStaffDto })
  create(@Req() req: AuthenticatedRequest, @Body() dto: CreateStaffDto) {
    return this.staff.create(this.school(req), req.user.id, dto);
  }

  @Patch("staff/:id")
  @RequirePermissions("staff.manage")
  @ApiHeader({ name: "Origin", required: true })
  @ApiHeader({ name: "X-CSRF-Token", required: true })
  @ApiOperation({ summary: "Update a staff profile" })
  @ApiBody({ type: UpdateStaffDto })
  update(
    @Req() req: AuthenticatedRequest,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateStaffDto,
  ) {
    return this.staff.update(this.school(req), req.user.id, id, dto);
  }

  @Post("staff/:id/deactivate")
  @HttpCode(HttpStatus.OK)
  @RequirePermissions("staff.manage")
  @ApiHeader({ name: "Origin", required: true })
  @ApiHeader({ name: "X-CSRF-Token", required: true })
  @ApiOperation({
    summary: "Deactivate a staff profile and revoke Teacher access",
  })
  deactivate(
    @Req() req: AuthenticatedRequest,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    return this.staff.deactivate(this.school(req), req.user.id, id);
  }

  @Get("teacher-assignments")
  @RequirePermissions("staff.read")
  @ApiOperation({ summary: "List teacher assignments for the active school" })
  teacherAssignments(@Req() req: AuthenticatedRequest) {
    return this.staff.listAssignments(this.school(req));
  }

  @Post("teacher-assignments")
  @RequirePermissions("staff.manage")
  @ApiHeader({ name: "Origin", required: true })
  @ApiHeader({ name: "X-CSRF-Token", required: true })
  @ApiOperation({ summary: "Assign a teacher to a class or section" })
  @ApiBody({ type: AssignTeacherDto })
  assignTeacher(
    @Req() req: AuthenticatedRequest,
    @Body() dto: AssignTeacherDto,
  ) {
    return this.staff.assignTeacher(this.school(req), dto);
  }
}
