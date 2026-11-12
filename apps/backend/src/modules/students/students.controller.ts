import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import { ApiBody, ApiCookieAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { PermissionsGuard } from "../../common/guards/permissions.guard";
import { RequirePermissions } from "../../common/decorators/permissions.decorator";
import { AuthenticatedRequest } from "../../common/interfaces/authenticated-request";
import { CreateStudentDto } from "./dto/create-student.dto";
import { UpdateStudentDto } from "./dto/update-student.dto";
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
  @ApiBody({
    type: CreateStudentDto,
    examples: {
      student: {
        summary: "Create a student without guardians",
        value: {
          admissionNumber: "ADM-2026-001",
          firstName: "Aarav",
          lastName: "Sharma",
          dateOfBirth: "2016-08-15",
          gender: "MALE",
          admissionDate: "2026-04-01",
          academicYearId: "11111111-1111-4111-8111-111111111111",
          classId: "22222222-2222-4222-8222-222222222222",
          sectionId: "33333333-3333-4333-8333-333333333333",
          guardians: [],
        },
      },
      studentWithGuardian: {
        summary: "Create a student with a guardian",
        value: {
          admissionNumber: "ADM-2026-002",
          firstName: "Aarav",
          lastName: "Sharma",
          admissionDate: "2026-04-01",
          academicYearId: "11111111-1111-4111-8111-111111111111",
          classId: "22222222-2222-4222-8222-222222222222",
          sectionId: "33333333-3333-4333-8333-333333333333",
          guardians: [
            {
              firstName: "Priya",
              lastName: "Sharma",
              relationship: "MOTHER",
              phone: "+919876543210",
              email: "priya.sharma@example.test",
              isPrimary: true,
            },
          ],
        },
      },
    },
  })
  create(@Req() req: AuthenticatedRequest, @Body() dto: CreateStudentDto) {
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
