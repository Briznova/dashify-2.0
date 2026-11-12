import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
import { ApiBody, ApiCookieAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { PermissionsGuard } from "../../common/guards/permissions.guard";
import { RequirePermissions } from "../../common/decorators/permissions.decorator";
import { AuthenticatedRequest } from "../../common/interfaces/authenticated-request";
import { AssignTeacherDto } from "./dto/assign-teacher.dto";
import { CreateStaffDto } from "./dto/create-staff.dto";
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
  @ApiOperation({ summary: "Create a staff profile" })
  @ApiBody({ type: CreateStaffDto })
  create(@Req() req: AuthenticatedRequest, @Body() dto: CreateStaffDto) {
    return this.staff.create(this.school(req), dto);
  }

  @Get("teacher-assignments")
  @RequirePermissions("staff.read")
  @ApiOperation({ summary: "List teacher assignments for the active school" })
  teacherAssignments(@Req() req: AuthenticatedRequest) {
    return this.staff.listAssignments(this.school(req));
  }

  @Post("teacher-assignments")
  @RequirePermissions("staff.manage")
  @ApiOperation({ summary: "Assign a teacher to a class or section" })
  @ApiBody({ type: AssignTeacherDto })
  assignTeacher(
    @Req() req: AuthenticatedRequest,
    @Body() dto: AssignTeacherDto,
  ) {
    return this.staff.assignTeacher(this.school(req), dto);
  }
}
