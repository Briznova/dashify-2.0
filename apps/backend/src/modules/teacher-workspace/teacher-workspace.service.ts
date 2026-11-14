import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  AttendanceSessionStatus,
  Prisma,
  TeacherAssessmentType,
  TeacherAssessmentStatus,
} from "@prisma/client";
import { parseCalendarDate } from "../../common/utils/calendar-date";
import { PrismaService } from "../../infrastructure/database/prisma.service";
import { AttendanceQueryDto } from "./dto/attendance-query.dto";
import { CreateAssessmentDto } from "./dto/create-assessment.dto";
import {
  RecordAttendanceDto,
  SubmitAttendanceDto,
} from "./dto/record-attendance.dto";
import { SaveResultsDto } from "./dto/save-results.dto";

@Injectable()
export class TeacherWorkspaceService {
  constructor(private readonly prisma: PrismaService) {}

  async listAcademicYears(schoolId: string, userId: string) {
    return this.prisma.withTenant(schoolId, async (tx) => {
      await this.teacherContext(tx, schoolId, userId);
      return tx.academicYear.findMany({
        where: { schoolId },
        orderBy: { startDate: "desc" },
        select: {
          id: true,
          name: true,
          startDate: true,
          endDate: true,
          status: true,
        },
      });
    });
  }

  async listSections(
    schoolId: string,
    userId: string,
    academicYearId?: string,
  ) {
    return this.prisma.withTenant(schoolId, async (tx) => {
      const { staffId } = await this.teacherContext(tx, schoolId, userId);
      const academicYear = academicYearId
        ? await this.academicYear(tx, schoolId, academicYearId)
        : await this.academicYear(tx, schoolId);
      const sections = await this.assignedSections(tx, schoolId, staffId);
      const counts = sections.length
        ? await tx.studentEnrolment.groupBy({
            by: ["sectionId"],
            where: {
              schoolId,
              academicYearId: academicYear.id,
              isActive: true,
              sectionId: { in: sections.map((section) => section.id) },
              student: { is: { schoolId, status: "ACTIVE" } },
            },
            _count: { _all: true },
          })
        : [];
      const countsBySection = new Map(
        counts.map((entry) => [entry.sectionId, entry._count._all]),
      );
      return {
        academicYear: {
          id: academicYear.id,
          name: academicYear.name,
          status: academicYear.status,
        },
        sections: sections.map((section) => ({
          ...section,
          studentCount: countsBySection.get(section.id) ?? 0,
        })),
      };
    });
  }

  async getAttendance(
    schoolId: string,
    userId: string,
    query: AttendanceQueryDto,
  ) {
    const date = parseCalendarDate(query.date);
    return this.prisma.withTenant(schoolId, async (tx) => {
      const { staffId } = await this.teacherContext(tx, schoolId, userId);
      const academicYear = await this.academicYear(
        tx,
        schoolId,
        query.academicYearId,
      );
      this.assertDateInAcademicYear(date, academicYear);
      const section = await this.assignedSection(
        tx,
        schoolId,
        staffId,
        query.sectionId,
      );
      const session = await tx.attendanceSession.findUnique({
        where: {
          schoolId_date_classId_sectionId: {
            schoolId,
            date,
            classId: section.classId,
            sectionId: section.id,
          },
        },
        select: { id: true, status: true, createdBy: true },
      });
      const records = session
        ? await tx.attendanceRecord.findMany({
            where: { schoolId, sessionId: session.id },
            select: { studentId: true, status: true, remarks: true },
          })
        : [];
      const statusByStudent = new Map(
        records.map((record) => [
          record.studentId,
          { status: record.status, remarks: record.remarks },
        ]),
      );
      const roster = await this.roster(
        tx,
        schoolId,
        section,
        date,
        academicYear.id,
      );

      return {
        academicYear: {
          id: academicYear.id,
          name: academicYear.name,
          status: academicYear.status,
        },
        section: {
          id: section.id,
          name: section.name,
          classId: section.classId,
          className: section.className,
        },
        date: query.date,
        status: session?.status ?? null,
        canEdit:
          !session ||
          ((session.status === AttendanceSessionStatus.DRAFT ||
            session.status === AttendanceSessionStatus.SUBMITTED) &&
            session.createdBy === userId),
        students: roster.map((entry) => ({
          studentId: entry.studentId,
          rollNumber: entry.rollNumber,
          name: this.studentName(entry.student),
          status: statusByStudent.get(entry.studentId)?.status ?? null,
          remarks: statusByStudent.get(entry.studentId)?.remarks ?? null,
        })),
      };
    });
  }

