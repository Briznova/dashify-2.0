import { Body, Controller, Get, Post, Req, UseGuards } from "@nestjs/common";
import { ApiBody, ApiCookieAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { PermissionsGuard } from "../../common/guards/permissions.guard";
import { RequirePermissions } from "../../common/decorators/permissions.decorator";
import { AuthenticatedRequest } from "../../common/interfaces/authenticated-request";
import { AcademicService } from "./academic.service";
import { CreateAcademicYearDto } from "./dto/create-academic-year.dto";
import { CreateClassDto } from "./dto/create-class.dto";
import { CreateSectionDto } from "./dto/create-section.dto";

@ApiTags("academic-structure")
@ApiCookieAuth("accessCookie")
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller()
export class AcademicController {
  constructor(private readonly academic: AcademicService) {}
  private school(req: AuthenticatedRequest): string {
    if (!req.user.activeSchoolId)
      throw new Error("Select an active school first");
    return req.user.activeSchoolId;
  }

  @Get("academic-years")
  @RequirePermissions("academic_structure.read")
  @ApiOperation({ summary: "List academic years for the active school" })
  years(@Req() req: AuthenticatedRequest) {
    return this.academic.listYears(this.school(req));
  }

  @Post("academic-years")
  @RequirePermissions("academic_structure.manage")
  @ApiOperation({ summary: "Create an academic year for the active school" })
  @ApiBody({ type: CreateAcademicYearDto })
  createYear(
    @Req() req: AuthenticatedRequest,
    @Body() dto: CreateAcademicYearDto,
  ) {
    return this.academic.createYear(this.school(req), dto);
  }

  @Get("classes")
  @RequirePermissions("academic_structure.read")
  @ApiOperation({ summary: "List classes and sections for the active school" })
  classes(@Req() req: AuthenticatedRequest) {
    return this.academic.listClasses(this.school(req));
  }

  @Post("classes")
  @RequirePermissions("academic_structure.manage")
  @ApiOperation({ summary: "Create a class for the active school" })
  @ApiBody({ type: CreateClassDto })
  createClass(@Req() req: AuthenticatedRequest, @Body() dto: CreateClassDto) {
    return this.academic.createClass(this.school(req), req.user.id, dto);
  }

  @Post("sections")
  @RequirePermissions("academic_structure.manage")
  @ApiOperation({ summary: "Create a section within a class" })
  @ApiBody({ type: CreateSectionDto })
  createSection(
    @Req() req: AuthenticatedRequest,
    @Body() dto: CreateSectionDto,
  ) {
    return this.academic.createSection(this.school(req), req.user.id, dto);
  }
}
