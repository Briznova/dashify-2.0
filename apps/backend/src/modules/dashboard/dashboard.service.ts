import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../infrastructure/database/prisma.service";
import { PrincipalDashboardDto } from "./dto/principal-dashboard.dto";
import { SchoolAdminDashboardDto } from "./dto/school-admin-dashboard.dto";
import { TeacherDashboardDto } from "./dto/teacher-dashboard.dto";

type PrincipalAttendanceSummary = {
  presentCount: number;
  absentCount: number;
  lateCount: number;
  excusedCount: number;
  unmarkedCount: number;
};

type TeacherDashboardAssignmentRow = {
  classId: string;
  className: string;
  sectionId: string;
  sectionName: string;
  subject: string | null;
  isClassTeacher: boolean;
  classTeacherName: string | null;
  studentCount: number;
  sessionStatus: "DRAFT" | "SUBMITTED" | "OPEN" | "CLOSED" | null;
  unmarkedCount: number | null;
};

function schoolLocalDate(now: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;
  if (!year || !month || !day) {
    throw new Error("Could not derive the school-local calendar date");
  }
  return `${year}-${month}-${day}`;
}

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getSchoolAdminDashboard(
    schoolId: string,
  ): Promise<SchoolAdminDashboardDto> {
    return this.prisma.withTenant(schoolId, async (tx) => {
      const school = await tx.school.findFirst({
        where: { id: schoolId, isActive: true },
        select: { id: true, name: true },
      });
      if (!school) throw new NotFoundException("Active school not found");

      const [
        activeStudentCount,
        activeStaffCount,
        activeClassCount,
        activeSectionCount,
      ] = await Promise.all([
        tx.student.count({ where: { schoolId, status: "ACTIVE" } }),
        tx.staffProfile.count({ where: { schoolId, isActive: true } }),
        tx.schoolClass.count({ where: { schoolId, isActive: true } }),
        tx.section.count({
          where: {
            schoolId,
            isActive: true,
            class: { is: { schoolId, isActive: true } },
          },
        }),
      ]);

      return {
        schoolId: school.id,
        schoolName: school.name,
        activeStudentCount,
        activeStaffCount,
        activeClassCount,
        activeSectionCount,
      };
    });
  }

  async getPrincipalDashboard(
    schoolId: string,
  ): Promise<PrincipalDashboardDto> {
    return this.prisma.withTenant(schoolId, async (tx) => {
      const school = await tx.school.findFirst({
        where: { id: schoolId, isActive: true },
        select: { id: true, name: true, timezone: true },
      });
      if (!school) throw new NotFoundException("Active school not found");

      const localDate = schoolLocalDate(new Date(), school.timezone);
      const [summary] = await tx.$queryRaw<PrincipalAttendanceSummary[]>(
        Prisma.sql`
          WITH eligible_session_roster AS (
            SELECT DISTINCT
              session."id" AS "session_id",
              enrolment."student_id"
            FROM "attendance_sessions" AS session
            JOIN "classes" AS class
              ON class."id" = session."class_id"
              AND class."school_id" = session."school_id"
              AND class."is_active" = TRUE
            JOIN "sections" AS section
              ON section."id" = session."section_id"
              AND section."school_id" = session."school_id"
              AND section."class_id" = session."class_id"
              AND section."is_active" = TRUE
            JOIN "student_enrolments" AS enrolment
              ON enrolment."school_id" = session."school_id"
              AND enrolment."class_id" = session."class_id"
              AND enrolment."section_id" = session."section_id"
              AND enrolment."is_active" = TRUE
              AND enrolment."start_date" <= session."date"
              AND (
                enrolment."end_date" IS NULL
                OR enrolment."end_date" >= session."date"
              )
            JOIN "students" AS student
              ON student."id" = enrolment."student_id"
              AND student."school_id" = session."school_id"
              AND student."status"::text = 'ACTIVE'
            WHERE session."school_id" = ${schoolId}::uuid
              AND session."date" = ${localDate}::date
          )
          SELECT
            (COUNT(*) FILTER (
              WHERE record."status"::text = 'PRESENT'
            ))::int AS "presentCount",
            (COUNT(*) FILTER (
              WHERE record."status"::text = 'ABSENT'
            ))::int AS "absentCount",
            (COUNT(*) FILTER (
              WHERE record."status"::text = 'LATE'
            ))::int AS "lateCount",
            (COUNT(*) FILTER (
              WHERE record."status"::text = 'EXCUSED'
            ))::int AS "excusedCount",
            (COUNT(*) FILTER (
              WHERE record."id" IS NULL
            ))::int AS "unmarkedCount"
          FROM eligible_session_roster AS roster
          LEFT JOIN "attendance_records" AS record
            ON record."session_id" = roster."session_id"
            AND record."student_id" = roster."student_id"
            AND record."school_id" = ${schoolId}::uuid
        `,
      );
      if (!summary) throw new Error("Attendance dashboard aggregate returned no row");

      return {
        schoolId: school.id,
        schoolName: school.name,
        localDate,
        ...summary,
      };
    });
  }

  async getTeacherDashboard(
    schoolId: string,
    userId: string,
    academicYearId?: string,
  ): Promise<TeacherDashboardDto> {
    return this.prisma.withTenant(schoolId, async (tx) => {
      const school = await tx.school.findFirst({
        where: { id: schoolId, isActive: true },
        select: { id: true, name: true, timezone: true },
      });
      if (!school) throw new NotFoundException("Active school not found");

      const staffProfiles = await tx.staffProfile.findMany({
        where: { schoolId, userId, isActive: true },
        select: { id: true },
      });
      if (staffProfiles.length !== 1) {
        throw new ForbiddenException(
          "A unique active teacher profile is required",
        );
      }

      const localDate = schoolLocalDate(new Date(), school.timezone);
      const academicYear = await tx.academicYear.findFirst({
        where: academicYearId
          ? { id: academicYearId, schoolId }
          : { schoolId, status: "ACTIVE" },
        orderBy: { startDate: "desc" },
        select: {
          id: true,
          name: true,
          status: true,
          startDate: true,
          endDate: true,
        },
      });
      if (academicYearId && !academicYear) {
        throw new NotFoundException("Academic year not found");
      }
      const assignments = await tx.$queryRaw<TeacherDashboardAssignmentRow[]>(
        Prisma.sql`
          WITH assigned_sections AS (
            SELECT
              class."id" AS "class_id",
              section."id" AS "section_id",
              MAX(assignment."subject") FILTER (
                WHERE assignment."section_id" = section."id"
              ) AS "section_subject",
              MAX(assignment."subject") FILTER (
                WHERE assignment."section_id" IS NULL
              ) AS "class_subject",
              BOOL_OR(assignment."is_class_teacher") FILTER (
                WHERE assignment."section_id" = section."id"
              ) AS "is_class_teacher"
            FROM "teacher_assignments" AS assignment
            JOIN "classes" AS class
              ON class."id" = assignment."class_id"
              AND class."school_id" = assignment."school_id"
              AND class."is_active" = TRUE
            JOIN "sections" AS section
              ON section."class_id" = class."id"
              AND section."school_id" = assignment."school_id"
              AND section."is_active" = TRUE
            WHERE assignment."school_id" = ${schoolId}::uuid
              AND assignment."staff_id" = ${staffProfiles[0].id}::uuid
              AND assignment."is_active" = TRUE
              AND (
                assignment."section_id" IS NULL
                OR assignment."section_id" = section."id"
              )
            GROUP BY class."id", section."id"
          )
          SELECT
            class."id" AS "classId",
            class."name" AS "className",
            section."id" AS "sectionId",
            section."name" AS "sectionName",
            COALESCE(
              assigned."section_subject",
              assigned."class_subject"
            ) AS "subject",
            COALESCE(assigned."is_class_teacher", FALSE) AS "isClassTeacher",
            CASE
              WHEN class_teacher_staff."id" IS NULL THEN NULL
              ELSE CONCAT_WS(
                ' ',
                class_teacher_staff."first_name",
                class_teacher_staff."last_name"
              )
            END AS "classTeacherName",
            COUNT(DISTINCT student."id")::int AS "studentCount",
            session."status"::text AS "sessionStatus",
            CASE
              WHEN session."id" IS NULL THEN NULL
              ELSE COUNT(DISTINCT student."id") FILTER (
                WHERE record."id" IS NULL
              )::int
            END AS "unmarkedCount"
          FROM assigned_sections AS assigned
          JOIN "classes" AS class
            ON class."id" = assigned."class_id"
            AND class."school_id" = ${schoolId}::uuid
          JOIN "sections" AS section
            ON section."id" = assigned."section_id"
            AND section."school_id" = ${schoolId}::uuid
            AND section."class_id" = class."id"
          LEFT JOIN "attendance_sessions" AS session
            ON session."school_id" = ${schoolId}::uuid
            AND session."class_id" = class."id"
            AND session."section_id" = section."id"
            AND session."date" = ${localDate}::date
            AND ${academicYear?.id ?? null}::uuid IS NOT NULL
            AND ${localDate}::date >= ${academicYear?.startDate ?? null}::date
            AND ${localDate}::date <= ${academicYear?.endDate ?? null}::date
          LEFT JOIN "student_enrolments" AS enrolment
            ON enrolment."school_id" = ${schoolId}::uuid
            AND enrolment."academic_year_id" = ${academicYear?.id ?? null}::uuid
            AND enrolment."class_id" = class."id"
            AND enrolment."section_id" = section."id"
            AND enrolment."is_active" = TRUE
          LEFT JOIN "students" AS student
            ON student."id" = enrolment."student_id"
            AND student."school_id" = ${schoolId}::uuid
            AND student."status"::text = 'ACTIVE'
          LEFT JOIN "teacher_assignments" AS class_teacher
            ON class_teacher."school_id" = ${schoolId}::uuid
            AND class_teacher."class_id" = class."id"
            AND class_teacher."section_id" = section."id"
            AND class_teacher."is_active" = TRUE
            AND class_teacher."is_class_teacher" = TRUE
          LEFT JOIN "staff_profiles" AS class_teacher_staff
            ON class_teacher_staff."id" = class_teacher."staff_id"
            AND class_teacher_staff."school_id" = ${schoolId}::uuid
            AND class_teacher_staff."is_active" = TRUE
          LEFT JOIN "attendance_records" AS record
            ON record."session_id" = session."id"
            AND record."student_id" = student."id"
            AND record."school_id" = ${schoolId}::uuid
          GROUP BY
            class."id",
            class."name",
            class."sort_order",
            section."id",
            section."name",
            section."code",
            assigned."section_subject",
            assigned."class_subject",
            assigned."is_class_teacher",
            class_teacher_staff."id",
            class_teacher_staff."first_name",
            class_teacher_staff."last_name",
            session."id",
            session."status"
          ORDER BY class."sort_order", class."name", section."name"
        `,
      );

      return {
        schoolId: school.id,
        schoolName: school.name,
        localDate,
        academicYearId: academicYear?.id ?? null,
        academicYearName: academicYear?.name ?? null,
        academicYearStatus: academicYear?.status ?? null,
        assignments,
      };
    });
  }
}