  async saveAttendanceDraft(
    schoolId: string,
    userId: string,
    dto: RecordAttendanceDto,
  ) {
    const date = parseCalendarDate(dto.date);
    try {
      return await this.prisma.withTenant(schoolId, async (tx) => {
        const { staffId, timezone } = await this.teacherContext(
          tx,
          schoolId,
          userId,
        );
        const academicYear = await this.academicYear(
          tx,
          schoolId,
          dto.academicYearId,
        );
        this.assertActiveAcademicYear(academicYear);
        this.assertDateInAcademicYear(date, academicYear);
        if (dto.date !== this.schoolLocalDate(new Date(), timezone)) {
          throw new BadRequestException(
            "Teachers can record attendance only for the school's current local date",
          );
        }
        const section = await this.assignedSection(
          tx,
          schoolId,
          staffId,
          dto.sectionId,
        );
        const roster = await this.roster(
          tx,
          schoolId,
          section,
          date,
          academicYear.id,
        );
        const rosterIds = new Set(roster.map((entry) => entry.studentId));
        const recordIds = dto.records.map((record) => record.studentId);
        const uniqueRecordIds = new Set(recordIds);
        if (
          recordIds.length === 0 ||
          uniqueRecordIds.size !== recordIds.length ||
          recordIds.some((id) => !rosterIds.has(id))
        ) {
          throw new BadRequestException(
            "Attendance drafts may include each active student in the assigned section at most once",
          );
        }

        const existing = await tx.attendanceSession.findUnique({
          where: {
            schoolId_date_classId_sectionId: {
              schoolId,
              date,
              classId: section.classId,
              sectionId: section.id,
            },
          },
          select: { id: true, status: true, createdBy: true },
        });
        if (
          existing &&
          ((existing.status !== AttendanceSessionStatus.DRAFT &&
            existing.status !== AttendanceSessionStatus.SUBMITTED) ||
            existing.createdBy !== userId)
        ) {
          throw new ConflictException(
            "Only your own attendance draft can be updated",
          );
        }

        const session =
          existing ??
          (await tx.attendanceSession.create({
            data: {
              schoolId,
              classId: section.classId,
              sectionId: section.id,
              date,
              status: AttendanceSessionStatus.DRAFT,
              createdBy: userId,
            },
            select: { id: true },
          }));
        for (const record of dto.records) {
          await tx.attendanceRecord.upsert({
            where: {
              sessionId_studentId: {
                sessionId: session.id,
                studentId: record.studentId,
              },
            },
            create: {
              schoolId,
              sessionId: session.id,
              studentId: record.studentId,
              status: record.status,
              remarks: record.remarks?.trim() || null,
              markedBy: userId,
            },
            update: {
              status: record.status,
              remarks: record.remarks?.trim() || null,
              markedBy: userId,
              markedAt: new Date(),
            },
          });
        }
        await tx.auditLog.create({
          data: {
            schoolId,
            actorUserId: userId,
            action: "TEACHER_ATTENDANCE_DRAFT_SAVED",
            resource: "attendance_session",
            resourceId: session.id,
            summary: { recordCount: dto.records.length },
          },
        });

        return {
          sessionId: session.id,
          sectionId: section.id,
          date: dto.date,
          recordCount: dto.records.length,
          status: existing?.status ?? AttendanceSessionStatus.DRAFT,
        };
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        throw new ConflictException(
          "An attendance session already exists for this section and date",
        );
      }
      throw error;
    }
  }

  async submitAttendance(
    schoolId: string,
    userId: string,
    dto: SubmitAttendanceDto,
  ) {
    const date = parseCalendarDate(dto.date);
    return this.prisma.withTenant(schoolId, async (tx) => {
      const { staffId, timezone } = await this.teacherContext(
        tx,
        schoolId,
        userId,
      );
      const academicYear = await this.academicYear(
        tx,
        schoolId,
        dto.academicYearId,
      );
      this.assertActiveAcademicYear(academicYear);
      this.assertDateInAcademicYear(date, academicYear);
      if (dto.date !== this.schoolLocalDate(new Date(), timezone)) {
        throw new BadRequestException(
          "Teachers can submit attendance only for the school's current local date",
        );
      }
      const section = await this.assignedSection(
        tx,
        schoolId,
        staffId,
        dto.sectionId,
      );
      const session = await tx.attendanceSession.findUnique({
        where: {
          schoolId_date_classId_sectionId: {
            schoolId,
            date,
            classId: section.classId,
            sectionId: section.id,
          },
        },
        select: { id: true, status: true, createdBy: true },
      });
      if (!session || session.createdBy !== userId) {
        throw new NotFoundException("Attendance draft not found");
      }
      if (session.status !== AttendanceSessionStatus.DRAFT) {
        throw new ConflictException("Only an attendance draft can be submitted");
      }
      const markedCount = await tx.attendanceRecord.count({
        where: { schoolId, sessionId: session.id },
      });
      if (markedCount === 0) {
        throw new BadRequestException(
          "Mark at least one student before submitting attendance",
        );
      }
      const updated = await tx.attendanceSession.updateMany({
        where: {
          id: session.id,
          schoolId,
          status: AttendanceSessionStatus.DRAFT,
          createdBy: userId,
        },
        data: {
          status: AttendanceSessionStatus.SUBMITTED,
          submittedAt: new Date(),
        },
      });
      if (updated.count !== 1) {
        throw new ConflictException("Attendance draft has already changed");
      }
      await tx.auditLog.create({
        data: {
          schoolId,
          actorUserId: userId,
          action: "TEACHER_ATTENDANCE_SUBMITTED",
          resource: "attendance_session",
          resourceId: session.id,
          summary: { markedCount },
        },
      });
      return {
        sessionId: session.id,
        sectionId: section.id,
        date: dto.date,
        recordCount: markedCount,
        status: AttendanceSessionStatus.SUBMITTED,
      };
    });
  }

  async listAssessments(
    schoolId: string,
    userId: string,
    academicYearId?: string,
    sectionId?: string,
  ) {
    return this.prisma.withTenant(schoolId, async (tx) => {
      const { staffId } = await this.teacherContext(tx, schoolId, userId);
      const academicYear = academicYearId
        ? await this.academicYear(tx, schoolId, academicYearId)
        : await this.academicYear(tx, schoolId);
      const sections = await this.assignedSections(tx, schoolId, staffId);
      const allowedIds = sectionId
        ? [(await this.assignedSection(tx, schoolId, staffId, sectionId)).id]
        : sections.map((section) => section.id);
      if (allowedIds.length === 0) return [];

      const assessments = await tx.teacherAssessment.findMany({
        where: {
          schoolId,
          staffId,
          sectionId: { in: allowedIds },
          academicYearId: academicYear.id,
        },
        orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }],
        include: {
          class: { select: { name: true } },
          section: { select: { name: true } },
          _count: { select: { results: true } },
        },
      });
      return assessments.map((assessment) =>
        this.assessmentResponse(assessment),
      );
    });
  }

  async createAssessment(
    schoolId: string,
    userId: string,
    dto: CreateAssessmentDto,
  ) {
    const dueDate = parseCalendarDate(dto.dueDate);
    return this.prisma.withTenant(schoolId, async (tx) => {
      const { staffId, timezone } = await this.teacherContext(
        tx,
        schoolId,
        userId,
      );
      const academicYear = await this.academicYear(
        tx,
        schoolId,
        dto.academicYearId,
      );
      this.assertActiveAcademicYear(academicYear);
      this.assertDateInAcademicYear(dueDate, academicYear);
      if (dto.dueDate < this.schoolLocalDate(new Date(), timezone)) {
        throw new BadRequestException(
          "Assessment date cannot be before the school's current local date",
        );
      }
      if (dto.passMark > dto.maxScore) {
        throw new BadRequestException(
          "Pass mark cannot exceed the assessment's maximum score",
        );
      }
      if (
        (dto.type === TeacherAssessmentType.TEST &&
          (!dto.startTime ||
            !Number.isInteger(dto.durationMinutes) ||
            (dto.durationMinutes ?? 0) < 1 ||
            (dto.durationMinutes ?? 0) > 1440)) ||
        (dto.type !== TeacherAssessmentType.TEST &&
          (dto.startTime !== undefined || dto.durationMinutes !== undefined))
      ) {
        throw new BadRequestException(
          "Tests require a valid start time and duration; other assessment types cannot include test scheduling fields",
        );
      }
      const section = await this.assignedSection(
        tx,
        schoolId,
        staffId,
        dto.sectionId,
      );
      const assessment = await tx.teacherAssessment.create({
        data: {
          schoolId,
          staffId,
          classId: section.classId,
          sectionId: section.id,
          academicYearId: academicYear.id,
          type: dto.type,
          title: dto.title.trim(),
          description: dto.description?.trim() || null,
          dueDate,
          startTime: dto.startTime ?? null,
          durationMinutes: dto.durationMinutes ?? null,
          maxScore: dto.maxScore,
          passMark: dto.passMark,
          createdBy: userId,
        },
        include: {
          class: { select: { name: true } },
          section: { select: { name: true } },
          _count: { select: { results: true } },
        },
      });
      await tx.auditLog.create({
        data: {
          schoolId,
          actorUserId: userId,
          action: "TEACHER_ASSESSMENT_CREATED",
          resource: "teacher_assessment",
          resourceId: assessment.id,
          summary: { type: assessment.type, status: assessment.status },
        },
      });
      return this.assessmentResponse(assessment);
    });
  }

  async publishAssessment(
    schoolId: string,
    userId: string,
    assessmentId: string,
  ) {
    return this.prisma.withTenant(schoolId, async (tx) => {
      const { staffId } = await this.teacherContext(tx, schoolId, userId);
      const assessment = await tx.teacherAssessment.findFirst({
        where: { id: assessmentId, schoolId, staffId },
        select: { id: true, status: true, sectionId: true },
      });
      if (!assessment) throw new NotFoundException("Assessment not found");
      await this.assignedSection(tx, schoolId, staffId, assessment.sectionId);
      if (assessment.status !== TeacherAssessmentStatus.DRAFT) {
        throw new ConflictException("Only draft assessments can be published");
      }

      const updated = await tx.teacherAssessment.updateMany({
        where: {
          id: assessmentId,
          schoolId,
          staffId,
          status: TeacherAssessmentStatus.DRAFT,
        },
        data: {
          status: TeacherAssessmentStatus.PUBLISHED,
          publishedAt: new Date(),
        },
      });
      if (updated.count !== 1) {
        throw new ConflictException("Assessment has already been published");
      }
      const published = await tx.teacherAssessment.findFirstOrThrow({
        where: { id: assessmentId, schoolId, staffId },
        include: {
          class: { select: { name: true } },
          section: { select: { name: true } },
          _count: { select: { results: true } },
        },
      });
      await tx.auditLog.create({
        data: {
          schoolId,
          actorUserId: userId,
          action: "TEACHER_ASSESSMENT_PUBLISHED",
          resource: "teacher_assessment",
          resourceId: assessmentId,
          summary: { status: TeacherAssessmentStatus.PUBLISHED },
        },
      });
      return this.assessmentResponse(published);
    });
  }

  async getResults(schoolId: string, userId: string, assessmentId: string) {
    return this.prisma.withTenant(schoolId, async (tx) => {
      const { staffId } = await this.teacherContext(tx, schoolId, userId);
      const assessment = await this.assessmentForResults(
        tx,
        schoolId,
        staffId,
        assessmentId,
      );
      const academicYear = await this.assessmentAcademicYear(
        tx,
        schoolId,
        assessment,
      );
      const section = await this.assignedSection(
        tx,
        schoolId,
        staffId,
        assessment.sectionId,
      );
      const roster = await this.roster(
        tx,
        schoolId,
        section,
        assessment.dueDate,
        academicYear.id,
      );
      const results = roster.length
        ? await tx.teacherResult.findMany({
            where: {
              schoolId,
              assessmentId,
              studentId: { in: roster.map((entry) => entry.studentId) },
            },
            select: {
              studentId: true,
              score: true,
              feedback: true,
              updatedAt: true,
            },
          })
        : [];
      const resultsByStudent = new Map(
        results.map((result) => [result.studentId, result]),
      );
      const gradeScale = await tx.gradeScale.findFirst({
        where: { schoolId, academicYearId: academicYear.id },
        include: {
          bands: { orderBy: { minPercent: "asc" } },
        },
      });
      return {
        assessment: {
          id: assessment.id,
          title: assessment.title,
          type: assessment.type,
          dueDate: this.dateOnly(assessment.dueDate),
          startTime: assessment.startTime,
          durationMinutes: assessment.durationMinutes,
          maxScore: assessment.maxScore,
          passMark: assessment.passMark,
          academicYearId: academicYear.id,
          academicYearName: academicYear.name,
          resultsStatus: assessment.resultsPublishedAt ? "PUBLISHED" : "DRAFT",
          resultsPublishedAt:
            assessment.resultsPublishedAt?.toISOString() ?? null,
          gradesConfigured: Boolean(gradeScale?.bands.length),
          className: assessment.class.name,
          sectionName: assessment.section.name,
        },
        students: roster.map((entry) => {
          const result = resultsByStudent.get(entry.studentId);
          return {
            studentId: entry.studentId,
            rollNumber: entry.rollNumber,
            name: this.studentName(entry.student),
            score: result?.score ?? null,
            feedback: result?.feedback ?? null,
            updatedAt: result?.updatedAt.toISOString() ?? null,
            passed:
              result && assessment.passMark !== null
                ? result.score >= assessment.passMark
                : null,
            grade:
              result && gradeScale
                ? (gradeScale.bands.find(
                    (band) =>
                      result.score * 100 >=
                        band.minPercent * assessment.maxScore &&
                      result.score * 100 <=
                        band.maxPercent * assessment.maxScore,
                  )?.label ?? null)
                : null,
          };
        }),
      };
    });
  }

  async saveResults(
    schoolId: string,
    userId: string,
    assessmentId: string,
    dto: SaveResultsDto,
  ) {
    return this.prisma.withTenant(schoolId, async (tx) => {
      const { staffId } = await this.teacherContext(tx, schoolId, userId);
      const assessment = await this.assessmentForResults(
        tx,
        schoolId,
        staffId,
        assessmentId,
      );
      const academicYear = await this.assessmentAcademicYear(
        tx,
        schoolId,
        assessment,
      );
      this.assertActiveAcademicYear(academicYear);
      const section = await this.assignedSection(
        tx,
        schoolId,
        staffId,
        assessment.sectionId,
      );
      const roster = await this.roster(
        tx,
        schoolId,
        section,
        assessment.dueDate,
        academicYear.id,
      );
      const rosterIds = new Set(roster.map((entry) => entry.studentId));
      const recordIds = dto.records.map((record) => record.studentId);
      const uniqueRecordIds = new Set(recordIds);
      if (
        uniqueRecordIds.size !== recordIds.length ||
        recordIds.some((id) => !rosterIds.has(id))
      ) {
        throw new BadRequestException(
          "Results may be entered once per active student enrolled on the assessment date",
        );
      }
      if (dto.records.some((record) => record.score > assessment.maxScore)) {
        throw new BadRequestException(
          "A student score cannot exceed the assessment's maximum score",
        );
      }

      for (const record of dto.records) {
        await tx.teacherResult.upsert({
          where: {
            assessmentId_studentId: {
              assessmentId,
              studentId: record.studentId,
            },
          },
          create: {
            schoolId,
            assessmentId,
            studentId: record.studentId,
            score: record.score,
            feedback: record.feedback?.trim() || null,
            updatedBy: userId,
          },
          update: {
            score: record.score,
            feedback: record.feedback?.trim() || null,
            updatedBy: userId,
          },
        });
      }

      await tx.auditLog.create({
        data: {
          schoolId,
          actorUserId: userId,
          action: "TEACHER_RESULTS_SAVED",
          resource: "teacher_assessment",
          resourceId: assessmentId,
          summary: { recordCount: dto.records.length },
        },
      });
      return { assessmentId, savedCount: dto.records.length };
    });
  }

  async publishResults(schoolId: string, userId: string, assessmentId: string) {
    return this.prisma.withTenant(schoolId, async (tx) => {
      const { staffId } = await this.teacherContext(tx, schoolId, userId);
      const assessment = await this.assessmentForResults(
        tx,
        schoolId,
        staffId,
        assessmentId,
      );
      const academicYear = await this.assessmentAcademicYear(
        tx,
        schoolId,
        assessment,
      );
      this.assertActiveAcademicYear(academicYear);
      if (assessment.resultsPublishedAt) {
        throw new ConflictException("Results have already been published");
      }
      const resultCount = await tx.teacherResult.count({
        where: { schoolId, assessmentId },
      });
      if (resultCount === 0) {
        throw new BadRequestException(
          "Save at least one result before publishing results",
        );
      }
      const updated = await tx.teacherAssessment.updateMany({
        where: {
          id: assessmentId,
          schoolId,
          staffId,
          resultsPublishedAt: null,
        },
        data: { resultsPublishedAt: new Date() },
      });
      if (updated.count !== 1) {
        throw new ConflictException("Results have already been published");
      }
      await tx.auditLog.create({
        data: {
          schoolId,
          actorUserId: userId,
          action: "TEACHER_RESULTS_PUBLISHED",
          resource: "teacher_assessment",
          resourceId: assessmentId,
          summary: { resultCount },
        },
      });
      return {
        assessmentId,
        resultsStatus: "PUBLISHED",
        publishedCount: resultCount,
      };
    });
  }

  private async teacherContext(
    tx: Prisma.TransactionClient,
    schoolId: string,
    userId: string,
  ) {
    const school = await tx.school.findFirst({
      where: { id: schoolId, isActive: true },
      select: { timezone: true },
    });
    if (!school) throw new NotFoundException("Active school not found");

    const profiles = await tx.staffProfile.findMany({
      where: { schoolId, userId, isActive: true },
      select: { id: true },
      take: 2,
    });
    if (profiles.length === 0) {
      throw new NotFoundException("Active teacher profile not found");
    }
    if (profiles.length > 1) {
      throw new ConflictException(
        "Teacher account must have exactly one active staff profile",
      );
    }
    return { staffId: profiles[0].id, timezone: school.timezone };
  }

  private async academicYear(
    tx: Prisma.TransactionClient,
    schoolId: string,
    academicYearId?: string,
  ) {
    const year = await tx.academicYear.findFirst({
      where: academicYearId
        ? { id: academicYearId, schoolId }
        : { schoolId, status: "ACTIVE" },
      orderBy: { startDate: "desc" },
      select: {
        id: true,
        name: true,
        startDate: true,
        endDate: true,
        status: true,
      },
    });
    if (!year) {
      throw new NotFoundException(
        academicYearId ? "Academic year not found" : "Active academic year not found",
      );
    }
    return year;
  }

  private assertActiveAcademicYear(year: { status: string }) {
    if (year.status !== "ACTIVE") {
      throw new BadRequestException(
        "Historical academic years are read-only in the Teacher workspace",
      );
    }
  }

  private assertDateInAcademicYear(date: Date, year: { startDate: Date; endDate: Date }) {
    const dateString = this.dateOnly(date);
    if (
      dateString < this.dateOnly(year.startDate) ||
      dateString > this.dateOnly(year.endDate)
    ) {
      throw new BadRequestException(
        "The selected date must be within the selected academic year",
      );
    }
  }

  private async assignedSections(
    tx: Prisma.TransactionClient,
    schoolId: string,
    staffId: string,
  ) {
    const assignments = await tx.teacherAssignment.findMany({
      where: { schoolId, staffId, isActive: true },
      select: {
        classId: true,
        sectionId: true,
        subject: true,
        isClassTeacher: true,
      },
    });
    if (assignments.length === 0) return [];

    const constraints = assignments.map((assignment) =>
      assignment.sectionId
        ? { id: assignment.sectionId, classId: assignment.classId }
        : { classId: assignment.classId },
    );
    const sections = await tx.section.findMany({
      where: {
        schoolId,
        isActive: true,
        class: { schoolId, isActive: true },
        OR: constraints,
      },
      orderBy: [{ classId: "asc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        classId: true,
        class: { select: { name: true } },
      },
    });
    const classTeachers = await tx.teacherAssignment.findMany({
      where: {
        schoolId,
        isActive: true,
        isClassTeacher: true,
        sectionId: { in: sections.map((section) => section.id) },
      },
      select: {
        sectionId: true,
        staff: { select: { firstName: true, lastName: true } },
      },
    });
    return sections.map((section) => {
      const assignment =
        assignments.find(
          (item) =>
            item.classId === section.classId && item.sectionId === section.id,
        ) ??
        assignments.find(
          (item) => item.classId === section.classId && item.sectionId === null,
        );
      const classTeacher = classTeachers.find(
        (item) => item.sectionId === section.id,
      );
      const { class: sectionClass, ...sectionFields } = section;
      return {
        ...sectionFields,
        className: sectionClass.name,
        subject: assignment?.subject ?? null,
        isClassTeacher: assignment?.isClassTeacher ?? false,
        classTeacherName: classTeacher
          ? this.studentName(classTeacher.staff)
          : null,
      };
    });
  }

  private async assignedSection(
    tx: Prisma.TransactionClient,
    schoolId: string,
    staffId: string,
    sectionId: string,
  ) {
    const section = (await this.assignedSections(tx, schoolId, staffId)).find(
      (item) => item.id === sectionId,
    );
    if (!section)
      throw new NotFoundException("Assigned active section not found");
    return section;
  }

  private async roster(
    tx: Prisma.TransactionClient,
    schoolId: string,
    section: { id: string; classId: string },
    date: Date,
    academicYearId: string,
  ) {
    return tx.studentEnrolment.findMany({
      where: {
        schoolId,
        academicYearId,
        classId: section.classId,
        sectionId: section.id,
        isActive: true,
        startDate: { lte: date },
        OR: [{ endDate: null }, { endDate: { gte: date } }],
        student: { is: { schoolId, status: "ACTIVE" } },
      },
      orderBy: [
        { rollNumber: "asc" },
        { student: { lastName: "asc" } },
        { student: { firstName: "asc" } },
      ],
      select: {
        studentId: true,
        rollNumber: true,
        student: { select: { firstName: true, lastName: true } },
      },
    });
  }

  private async assessmentForResults(
    tx: Prisma.TransactionClient,
    schoolId: string,
    staffId: string,
    assessmentId: string,
  ) {
    const assessment = await tx.teacherAssessment.findFirst({
      where: { id: assessmentId, schoolId, staffId },
      include: {
        class: { select: { name: true } },
        section: { select: { name: true } },
      },
    });
    if (!assessment) throw new NotFoundException("Assessment not found");
    if (assessment.status !== TeacherAssessmentStatus.PUBLISHED) {
      throw new ConflictException(
        "Results can be entered after the assessment is published",
      );
    }
    return assessment;
  }

  private async assessmentAcademicYear(
    tx: Prisma.TransactionClient,
    schoolId: string,
    assessment: { academicYearId: string | null; dueDate: Date },
  ) {
    if (assessment.academicYearId) {
      return this.academicYear(tx, schoolId, assessment.academicYearId);
    }
    const date = this.dateOnly(assessment.dueDate);
    const year = await tx.academicYear.findFirst({
      where: {
        schoolId,
        startDate: { lte: assessment.dueDate },
        endDate: { gte: assessment.dueDate },
      },
      orderBy: { startDate: "desc" },
      select: {
        id: true,
        name: true,
        startDate: true,
        endDate: true,
        status: true,
      },
    });
    if (!year || date < this.dateOnly(year.startDate) || date > this.dateOnly(year.endDate)) {
      throw new NotFoundException("Assessment academic year not found");
    }
    return year;
  }

  private assessmentResponse<
    T extends {
      id: string;
      sectionId: string;
      type: string;
      status: string;
      title: string;
      description: string | null;
      dueDate: Date;
      startTime: string | null;
      durationMinutes: number | null;
      maxScore: number;
      passMark: number | null;
      academicYearId: string | null;
      publishedAt: Date | null;
      resultsPublishedAt: Date | null;
      class: { name: string };
      section: { name: string };
      _count: { results: number };
    },
  >(assessment: T) {
    return {
      id: assessment.id,
      sectionId: assessment.sectionId,
      type: assessment.type,
      status: assessment.status,
      title: assessment.title,
      description: assessment.description,
      dueDate: this.dateOnly(assessment.dueDate),
      startTime: assessment.startTime,
      durationMinutes: assessment.durationMinutes,
      maxScore: assessment.maxScore,
      passMark: assessment.passMark,
      academicYearId: assessment.academicYearId,
      publishedAt: assessment.publishedAt?.toISOString() ?? null,
      resultsStatus: assessment.resultsPublishedAt ? "PUBLISHED" : "DRAFT",
      className: assessment.class.name,
      sectionName: assessment.section.name,
      resultCount: assessment._count.results,
    };
  }

  private studentName(student: {
    firstName: string | null;
    lastName: string | null;
  }) {
    return [student.firstName, student.lastName].filter(Boolean).join(" ");
  }

  private dateOnly(date: Date) {
    return date.toISOString().slice(0, 10);
  }

  private schoolLocalDate(now: Date, timezone: string) {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(now);
    const values = Object.fromEntries(
      parts.map((part) => [part.type, part.value]),
    );
    return `${values.year}-${values.month}-${values.day}`;
  }
}
