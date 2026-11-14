import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Put, Req, UseGuards } from "@nestjs/common";
import { ApiBody, ApiCookieAuth, ApiHeader, ApiOperation, ApiTags } from "@nestjs/swagger";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { PermissionsGuard } from "../../common/guards/permissions.guard";
import { RequirePermissions } from "../../common/decorators/permissions.decorator";
import { AuthenticatedRequest } from "../../common/interfaces/authenticated-request";
import { AcademicService } from "./academic.service";
import { CreateAcademicYearDto } from "./dto/create-academic-year.dto";
import { CreateClassDto } from "./dto/create-class.dto";
import { CreateClassWithSectionDto } from "./dto/create-class-with-section.dto";
import { CreateSectionDto } from "./dto/create-section.dto";
import { UpdateClassDto } from "./dto/update-class.dto";
import { UpdateSectionDto } from "./dto/update-section.dto";
import { SaveGradeScaleDto } from "./dto/save-grade-scale.dto";

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

  @Get("academic-years/:id/grade-scale")
  @RequirePermissions("academic_structure.read")
  @ApiOperation({ summary: "Read a grading scale for an academic year" })
  gradeScale(
    @Req() req: AuthenticatedRequest,
    @Param("id", ParseUUIDPipe) yearId: string,
  ) {
    return this.academic.getGradeScale(this.school(req), yearId);
  }

  @Put("academic-years/:id/grade-scale")
  @RequirePermissions("academic_structure.manage")
  @ApiHeader({ name: "Origin", required: true })
  @ApiHeader({ name: "X-CSRF-Token", required: true })
  @ApiOperation({ summary: "Create or replace an academic year's grading scale" })
  @ApiBody({ type: SaveGradeScaleDto })
  saveGradeScale(
    @Req() req: AuthenticatedRequest,
    @Param("id", ParseUUIDPipe) yearId: string,
    @Body() dto: SaveGradeScaleDto,
  ) {
    return this.academic.saveGradeScale(
      this.school(req),
      req.user.id,
      yearId,
      dto,
    );
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

  @Post("classes/with-section")
  @RequirePermissions("academic_structure.manage")
  @ApiOperation({ summary: "Create a class and its first section atomically" })
  @ApiHeader({ name: "Origin", required: true })
  @ApiHeader({ name: "X-CSRF-Token", required: true })
  @ApiBody({ type: CreateClassWithSectionDto })
  createClassWithSection(
    @Req() req: AuthenticatedRequest,
    @Body() dto: CreateClassWithSectionDto,
  ) {
    return this.academic.createClassWithSection(this.school(req), req.user.id, dto);
  }

  @Put("classes/:id")
  @RequirePermissions("academic_structure.manage")
  @ApiOperation({ summary: "Update an active class" })
  @ApiHeader({ name: "Origin", required: true })
  @ApiHeader({ name: "X-CSRF-Token", required: true })
  @ApiBody({ type: UpdateClassDto })
  updateClass(@Req() req: AuthenticatedRequest, @Param("id", ParseUUIDPipe) id: string, @Body() dto: UpdateClassDto) {
    return this.academic.updateClass(this.school(req), req.user.id, id, dto);
  }

  @Put("classes/:classId/sections/:sectionId")
  @RequirePermissions("academic_structure.manage")
  @ApiOperation({ summary: "Update an active section in an active class" })
  @ApiHeader({ name: "Origin", required: true })
  @ApiHeader({ name: "X-CSRF-Token", required: true })
  @ApiBody({ type: UpdateSectionDto })
  updateSection(
    @Req() req: AuthenticatedRequest,
    @Param("classId", ParseUUIDPipe) classId: string,
    @Param("sectionId", ParseUUIDPipe) sectionId: string,
    @Body() dto: UpdateSectionDto,
  ) {
    return this.academic.updateSection(this.school(req), req.user.id, classId, sectionId, dto);
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
