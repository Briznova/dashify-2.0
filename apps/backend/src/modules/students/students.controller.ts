import {
  Body,
  Controller,
  Get,
  Header,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import { ApiBody, ApiCookieAuth, ApiCreatedResponse, ApiHeader, ApiOkResponse, ApiOperation, ApiTags } from "@nestjs/swagger";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { PermissionsGuard } from "../../common/guards/permissions.guard";
import { RequirePermissions } from "../../common/decorators/permissions.decorator";
import { AuthenticatedRequest } from "../../common/interfaces/authenticated-request";
import { UpdateStudentDto } from "./dto/update-student.dto";
import { StudentDirectorySearchDto } from "./dto/student-directory-search.dto";
import { CreateAdmissionDto } from "./dto/create-admission.dto";
import { StudentsService } from "./students.service";

@ApiTags("students")
@ApiCookieAuth("accessCookie")
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller("students")
export class StudentsController {
  constructor(private readonly students: StudentsService) {}
  private school(req: AuthenticatedRequest): string {
    if (!req.user.activeSchoolId)
      throw new Error("Select an active school first");
    return req.user.activeSchoolId;
  }

  @Get()
  @RequirePermissions("students.read")
  @ApiOperation({ summary: "List students for the active school" })
  list(
    @Req() req: AuthenticatedRequest,
    @Query("page", new ParseIntPipe({ optional: true })) page = 1,
    @Query("pageSize", new ParseIntPipe({ optional: true })) pageSize = 20,
  ) {
    return this.students.list(this.school(req), page, Math.min(pageSize, 100));
  }

  @Post("search")
  @HttpCode(HttpStatus.OK)
  @Header("Cache-Control", "no-store")
  @RequirePermissions("students.read")
  @ApiOperation({ summary: "Search the active school's student directory" })
  @ApiHeader({ name: "Origin", required: true })
  @ApiHeader({ name: "X-CSRF-Token", required: true })
  @ApiBody({ type: StudentDirectorySearchDto })
  @ApiOkResponse({
    description: "Matching students and pagination metadata",
    schema: {
      type: "object",
      required: ["data", "meta"],
      properties: {
        data: { type: "array", items: { type: "object", additionalProperties: true } },
        meta: {
          type: "object",
          required: ["page", "pageSize", "total", "totalPages"],
          properties: {
            page: { type: "integer" },
            pageSize: { type: "integer" },
            total: { type: "integer" },
            totalPages: { type: "integer" },
          },
        },
      },
    },
  })
  search(@Req() req: AuthenticatedRequest, @Body() dto: StudentDirectorySearchDto) {
    return this.students.search(this.school(req), dto);
  }

  @Get(":id")
  @RequirePermissions("students.read")
  @ApiOperation({ summary: "Get a student by ID" })
  get(
    @Req() req: AuthenticatedRequest,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    return this.students.get(this.school(req), id);
  }

  @Post()
  @RequirePermissions("students.create")
  @ApiOperation({ summary: "Create a student and enrolment" })
  @ApiHeader({ name: "Origin", required: true })
  @ApiHeader({ name: "X-CSRF-Token", required: true })
  @ApiBody({ type: CreateAdmissionDto })
  @ApiCreatedResponse({
    description: "Created student with guardians and initial enrolment",
    schema: {
      type: "object",
      required: ["id", "admissionNumber", "status", "guardians", "enrolments"],
      properties: {
        id: { type: "string", format: "uuid" },
        admissionNumber: { type: "string" },
        status: { type: "string", enum: ["ACTIVE"] },
        guardians: { type: "array", items: { type: "object", additionalProperties: true } },
        enrolments: { type: "array", items: { type: "object", additionalProperties: true } },
      },
    },
  })
  create(@Req() req: AuthenticatedRequest, @Body() dto: CreateAdmissionDto) {
    return this.students.create(this.school(req), req.user.id, dto);
  }

  @Patch(":id")
  @RequirePermissions("students.update")
  @ApiOperation({ summary: "Update a student record and guardians" })
  @ApiBody({ type: UpdateStudentDto })
  update(
    @Req() req: AuthenticatedRequest,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateStudentDto,
  ) {
    return this.students.update(this.school(req), req.user.id, id, dto);
  }

  @Post(":id/archive")
  @RequirePermissions("students.archive")
  @ApiOperation({ summary: "Archive a student" })
  archive(
    @Req() req: AuthenticatedRequest,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    return this.students.archive(this.school(req), req.user.id, id);
  }
}
