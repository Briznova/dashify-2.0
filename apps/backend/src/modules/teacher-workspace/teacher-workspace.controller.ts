import {
  BadRequestException,
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
import {
  ApiBody,
  ApiCookieAuth,
  ApiHeader,
  ApiOperation,
  ApiTags,
} from "@nestjs/swagger";
import { RequirePermissions } from "../../common/decorators/permissions.decorator";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { PermissionsGuard } from "../../common/guards/permissions.guard";
import { AuthenticatedRequest } from "../../common/interfaces/authenticated-request";
import { AttendanceQueryDto } from "./dto/attendance-query.dto";
import { CreateAssessmentDto } from "./dto/create-assessment.dto";
import {
  RecordAttendanceDto,
  SubmitAttendanceDto,
} from "./dto/record-attendance.dto";
import { SaveResultsDto } from "./dto/save-results.dto";
import { TeacherWorkspaceService } from "./teacher-workspace.service";

@ApiTags("teacher-workspace")
@ApiCookieAuth("accessCookie")
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller("teacher")
export class TeacherWorkspaceController {
  constructor(private readonly teacherWorkspace: TeacherWorkspaceService) {}

  @Get("sections")
  @RequirePermissions("teacher.classes.read")
  @ApiOperation({ summary: "List the authenticated teacher's active sections" })
  sections(
    @Req() req: AuthenticatedRequest,
    @Query("academicYearId", new ParseUUIDPipe({ optional: true }))
    academicYearId?: string,
  ) {
    return this.teacherWorkspace.listSections(
      this.activeSchool(req),
      req.user.id,
      academicYearId,
    );
  }

  @Get("academic-years")
  @RequirePermissions("teacher.classes.read")
  @ApiOperation({
    summary: "List academic years for the authenticated teacher's school",
  })
  academicYears(@Req() req: AuthenticatedRequest) {
    return this.teacherWorkspace.listAcademicYears(
      this.activeSchool(req),
      req.user.id,
    );
  }

  @Get("attendance")
  @RequirePermissions("teacher.attendance.read")
  @ApiOperation({
    summary:
      "Read a date-specific roster and attendance for an assigned section",
  })
  attendance(
    @Req() req: AuthenticatedRequest,
    @Query() query: AttendanceQueryDto,
  ) {
    return this.teacherWorkspace.getAttendance(
      this.activeSchool(req),
      req.user.id,
      query,
    );
  }

  @Put("attendance/draft")
  @RequirePermissions("teacher.attendance.mark")
  @ApiHeader({ name: "Origin", required: true })
  @ApiHeader({ name: "X-CSRF-Token", required: true })
  @ApiOperation({
    summary: "Save or update today's assigned-section attendance draft",
  })
  @ApiBody({ type: RecordAttendanceDto })
  saveAttendanceDraft(
    @Req() req: AuthenticatedRequest,
    @Body() dto: RecordAttendanceDto,
  ) {
    return this.teacherWorkspace.saveAttendanceDraft(
      this.activeSchool(req),
      req.user.id,
      dto,
    );
  }

  @Post("attendance/submit")
  @RequirePermissions("teacher.attendance.mark")
  @ApiHeader({ name: "Origin", required: true })
  @ApiHeader({ name: "X-CSRF-Token", required: true })
  @ApiOperation({
    summary: "Submit today's partial attendance register",
  })
  @ApiBody({ type: SubmitAttendanceDto })
  submitAttendance(
    @Req() req: AuthenticatedRequest,
    @Body() dto: SubmitAttendanceDto,
  ) {
    return this.teacherWorkspace.submitAttendance(
      this.activeSchool(req),
      req.user.id,
      dto,
    );
  }

  @Get("assessments")
  @RequirePermissions("teacher.assessments.read")
  @ApiOperation({
    summary: "List teacher-created assessments in assigned active sections",
  })
  assessments(
    @Req() req: AuthenticatedRequest,
    @Query("academicYearId", new ParseUUIDPipe({ optional: true }))
    academicYearId?: string,
    @Query("sectionId", new ParseUUIDPipe({ optional: true }))
    sectionId?: string,
  ) {
    return this.teacherWorkspace.listAssessments(
      this.activeSchool(req),
      req.user.id,
      academicYearId,
      sectionId,
    );
  }

  @Post("assessments")
  @RequirePermissions("teacher.assessments.manage")
  @ApiHeader({ name: "Origin", required: true })
  @ApiHeader({ name: "X-CSRF-Token", required: true })
  @ApiOperation({ summary: "Create a draft assignment, exam, or test" })
  @ApiBody({ type: CreateAssessmentDto })
  createAssessment(
    @Req() req: AuthenticatedRequest,
    @Body() dto: CreateAssessmentDto,
  ) {
    return this.teacherWorkspace.createAssessment(
      this.activeSchool(req),
      req.user.id,
      dto,
    );
  }

  @Post("assessments/:id/publish")
  @RequirePermissions("teacher.assessments.manage")
  @ApiHeader({ name: "Origin", required: true })
  @ApiHeader({ name: "X-CSRF-Token", required: true })
  @ApiOperation({
    summary: "Publish a draft assignment or exam; publishing is irreversible",
  })
  publishAssessment(
    @Req() req: AuthenticatedRequest,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    return this.teacherWorkspace.publishAssessment(
      this.activeSchool(req),
      req.user.id,
      id,
    );
  }

  @Get("assessments/:id/results")
  @RequirePermissions("teacher.results.read")
  @ApiOperation({
    summary: "Read the assessment-date roster and teacher-entered results",
  })
  results(
    @Req() req: AuthenticatedRequest,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    return this.teacherWorkspace.getResults(
      this.activeSchool(req),
      req.user.id,
      id,
    );
  }

  @Put("assessments/:id/results")
  @RequirePermissions("teacher.results.write")
  @ApiHeader({ name: "Origin", required: true })
  @ApiHeader({ name: "X-CSRF-Token", required: true })
  @ApiOperation({
    summary:
      "Record or update scores for active students enrolled on the assessment date",
  })
  @ApiBody({ type: SaveResultsDto })
  saveResults(
    @Req() req: AuthenticatedRequest,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: SaveResultsDto,
  ) {
    return this.teacherWorkspace.saveResults(
      this.activeSchool(req),
      req.user.id,
      id,
      dto,
    );
  }

  @Post("assessments/:id/results/publish")
  @RequirePermissions("teacher.results.write")
  @ApiHeader({ name: "Origin", required: true })
  @ApiHeader({ name: "X-CSRF-Token", required: true })
  @ApiOperation({
    summary: "Publish partial results for a published assessment",
  })
  publishResults(
    @Req() req: AuthenticatedRequest,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    return this.teacherWorkspace.publishResults(
      this.activeSchool(req),
      req.user.id,
      id,
    );
  }

  private activeSchool(req: AuthenticatedRequest) {
    if (!req.user.activeSchoolId) {
      throw new BadRequestException("Select an active school first");
    }
    return req.user.activeSchoolId;
  }
}
