import { ApiError, type ApiClient } from "@/services/api-client";
import type { SchoolService } from "@/services/school-service";
import type {
  AcademicYear,
  Announcement,
  AttendanceRosterStudent,
  AttendanceSession,
  AttendanceSessionRecord,
  CreateAcademicYearInput,
  AcademicSection,
  AcademicReport,
  Assignment,
  AttendanceReport,
  AttendanceRecord,
  Classroom,
  CreateAcademicSectionInput,
  CreateAnnouncementInput,
  CreateClassroomInput,
  CreateClassroomWithSectionInput,
  CreateStaffInput,
  CreateTeacherAccountInput,
  CreatePlatformSchoolInput,
  CreatedPlatformSchool,
  DashboardMetric,
  FeeRecord,
  PortalOverview,
  PortalRole,
  PlatformSchool,
  PlatformSchoolDetail,
  School,
  SchoolOverview,
  SchoolRole,
  SchoolSettingsData,
  StaffMember,
  StaffDepartment,
  Student,
  StudentCreateInput,
  StudentGuardian,
  StudentInput,
  StudentPage,
  StudentDirectorySearch,
  StudentAdmissionInput,
  SchoolProfile,
  TeacherDashboard,
  TeacherDashboardAssignment,
  TeacherSection,
  TeacherAttendance,
  TeacherAttendanceStatus,
  TeacherAssessment,
  TeacherAssessmentResults,
  TeacherAssessmentType,
  TeacherAssessmentStatus,
  TeacherAttendanceSessionStatus,
  TeacherAcademicYear,
  TeacherSections,
  TeacherGradeBand,
  TeacherGradeScale,
  TeacherNotifications,
  TeacherAssignment,
  AssignTeacherInput,
  UpdateStaffInput,
  UpdateSchoolProfileInput,
  UpdateClassroomInput,
  UpdateAcademicSectionInput,
  MarkAttendanceInput,
} from "@/types/school";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseAcademicClasses(response: unknown): Classroom[] {
  if (!Array.isArray(response)) {
    throw new ApiError("The Dashify service returned invalid class data.", 502);
  }

  return response.map((item, index) => {
    if (
      !isRecord(item) ||
      typeof item.id !== "string" ||
      typeof item.name !== "string" ||
      typeof item.code !== "string" ||
      typeof item.sortOrder !== "number" ||
      !Number.isInteger(item.sortOrder) ||
      typeof item.isActive !== "boolean" ||
      !Array.isArray(item.sections)
    ) {
      throw new ApiError(
        `The Dashify service returned invalid data for class ${index + 1}.`,
        502,
      );
    }

    const sections: AcademicSection[] = item.sections.map((section, sectionIndex) => {
      if (
        !isRecord(section) ||
        typeof section.id !== "string" ||
        typeof section.name !== "string" ||
        typeof section.code !== "string" ||
        (section.capacity !== null &&
          (typeof section.capacity !== "number" ||
            !Number.isInteger(section.capacity))) ||
        typeof section.isActive !== "boolean"
      ) {
        throw new ApiError(
          `The Dashify service returned invalid data for class ${index + 1}, section ${sectionIndex + 1}.`,
          502,
        );
      }

      return {
        id: section.id,
        name: section.name,
        code: section.code,
        capacity: section.capacity,
        isActive: section.isActive,
      };
    });

    return {
      id: item.id,
      name: item.name,
      code: item.code,
      sortOrder: item.sortOrder,
      isActive: item.isActive,
      sections,
    };
  });
}

function parseDashboardCount(value: unknown): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0) {
    throw new ApiError("The Dashify service returned invalid dashboard counts.", 502);
  }
  return value;
}

function parsePlatformSchools(response: unknown): PlatformSchool[] {
  if (!Array.isArray(response)) {
    throw new ApiError("The Dashify service returned invalid school directory data.", 502);
  }
  return response.map((item, index) => {
    if (
      !isRecord(item) ||
      typeof item.id !== "string" ||
      !item.id.trim() ||
      typeof item.name !== "string" ||
      !item.name.trim() ||
      typeof item.code !== "string" ||
      !item.code.trim() ||
      typeof item.isActive !== "boolean" ||
      typeof item.createdAt !== "string" ||
      !item.createdAt.trim() ||
      !Number.isFinite(Date.parse(item.createdAt))
    ) {
      throw new ApiError(
        `The Dashify service returned invalid school directory data for school ${index + 1}.`,
        502,
      );
    }
    return {
      id: item.id,
      name: item.name,
      code: item.code,
      isActive: item.isActive,
      createdAt: item.createdAt,
    };
  });
}

function isValidCalendarDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function parseDashboardSchool(response: Record<string, unknown>) {
  if (
    typeof response.schoolId !== "string" ||
    !response.schoolId.trim() ||
    typeof response.schoolName !== "string" ||
    !response.schoolName.trim()
  ) {
    throw new ApiError("The Dashify service returned invalid dashboard data.", 502);
  }
  return { schoolId: response.schoolId, schoolName: response.schoolName };
}

function parseSchoolAdminDashboard(response: unknown): SchoolOverview {
  if (!isRecord(response)) {
    throw new ApiError("The Dashify service returned invalid dashboard data.", 502);
  }
  const { schoolName } = parseDashboardSchool(response);

  const metrics: DashboardMetric[] = [
    {
      label: "Active students",
      value: parseDashboardCount(response.activeStudentCount).toLocaleString(),
      icon: "users",
      tone: "blue",
    },
    {
      label: "Active staff",
      value: parseDashboardCount(response.activeStaffCount).toLocaleString(),
      icon: "graduationCap",
      tone: "violet",
    },
    {
      label: "Active classes",
      value: parseDashboardCount(response.activeClassCount).toLocaleString(),
      icon: "book",
      tone: "green",
    },
    {
      label: "Active sections",
      value: parseDashboardCount(response.activeSectionCount).toLocaleString(),
      icon: "layoutDashboard",
      tone: "orange",
    },
  ];

  return {
    role: "school_admin",
    schoolName,
    metrics,
    enrollment: [],
    pendingApprovals: [],
    upcomingEvents: [],
  };
}

function parsePrincipalDashboard(response: unknown): SchoolOverview {
  if (
    !isRecord(response) ||
    !isValidCalendarDate(response.localDate)
  ) {
    throw new ApiError("The Dashify service returned invalid dashboard data.", 502);
  }
  const { schoolName } = parseDashboardSchool(response);
  const metrics: DashboardMetric[] = [
    {
      label: "Present",
      value: parseDashboardCount(response.presentCount).toLocaleString(),
      icon: "check",
      tone: "green",
    },
    {
      label: "Absent",
      value: parseDashboardCount(response.absentCount).toLocaleString(),
      icon: "alert",
      tone: "orange",
    },
    {
      label: "Late",
      value: parseDashboardCount(response.lateCount).toLocaleString(),
      icon: "clock",
      tone: "violet",
    },
    {
      label: "Excused",
      value: parseDashboardCount(response.excusedCount).toLocaleString(),
      icon: "info",
      tone: "blue",
    },
    {
      label: "Unmarked",
      value: parseDashboardCount(response.unmarkedCount).toLocaleString(),
      icon: "calendarCheck",
      tone: "orange",
    },
  ];

  return {
    role: "principal",
    schoolName,
    localDate: response.localDate,
    metrics,
    enrollment: [],
    pendingApprovals: [],
    upcomingEvents: [],
  };
}

function parseTeacherDashboard(response: unknown): TeacherDashboard {
  if (
    !isRecord(response) ||
    !isValidCalendarDate(response.localDate) ||
    (response.academicYearId !== null &&
      response.academicYearId !== undefined &&
      typeof response.academicYearId !== "string") ||
    (response.academicYearName !== undefined &&
      response.academicYearName !== null &&
      typeof response.academicYearName !== "string") ||
    (response.academicYearStatus !== null &&
      response.academicYearStatus !== undefined &&
      typeof response.academicYearStatus !== "string") ||
    !Array.isArray(response.assignments)
  ) {
    throw new ApiError(
      "The Dashify service returned invalid teacher dashboard data.",
      502,
    );
  }
  const { schoolId, schoolName } = parseDashboardSchool(response);
  const assignments: TeacherDashboardAssignment[] = response.assignments.map(
    (item, index) => {
      if (
        !isRecord(item) ||
        typeof item.classId !== "string" ||
        !item.classId.trim() ||
        typeof item.className !== "string" ||
        !item.className.trim() ||
        typeof item.sectionId !== "string" ||
        !item.sectionId.trim() ||
        typeof item.sectionName !== "string" ||
        !item.sectionName.trim() ||
        (item.subject !== null && typeof item.subject !== "string") ||
        typeof item.isClassTeacher !== "boolean" ||
        (item.classTeacherName !== null &&
          typeof item.classTeacherName !== "string") ||
        (item.studentCount !== undefined &&
          item.studentCount !== null &&
          (typeof item.studentCount !== "number" ||
            !Number.isSafeInteger(item.studentCount) ||
            item.studentCount < 0)) ||
        (item.sessionStatus !== null &&
          item.sessionStatus !== "DRAFT" &&
          item.sessionStatus !== "SUBMITTED" &&
          item.sessionStatus !== "OPEN" &&
          item.sessionStatus !== "CLOSED") ||
        (item.unmarkedCount !== null &&
          (typeof item.unmarkedCount !== "number" ||
            !Number.isSafeInteger(item.unmarkedCount) ||
            item.unmarkedCount < 0)) ||
        ((item.sessionStatus === null) !== (item.unmarkedCount === null))
      ) {
        throw new ApiError(
          `The Dashify service returned invalid teacher assignment data at row ${index + 1}.`,
          502,
        );
      }

      return {
        id: `${item.classId}-${item.sectionId}`,
        classId: item.classId,
        className: item.className,
        sectionId: item.sectionId,
        sectionName: item.sectionName,
        subject: item.subject,
        studentCount:
          typeof item.studentCount === "number" ? item.studentCount : null,
        isClassTeacher: item.isClassTeacher,
        classTeacherName: item.classTeacherName,
        sessionStatus: item.sessionStatus,
        unmarkedCount: item.unmarkedCount,
      };
    },
  );

  return {
    schoolId,
    schoolName,
    localDate: response.localDate,
    academicYearId:
      typeof response.academicYearId === "string"
        ? response.academicYearId
        : null,
    academicYearName:
      typeof response.academicYearName === "string"
        ? response.academicYearName
        : null,
    academicYearStatus:
      typeof response.academicYearStatus === "string"
        ? response.academicYearStatus
        : null,
    assignments,
  };
}

function parseTeacherAcademicYears(response: unknown): TeacherAcademicYear[] {
  if (!Array.isArray(response)) {
    throw new ApiError(
      "The Dashify service returned invalid teacher academic years.",
      502,
    );
  }
  return response.map((item, index) => {
    if (
      !isRecord(item) ||
      typeof item.id !== "string" ||
      typeof item.name !== "string" ||
      typeof item.startDate !== "string" ||
      !isValidCalendarDate(item.startDate.slice(0, 10)) ||
      typeof item.endDate !== "string" ||
      !isValidCalendarDate(item.endDate.slice(0, 10)) ||
      typeof item.status !== "string"
    ) {
      throw new ApiError(
        `The Dashify service returned invalid teacher academic year ${index + 1}.`,
        502,
      );
    }
    return {
      id: item.id,
      name: item.name,
      startDate: item.startDate,
      endDate: item.endDate,
      status: item.status,
    };
  });
}

function parseTeacherSections(response: unknown): TeacherSections {
  if (
    !isRecord(response) ||
    !Array.isArray(response.sections) ||
    (response.academicYear !== null &&
      (!isRecord(response.academicYear) ||
        typeof response.academicYear.id !== "string" ||
        typeof response.academicYear.name !== "string" ||
        typeof response.academicYear.status !== "string"))
  ) {
    throw new ApiError("The Dashify service returned invalid teacher sections.", 502);
  }
  const sections: TeacherSection[] = response.sections.map((item, index) => {
    if (
      !isRecord(item) ||
      typeof item.id !== "string" ||
      !item.id.trim() ||
      typeof item.name !== "string" ||
      !item.name.trim() ||
      typeof item.classId !== "string" ||
      !item.classId.trim() ||
      typeof item.className !== "string" ||
      !item.className.trim() ||
      (item.subject !== null && typeof item.subject !== "string") ||
      typeof item.isClassTeacher !== "boolean" ||
      (item.classTeacherName !== null &&
        typeof item.classTeacherName !== "string") ||
      (item.studentCount !== null &&
        (typeof item.studentCount !== "number" ||
          !Number.isSafeInteger(item.studentCount) ||
          item.studentCount < 0))
    ) {
      throw new ApiError(
        `The Dashify service returned invalid teacher section ${index + 1}.`,
        502,
      );
    }
    return {
      id: item.id,
      name: item.name,
      classId: item.classId,
      className: item.className,
      subject: item.subject,
      isClassTeacher: item.isClassTeacher,
      classTeacherName: item.classTeacherName,
      studentCount:
        typeof item.studentCount === "number" ? item.studentCount : null,
    };
  });
  return {
    academicYear:
      response.academicYear === null
        ? null
        : {
            id: response.academicYear.id as string,
            name: response.academicYear.name as string,
            status: response.academicYear.status as string,
          },
    sections,
  };
}

const teacherAttendanceStatuses: readonly TeacherAttendanceStatus[] = [
  "PRESENT",
  "ABSENT",
  "LATE",
  "EXCUSED",
];
const teacherAttendanceSessionStatuses: readonly TeacherAttendanceSessionStatus[] =
  ["DRAFT", "SUBMITTED", "OPEN", "CLOSED"];

function parseTeacherAttendance(response: unknown): TeacherAttendance {
  if (
    !isRecord(response) ||
    !isRecord(response.academicYear) ||
    typeof response.academicYear.id !== "string" ||
    typeof response.academicYear.name !== "string" ||
    typeof response.academicYear.status !== "string" ||
    !isRecord(response.section) ||
    typeof response.section.id !== "string" ||
    typeof response.section.name !== "string" ||
    typeof response.section.classId !== "string" ||
    typeof response.section.className !== "string" ||
    !isValidCalendarDate(response.date) ||
    (response.status !== null &&
      !teacherAttendanceSessionStatuses.includes(
        response.status as TeacherAttendanceSessionStatus,
      )) ||
    typeof response.canEdit !== "boolean" ||
    !Array.isArray(response.students)
  ) {
    throw new ApiError("The Dashify service returned invalid teacher attendance.", 502);
  }
  return {
    academicYear: {
      id: response.academicYear.id,
      name: response.academicYear.name,
      status: response.academicYear.status,
    },
    section: {
      id: response.section.id,
      name: response.section.name,
      classId: response.section.classId,
      className: response.section.className,
    },
    date: response.date,
    status: response.status as TeacherAttendanceSessionStatus | null,
    canEdit: response.canEdit,
    students: response.students.map((item, index) => {
      if (
        !isRecord(item) ||
        typeof item.studentId !== "string" ||
        !item.studentId.trim() ||
        (item.rollNumber !== null && typeof item.rollNumber !== "string") ||
        typeof item.name !== "string" ||
        (item.status !== null &&
          !teacherAttendanceStatuses.includes(
            item.status as TeacherAttendanceStatus,
          )) ||
        (item.remarks !== null && typeof item.remarks !== "string") ||
        (typeof item.remarks === "string" && item.remarks.length > 500)
      ) {
        throw new ApiError(
          `The Dashify service returned invalid teacher attendance row ${index + 1}.`,
          502,
        );
      }
      return {
        studentId: item.studentId,
        rollNumber: item.rollNumber,
        name: item.name,
        status: item.status as TeacherAttendanceStatus | null,
        remarks: item.remarks,
      };
    }),
  };
}

function parseTeacherAssessment(item: unknown): TeacherAssessment {
  if (
    !isRecord(item) ||
    typeof item.id !== "string" ||
    !item.id.trim() ||
    typeof item.sectionId !== "string" ||
    !item.sectionId.trim() ||
    (item.type !== "ASSIGNMENT" &&
      item.type !== "EXAM" &&
      item.type !== "TEST") ||
    (item.status !== "DRAFT" && item.status !== "PUBLISHED") ||
    typeof item.title !== "string" ||
    (item.description !== null && typeof item.description !== "string") ||
    !isValidCalendarDate(item.dueDate) ||
    (item.startTime !== null &&
      (typeof item.startTime !== "string" ||
        !/^([01][0-9]|2[0-3]):[0-5][0-9]$/.test(item.startTime))) ||
    (item.durationMinutes !== null &&
      (typeof item.durationMinutes !== "number" ||
        !Number.isSafeInteger(item.durationMinutes) ||
        item.durationMinutes < 1 ||
        item.durationMinutes > 1440)) ||
    typeof item.maxScore !== "number" ||
    !Number.isSafeInteger(item.maxScore) ||
    item.maxScore < 1 ||
    (item.passMark !== null &&
      (typeof item.passMark !== "number" ||
        !Number.isSafeInteger(item.passMark) ||
        item.passMark < 0 ||
        item.passMark > item.maxScore)) ||
    (item.academicYearId !== null &&
      typeof item.academicYearId !== "string") ||
    (item.publishedAt !== null &&
      (typeof item.publishedAt !== "string" ||
        !Number.isFinite(Date.parse(item.publishedAt)))) ||
    (item.resultsStatus !== "DRAFT" && item.resultsStatus !== "PUBLISHED") ||
    typeof item.className !== "string" ||
    typeof item.sectionName !== "string" ||
    typeof item.resultCount !== "number" ||
    !Number.isSafeInteger(item.resultCount) ||
    item.resultCount < 0
  ) {
    throw new ApiError("The Dashify service returned invalid teacher assessment data.", 502);
  }
  return {
    id: item.id,
    sectionId: item.sectionId,
    type: item.type as TeacherAssessmentType,
    status: item.status as TeacherAssessmentStatus,
    title: item.title,
    description: item.description,
    dueDate: item.dueDate,
    startTime: item.startTime,
    durationMinutes: item.durationMinutes,
    maxScore: item.maxScore,
    passMark: item.passMark,
    academicYearId: item.academicYearId,
    publishedAt: item.publishedAt,
    resultsStatus: item.resultsStatus,
    className: item.className,
    sectionName: item.sectionName,
    resultCount: item.resultCount,
  };
}

function parseTeacherAssessments(response: unknown): TeacherAssessment[] {
  if (!Array.isArray(response)) {
    throw new ApiError("The Dashify service returned invalid teacher assessments.", 502);
  }
  return response.map(parseTeacherAssessment);
}

function parseTeacherResults(response: unknown): TeacherAssessmentResults {
  if (
    !isRecord(response) ||
    !isRecord(response.assessment) ||
    typeof response.assessment.id !== "string" ||
    typeof response.assessment.title !== "string" ||
    (response.assessment.type !== "ASSIGNMENT" &&
      response.assessment.type !== "EXAM" &&
      response.assessment.type !== "TEST") ||
    !isValidCalendarDate(response.assessment.dueDate) ||
    (response.assessment.startTime !== null &&
      (typeof response.assessment.startTime !== "string" ||
        !/^([01][0-9]|2[0-3]):[0-5][0-9]$/.test(
          response.assessment.startTime,
        ))) ||
    (response.assessment.durationMinutes !== null &&
      (typeof response.assessment.durationMinutes !== "number" ||
        !Number.isSafeInteger(response.assessment.durationMinutes) ||
        response.assessment.durationMinutes < 1 ||
        response.assessment.durationMinutes > 1440)) ||
    (response.assessment.resultsStatus !== "DRAFT" &&
      response.assessment.resultsStatus !== "PUBLISHED") ||
    typeof response.assessment.maxScore !== "number" ||
    !Number.isSafeInteger(response.assessment.maxScore) ||
    response.assessment.maxScore < 1 ||
    (response.assessment.passMark !== null &&
      (typeof response.assessment.passMark !== "number" ||
        !Number.isSafeInteger(response.assessment.passMark) ||
        response.assessment.passMark < 0 ||
        response.assessment.passMark > response.assessment.maxScore)) ||
    typeof response.assessment.academicYearId !== "string" ||
    typeof response.assessment.academicYearName !== "string" ||
    (response.assessment.resultsPublishedAt !== null &&
      (typeof response.assessment.resultsPublishedAt !== "string" ||
        !Number.isFinite(Date.parse(response.assessment.resultsPublishedAt)))) ||
    typeof response.assessment.gradesConfigured !== "boolean" ||
    typeof response.assessment.className !== "string" ||
    typeof response.assessment.sectionName !== "string" ||
    !Array.isArray(response.students)
  ) {
    throw new ApiError("The Dashify service returned invalid teacher results.", 502);
  }
  const maxScore = response.assessment.maxScore;
  return {
    assessment: {
      id: response.assessment.id,
      title: response.assessment.title,
      type: response.assessment.type as TeacherAssessmentType,
      dueDate: response.assessment.dueDate,
      startTime: response.assessment.startTime,
      durationMinutes: response.assessment.durationMinutes,
      maxScore: response.assessment.maxScore,
      passMark: response.assessment.passMark,
      academicYearId: response.assessment.academicYearId,
      resultsStatus: response.assessment.resultsStatus,
      className: response.assessment.className,
      sectionName: response.assessment.sectionName,
      academicYearName: response.assessment.academicYearName,
      resultsPublishedAt: response.assessment.resultsPublishedAt,
      gradesConfigured: response.assessment.gradesConfigured,
    },
    students: response.students.map((item, index) => {
      if (
        !isRecord(item) ||
        typeof item.studentId !== "string" ||
        (item.rollNumber !== null && typeof item.rollNumber !== "string") ||
        typeof item.name !== "string" ||
        (item.score !== null &&
          (typeof item.score !== "number" ||
            !Number.isSafeInteger(item.score) ||
            item.score < 0 ||
            item.score > maxScore)) ||
        (item.feedback !== null &&
          (typeof item.feedback !== "string" || item.feedback.length > 2000)) ||
        (item.updatedAt !== null &&
          (typeof item.updatedAt !== "string" ||
            !Number.isFinite(Date.parse(item.updatedAt)))) ||
        (item.passed !== null && typeof item.passed !== "boolean") ||
        (item.grade !== null && typeof item.grade !== "string")
      ) {
        throw new ApiError(
          `The Dashify service returned invalid teacher result row ${index + 1}.`,
          502,
        );
      }
      return {
        studentId: item.studentId,
        rollNumber: item.rollNumber,
        name: item.name,
        score: item.score,
        feedback: item.feedback,
        updatedAt: item.updatedAt,
        passed: item.passed,
        grade: item.grade,
      };
    }),
  };
}

function parseTeacherGradeScale(response: unknown): TeacherGradeScale {
  if (
    !isRecord(response) ||
    typeof response.academicYearId !== "string" ||
    typeof response.academicYearName !== "string" ||
    !Array.isArray(response.bands)
  ) {
    throw new ApiError("The Dashify service returned invalid grade-scale data.", 502);
  }
  return {
    academicYearId: response.academicYearId,
    academicYearName: response.academicYearName,
    bands: response.bands.map((band, index) => {
      if (
        !isRecord(band) ||
        typeof band.label !== "string" ||
        typeof band.minPercent !== "number" ||
        !Number.isSafeInteger(band.minPercent) ||
        typeof band.maxPercent !== "number" ||
        !Number.isSafeInteger(band.maxPercent) ||
        band.minPercent < 0 ||
        band.maxPercent > 100 ||
        band.minPercent > band.maxPercent
      ) {
        throw new ApiError(
          `The Dashify service returned invalid grade band ${index + 1}.`,
          502,
        );
      }
      return {
        ...(typeof band.id === "string" ? { id: band.id } : {}),
        label: band.label,
        minPercent: band.minPercent,
        maxPercent: band.maxPercent,
      };
    }),
  }
}

function parseTeacherNotifications(response: unknown): TeacherNotifications {
  const types = ["GENERAL", "ATTENDANCE", "FEE", "ANNOUNCEMENT", "SYSTEM"];
  if (
    !isRecord(response) ||
    !Array.isArray(response.notifications) ||
    typeof response.unreadCount !== "number" ||
    !Number.isSafeInteger(response.unreadCount) ||
    response.unreadCount < 0
  ) {
    throw new ApiError("The Dashify service returned invalid notifications.", 502);
  }
  return {
    notifications: response.notifications.map((item, index) => {
      if (
        !isRecord(item) ||
        typeof item.id !== "string" ||
        typeof item.type !== "string" ||
        !types.includes(item.type) ||
        typeof item.title !== "string" ||
        typeof item.body !== "string" ||
        (item.readAt !== null &&
          (typeof item.readAt !== "string" ||
            !Number.isFinite(Date.parse(item.readAt)))) ||
        typeof item.createdAt !== "string" ||
        !Number.isFinite(Date.parse(item.createdAt))
      ) {
        throw new ApiError(
          `The Dashify service returned invalid notification ${index + 1}.`,
          502,
        );
      }
      return {
        id: item.id,
        type: item.type as TeacherNotifications["notifications"][number]["type"],
        title: item.title,
        body: item.body,
        readAt: item.readAt,
        createdAt: item.createdAt,
      };
    }),
    unreadCount: response.unreadCount,
  };
}

function parseTeacherAssignment(item: unknown): TeacherAssignment {
  if (
    !isRecord(item) ||
    typeof item.id !== "string" ||
    typeof item.staffId !== "string" ||
    typeof item.classId !== "string" ||
    (item.sectionId !== null && typeof item.sectionId !== "string") ||
    (item.subject !== null && typeof item.subject !== "string") ||
    typeof item.isClassTeacher !== "boolean" ||
    !isRecord(item.staff) ||
    !isRecord(item.class) ||
    (item.section !== null && !isRecord(item.section))
  ) {
    throw new ApiError("The Dashify service returned invalid teacher assignment data.", 502);
  }
  const staffName = [item.staff.firstName, item.staff.lastName]
    .filter(
      (name): name is string =>
        typeof name === "string" && Boolean(name.trim()),
    )
    .join(" ");
  const section = isRecord(item.section) ? item.section : null;
  const sectionId =
    typeof item.sectionId === "string" ? item.sectionId : null;
  const subject = typeof item.subject === "string" ? item.subject : null;
  if (
    typeof item.class.name !== "string" ||
    (section !== null && typeof section.name !== "string")
  ) {
    throw new ApiError("The Dashify service returned invalid teacher assignment data.", 502);
  }
  const sectionName =
    section && typeof section.name === "string" ? section.name : null;
  return {
    id: item.id,
    staffId: item.staffId,
    classId: item.classId,
    sectionId,
    subject,
    isClassTeacher: item.isClassTeacher,
    staffName,
    className: item.class.name,
    sectionName,
  };
}

function parseCreatedClassroom(response: unknown): Classroom {
  if (
    !isRecord(response) ||
    typeof response.id !== "string" ||
    typeof response.name !== "string" ||
    typeof response.code !== "string" ||
    typeof response.sortOrder !== "number" ||
    !Number.isInteger(response.sortOrder) ||
    typeof response.isActive !== "boolean"
  ) {
    throw new ApiError("The Dashify service returned invalid created-class data.", 502);
  }
  return {
    id: response.id,
    name: response.name,
    code: response.code,
    sortOrder: response.sortOrder,
    isActive: response.isActive,
    sections: [],
  };
}

function parseAcademicSection(response: unknown): AcademicSection {
  if (
    !isRecord(response) ||
    typeof response.id !== "string" ||
    typeof response.name !== "string" ||
    typeof response.code !== "string" ||
    (response.capacity !== null &&
      (typeof response.capacity !== "number" ||
        !Number.isInteger(response.capacity))) ||
    typeof response.isActive !== "boolean"
  ) {
    throw new ApiError("The Dashify service returned invalid section data.", 502);
  }
  return {
    id: response.id,
    name: response.name,
    code: response.code,
    capacity: response.capacity,
    isActive: response.isActive,
  };
}

function requiredString(
  value: unknown,
  field: string,
): string {
  if (typeof value !== "string") {
    throw new ApiError(`The Dashify service returned invalid student data (${field}).`, 502);
  }
  return value;
}

function parseStaffMember(response: unknown): StaffMember {
  if (!isRecord(response) || typeof response.id !== "string") {
    throw new ApiError("The Dashify service returned invalid staff data.", 502);
  }

  const user = isRecord(response.user) ? response.user : null;
  const firstName = typeof response.firstName === "string" ? response.firstName : "";
  const lastName = typeof response.lastName === "string" ? response.lastName : null;
  const email = typeof response.email === "string"
    ? response.email
    : user && typeof user.email === "string"
      ? user.email
      : "";

  const designation = typeof response.designation === "string"
    ? response.designation
    : "Staff";
  const departmentId = response.departmentId;
  if (departmentId !== undefined && departmentId !== null && typeof departmentId !== "string") {
    throw new ApiError("The Dashify service returned invalid staff department data.", 502);
  }
  const departmentRecord = response.departmentRecord == null ? null : parseDepartment(response.departmentRecord);
  if ((departmentId && !departmentRecord) || (departmentRecord && departmentRecord.id !== departmentId)) {
    throw new ApiError("The Dashify service returned invalid staff department data.", 502);
  }
  const department = departmentRecord
    ? departmentRecord.name
    : typeof response.department === "string" ? response.department : "General";
  const isActive = response.isActive !== false;

  return {
    id: response.id,
    name: `${firstName} ${lastName ?? ""}`.trim() || email.split("@")[0] || "Staff member",
    email,
    position: designation,
    department,
    status: isActive ? "Active" : "Inactive",
    employeeCode:
      typeof response.employeeCode === "string" ? response.employeeCode : null,
    firstName,
    lastName,
    phone: typeof response.phone === "string" ? response.phone : null,
    departmentId: departmentId ?? null,
  };
}

function parseDepartment(response: unknown): StaffDepartment {
  if (!isRecord(response) || typeof response.id !== "string" ||
    typeof response.name !== "string" || typeof response.isActive !== "boolean") {
    throw new ApiError("The Dashify service returned invalid department data.", 502);
  }
  return { id: response.id, name: response.name, isActive: response.isActive };
}

function parseAnnouncement(response: unknown): Announcement {
  if (
    !isRecord(response) ||
    typeof response.id !== "string" ||
    typeof response.title !== "string" ||
    typeof response.body !== "string" ||
    (response.status !== "DRAFT" && response.status !== "PUBLISHED") ||
    (response.publishedAt !== null &&
      typeof response.publishedAt !== "string") ||
    typeof response.createdAt !== "string"
  ) {
    throw new ApiError("The Dashify service returned invalid announcement data.", 502);
  }
  return {
    id: response.id,
    title: response.title,
    body: response.body,
    status: response.status,
    publishedAt: response.publishedAt,
    createdAt: response.createdAt,
  };
}

function parseAnnouncements(response: unknown): Announcement[] {
  if (!Array.isArray(response)) {
    throw new ApiError("The Dashify service returned invalid announcement data.", 502);
  }
  return response.map(parseAnnouncement);
}

function parseStudent(
  response: unknown,
  placement: "first" | "unique" | "unique-active" = "first",
): Student {
  if (!isRecord(response)) {
    throw new ApiError("The Dashify service returned invalid student data.", 502);
  }
  const firstName = requiredString(response.firstName, "firstName");
  const lastName = typeof response.lastName === "string" ? response.lastName : "";
  const middleName = typeof response.middleName === "string" ? response.middleName : null;
  if (!Array.isArray(response.enrolments)) {
    throw new ApiError("The Dashify service returned invalid student data (enrolments).", 502);
  }
  const enrolments = response.enrolments;
  if (placement === "unique-active" && enrolments.some(
    (enrolment) => !isRecord(enrolment) || typeof enrolment.isActive !== "boolean",
  )) {
    throw new ApiError("The Dashify service returned invalid student data (enrolment status).", 502);
  }
  const candidates = placement === "unique-active"
    ? enrolments.filter((enrolment) => isRecord(enrolment) && enrolment.isActive === true)
    : enrolments;
  const latest = placement !== "first" && candidates.length !== 1
    ? undefined
    : candidates.find(isRecord);
  const academicYear = latest && isRecord(latest.academicYear) ? latest.academicYear : null;
  const section = latest && isRecord(latest.section) ? latest.section : null;
  const schoolClass = section && isRecord(section.class) ? section.class : null;
  const academicYearId = academicYear && typeof academicYear.id === "string" ? academicYear.id : null;
  const classId = schoolClass && typeof schoolClass.id === "string" ? schoolClass.id : null;
  const sectionId = section && typeof section.id === "string" ? section.id : null;
  const guardianRows = Array.isArray(response.guardians) ? response.guardians : [];
  const guardians: StudentGuardian[] = guardianRows.map((row, index) => {
    if (!isRecord(row) || !isRecord(row.guardian)) {
      throw new ApiError(`The Dashify service returned invalid guardian data (${index + 1}).`, 502);
    }
    const guardian = row.guardian;
    const guardianFirstName = requiredString(guardian.firstName, "guardian.firstName");
    const guardianLastName = typeof guardian.lastName === "string" ? guardian.lastName : "";
    return {
      id: requiredString(guardian.id, "guardian.id"),
      name: `${guardianFirstName} ${guardianLastName}`.trim(),
      relationship: requiredString(row.relationship, "guardian.relationship"),
      phone: requiredString(guardian.phone, "guardian.phone"),
      email: typeof guardian.email === "string" ? guardian.email : null,
      isPrimary: row.isPrimary === true,
    };
  });
  const primaryGuardian = guardians.find((guardian) => guardian.isPrimary) ?? guardians[0];
  const addressValue = response.address;
  if (addressValue != null && (!isRecord(addressValue) ||
    ["line1", "city", "state", "postalCode"].some((key) => addressValue[key] != null && typeof addressValue[key] !== "string"))) {
    throw new ApiError("The Dashify service returned invalid student address data.", 502);
  }
  const address = isRecord(addressValue) ? {
    line1: typeof addressValue.line1 === "string" ? addressValue.line1 : undefined,
    city: typeof addressValue.city === "string" ? addressValue.city : undefined,
    state: typeof addressValue.state === "string" ? addressValue.state : undefined,
    postalCode: typeof addressValue.postalCode === "string" ? addressValue.postalCode : undefined,
  } : null;
  let emergencyContact: Student["emergencyContact"] = null;
  if (response.emergencyContactKind === "PRIMARY_GUARDIAN") {
    emergencyContact = { kind: "PRIMARY_GUARDIAN" };
  } else if (response.emergencyContactKind === "OTHER") {
    emergencyContact = {
      kind: "OTHER",
      name: requiredString(response.emergencyContactName, "emergencyContactName"),
      phone: requiredString(response.emergencyContactPhone, "emergencyContactPhone"),
    };
  } else if (response.emergencyContactKind != null) {
    throw new ApiError("The Dashify service returned invalid emergency contact data.", 502);
  }
  if (!["ACTIVE", "INACTIVE", "ARCHIVED"].includes(String(response.status))) {
    throw new ApiError("The Dashify service returned invalid student data (status).", 502);
  }
  const status = response.status === "ARCHIVED"
    ? "Archived"
    : response.status === "INACTIVE"
      ? "Inactive"
      : "Active";

  return {
    id: requiredString(response.id, "id"),
    name: `${firstName} ${middleName ?? ""} ${lastName}`.replace(/\s+/g, " ").trim(),
    studentNumber: requiredString(response.admissionNumber, "admissionNumber"),
    grade: schoolClass && typeof schoolClass.name === "string" ? schoolClass.name : "—",
    guardian: primaryGuardian?.name ?? null,
    attendance: null,
    status,
    firstName,
    middleName,
    lastName,
    dateOfBirth: typeof response.dateOfBirth === "string" ? response.dateOfBirth : null,
    gender: typeof response.gender === "string" ? response.gender : null,
    admissionDate: requiredString(response.admissionDate, "admissionDate"),
    academicYearName: academicYear && typeof academicYear.name === "string" ? academicYear.name : null,
    academicYearId,
    className: schoolClass && typeof schoolClass.name === "string" ? schoolClass.name : null,
    classId,
    sectionName: section && typeof section.name === "string" ? section.name : null,
    sectionId,
    guardians,
    ...(address ? { address } : {}),
    ...(emergencyContact ? { emergencyContact } : {}),
    ...(latest && typeof latest.rollNumber === "string" ? { rollNumber: latest.rollNumber } : {}),
  };
}

function parseStudentPage(response: unknown, requireUniqueEnrolment = false): StudentPage {
  if (!isRecord(response) || !Array.isArray(response.data) || !isRecord(response.meta)) {
    throw new ApiError("The Dashify service returned invalid student-list data.", 502);
  }
  const { page, pageSize, total, totalPages } = response.meta;
  if (
    typeof page !== "number" ||
    !Number.isInteger(page) ||
    typeof pageSize !== "number" ||
    !Number.isInteger(pageSize) ||
    typeof total !== "number" ||
    !Number.isInteger(total) ||
    typeof totalPages !== "number" ||
    !Number.isInteger(totalPages)
  ) {
    throw new ApiError("The Dashify service returned invalid student pagination data.", 502);
  }
  return {
    data: response.data.map((student) => parseStudent(student, requireUniqueEnrolment ? "unique" : "first")),
    meta: { page, pageSize, total, totalPages },
  };
}

function parseSchoolProfile(response: unknown): SchoolProfile {
  if (
    !isRecord(response) ||
    typeof response.id !== "string" ||
    typeof response.name !== "string" ||
    (response.email !== null && typeof response.email !== "string") ||
    (response.phone !== null && typeof response.phone !== "string") ||
    typeof response.timezone !== "string" ||
    typeof response.locale !== "string"
  ) {
    throw new ApiError("The Dashify service returned invalid school profile data.", 502);
  }
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: response.timezone }).format(new Date(0));
  } catch (reason) {
    if (reason instanceof RangeError) {
      throw new ApiError("The Dashify service returned an invalid school timezone.", 502);
    }
    throw reason;
  }
  return {
    id: response.id,
    name: response.name,
    email: response.email,
    phone: response.phone,
    timezone: response.timezone,
    locale: response.locale,
  };
}

function parseAttendanceRecord(response: unknown): AttendanceSessionRecord {
  if (
    !isRecord(response) ||
    typeof response.studentId !== "string" ||
    !["PRESENT", "ABSENT", "LATE", "EXCUSED"].includes(String(response.status)) ||
    (response.remarks !== null && typeof response.remarks !== "string") ||
    (response.markedAt !== null && typeof response.markedAt !== "string")
  ) {
    throw new ApiError("The Dashify service returned invalid attendance record data.", 502);
  }
  return {
    studentId: response.studentId,
    status: response.status as AttendanceSessionRecord["status"],
    remarks: response.remarks,
    markedAt: response.markedAt,
  };
}

function parseAttendanceSession(response: unknown): AttendanceSession {
  if (
    !isRecord(response) ||
    typeof response.id !== "string" ||
    typeof response.classId !== "string" ||
    typeof response.sectionId !== "string" ||
    typeof response.date !== "string" ||
    !["OPEN", "CLOSED"].includes(String(response.status)) ||
    !Array.isArray(response.records)
  ) {
    throw new ApiError("The Dashify service returned invalid attendance session data.", 502);
  }
  return {
    id: response.id,
    classId: response.classId,
    sectionId: response.sectionId,
    date: response.date.slice(0, 10),
    status: response.status as AttendanceSession["status"],
    records: response.records.map(parseAttendanceRecord),
  };
}

function parseAttendanceReport(
  response: unknown,
  fromDate: string,
  toDate: string,
): AttendanceReport {
  if (
    !isRecord(response) ||
    response.fromDate !== fromDate ||
    response.toDate !== toDate ||
    !isRecord(response.statusCounts) ||
    !Array.isArray(response.dailyBreakdown)
  ) {
    throw new ApiError("The Dashify service returned invalid attendance report data.", 502);
  }

  const count = (value: unknown) => {
    if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0) {
      throw new ApiError("The Dashify service returned invalid attendance report counts.", 502);
    }
    return value;
  };
  const parseStatusCounts = (value: unknown) => {
    if (!isRecord(value)) {
      throw new ApiError("The Dashify service returned invalid attendance report counts.", 502);
    }
    return {
      PRESENT: count(value.PRESENT),
      ABSENT: count(value.ABSENT),
      LATE: count(value.LATE),
      EXCUSED: count(value.EXCUSED),
    };
  };
  const statusCounts = parseStatusCounts(response.statusCounts);
  const dailyBreakdown = response.dailyBreakdown.map((value, index) => {
    if (
      !isRecord(value) ||
      typeof value.date !== "string" ||
      !/^\d{4}-\d{2}-\d{2}$/.test(value.date) ||
      value.date < fromDate ||
      value.date > toDate ||
      !Number.isSafeInteger(Date.parse(`${value.date}T00:00:00.000Z`)) ||
      new Date(`${value.date}T00:00:00.000Z`).toISOString().slice(0, 10) !==
        value.date
    ) {
      throw new ApiError(
        `The Dashify service returned invalid daily attendance data at row ${index + 1}.`,
        502,
      );
    }
    const counts = parseStatusCounts(value.statusCounts);
    const totalSessions = count(value.totalSessions);
    const totalRecords = count(value.totalRecords);
    if (
      totalSessions === 0 ||
      totalRecords !== Object.values(counts).reduce((total, item) => total + item, 0)
    ) {
      throw new ApiError(
        `The Dashify service returned inconsistent daily attendance data at row ${index + 1}.`,
        502,
      );
    }
    return {
      date: value.date,
      totalSessions,
      totalRecords,
      statusCounts: counts,
    };
  });
  if (
    dailyBreakdown.some(
      (day, index) =>
        index > 0 && dailyBreakdown[index - 1].date >= day.date,
    )
  ) {
    throw new ApiError("The Dashify service returned unsorted daily attendance data.", 502);
  }
  const sumDaily = (selector: (day: (typeof dailyBreakdown)[number]) => number) =>
    count(dailyBreakdown.reduce((total, day) => total + selector(day), 0));
  const dailyStatusCounts = {
    PRESENT: sumDaily((day) => day.statusCounts.PRESENT),
    ABSENT: sumDaily((day) => day.statusCounts.ABSENT),
    LATE: sumDaily((day) => day.statusCounts.LATE),
    EXCUSED: sumDaily((day) => day.statusCounts.EXCUSED),
  };
  const totalSessions = count(response.totalSessions);
  const totalRecords = count(response.totalRecords);
  if (
    totalSessions !== sumDaily((day) => day.totalSessions) ||
    totalRecords !== sumDaily((day) => day.totalRecords) ||
    statusCounts.PRESENT !== dailyStatusCounts.PRESENT ||
    statusCounts.ABSENT !== dailyStatusCounts.ABSENT ||
    statusCounts.LATE !== dailyStatusCounts.LATE ||
    statusCounts.EXCUSED !== dailyStatusCounts.EXCUSED
  ) {
    throw new ApiError("The Dashify service returned inconsistent attendance report totals.", 502);
  }

  return {
    fromDate,
    toDate,
    totalSessions,
    totalRecords,
    statusCounts,
    dailyBreakdown,
  };
}

export class HttpSchoolService implements SchoolService {
  constructor(private readonly api: ApiClient) {}

  async getTeacherAcademicYears(
    signal?: AbortSignal,
  ): Promise<TeacherAcademicYear[]> {
    return parseTeacherAcademicYears(
      await this.api.request<unknown>("/teacher/academic-years", {}, signal),
    );
  }

  async getTeacherDashboard(
    academicYearId?: string,
    signal?: AbortSignal,
  ): Promise<TeacherDashboard> {
    const query = academicYearId
      ? `?academicYearId=${encodeURIComponent(academicYearId)}`
      : "";
    const response = await this.api.request<unknown>(
      `/dashboard/teacher${query}`,
      {},
      signal,
    );
    return parseTeacherDashboard(response);
  }

  async getTeacherSections(
    academicYearId?: string,
    signal?: AbortSignal,
  ): Promise<TeacherSections> {
    const query = academicYearId
      ? `?academicYearId=${encodeURIComponent(academicYearId)}`
      : "";
    return parseTeacherSections(
      await this.api.request<unknown>(`/teacher/sections${query}`, {}, signal),
    );
  }

  async getTeacherAttendance(
    academicYearId: string,
    sectionId: string,
    date: string,
    signal?: AbortSignal,
  ): Promise<TeacherAttendance> {
    const query = new URLSearchParams({ academicYearId, sectionId, date });
    return parseTeacherAttendance(
      await this.api.request<unknown>(`/teacher/attendance?${query}`, {}, signal),
    );
  }

  async saveTeacherAttendanceDraft(input: {
    academicYearId: string;
    sectionId: string;
    date: string;
    records: {
      studentId: string;
      status: TeacherAttendanceStatus;
      remarks?: string;
    }[];
  }): Promise<{
    sessionId: string;
    sectionId: string;
    date: string;
    recordCount: number;
    status: TeacherAttendanceSessionStatus;
  }> {
    const response = await this.api.request<unknown>(
      "/teacher/attendance/draft",
      {
        method: "PUT",
        body: JSON.stringify(input),
      },
    );
    if (
      !isRecord(response) ||
      typeof response.sessionId !== "string" ||
      typeof response.sectionId !== "string" ||
      !isValidCalendarDate(response.date) ||
      typeof response.recordCount !== "number" ||
      !Number.isSafeInteger(response.recordCount) ||
      response.recordCount < 1 ||
      (response.status !== "DRAFT" && response.status !== "SUBMITTED")
    ) {
      throw new ApiError(
        "The Dashify service returned invalid teacher attendance draft confirmation.",
        502,
      );
    }
    return {
      sessionId: response.sessionId,
      sectionId: response.sectionId,
      date: response.date,
      recordCount: response.recordCount,
      status: response.status,
    };
  }

  async submitTeacherAttendance(input: {
    academicYearId: string;
    sectionId: string;
    date: string;
  }) {
    const response = await this.api.request<unknown>(
      "/teacher/attendance/submit",
      { method: "POST", body: JSON.stringify(input) },
    );
    if (
      !isRecord(response) ||
      typeof response.sessionId !== "string" ||
      response.sectionId !== input.sectionId ||
      response.date !== input.date ||
      typeof response.recordCount !== "number" ||
      !Number.isSafeInteger(response.recordCount) ||
      response.recordCount < 1 ||
      response.status !== "SUBMITTED"
    ) {
      throw new ApiError(
        "The Dashify service returned invalid attendance submission confirmation.",
        502,
      );
    }
    return {
      sessionId: response.sessionId,
      sectionId: response.sectionId,
      date: response.date,
      recordCount: response.recordCount,
      status: "SUBMITTED" as const,
    };
  }

  async getTeacherAssessments(
    academicYearId?: string,
    sectionId?: string,
    signal?: AbortSignal,
  ): Promise<TeacherAssessment[]> {
    const params = new URLSearchParams();
    if (academicYearId) params.set("academicYearId", academicYearId);
    if (sectionId) params.set("sectionId", sectionId);
    const query = params.size ? `?${params}` : "";
    return parseTeacherAssessments(
      await this.api.request<unknown>(`/teacher/assessments${query}`, {}, signal),
    );
  }

  async createTeacherAssessment(input: {
    academicYearId: string;
    sectionId: string;
    type: TeacherAssessmentType;
    title: string;
    description?: string;
    dueDate: string;
    startTime?: string;
    durationMinutes?: number;
    maxScore: number;
    passMark: number;
  }): Promise<TeacherAssessment> {
    return parseTeacherAssessment(
      await this.api.request<unknown>("/teacher/assessments", {
        method: "POST",
        body: JSON.stringify(input),
      }),
    );
  }

  async publishTeacherAssessment(id: string): Promise<TeacherAssessment> {
    return parseTeacherAssessment(
      await this.api.request<unknown>(
        `/teacher/assessments/${encodeURIComponent(id)}/publish`,
        { method: "POST" },
      ),
    );
  }

  async getTeacherResults(
    assessmentId: string,
    signal?: AbortSignal,
  ): Promise<TeacherAssessmentResults> {
    return parseTeacherResults(
      await this.api.request<unknown>(
        `/teacher/assessments/${encodeURIComponent(assessmentId)}/results`,
        {},
        signal,
      ),
    );
  }

  async saveTeacherResults(
    assessmentId: string,
    input: {
      records: { studentId: string; score: number; feedback?: string }[];
    },
  ): Promise<{ assessmentId: string; savedCount: number }> {
    const response = await this.api.request<unknown>(
      `/teacher/assessments/${encodeURIComponent(assessmentId)}/results`,
      { method: "PUT", body: JSON.stringify(input) },
    );
    if (
      !isRecord(response) ||
      typeof response.assessmentId !== "string" ||
      typeof response.savedCount !== "number" ||
      !Number.isSafeInteger(response.savedCount) ||
      response.savedCount < 1
    ) {
      throw new ApiError("The Dashify service returned invalid result confirmation.", 502);
    }
    return {
      assessmentId: response.assessmentId,
      savedCount: response.savedCount,
    };
  }

  async publishTeacherResults(assessmentId: string) {
    const response = await this.api.request<unknown>(
      `/teacher/assessments/${encodeURIComponent(assessmentId)}/results/publish`,
      { method: "POST" },
    );
    if (
      !isRecord(response) ||
      response.assessmentId !== assessmentId ||
      response.resultsStatus !== "PUBLISHED" ||
      typeof response.publishedCount !== "number" ||
      !Number.isSafeInteger(response.publishedCount) ||
      response.publishedCount < 1
    ) {
      throw new ApiError("The Dashify service returned invalid publish confirmation.", 502);
    }
    return {
      assessmentId,
      resultsStatus: "PUBLISHED" as const,
      publishedCount: response.publishedCount,
    };
  }

  async getGradeScale(
    academicYearId: string,
    signal?: AbortSignal,
  ): Promise<TeacherGradeScale> {
    return parseTeacherGradeScale(
      await this.api.request<unknown>(
        `/academic-years/${encodeURIComponent(academicYearId)}/grade-scale`,
        {},
        signal,
      ),
    );
  }

  async saveGradeScale(academicYearId: string, bands: TeacherGradeBand[]) {
    return parseTeacherGradeScale(
      await this.api.request<unknown>(
        `/academic-years/${encodeURIComponent(academicYearId)}/grade-scale`,
        { method: "PUT", body: JSON.stringify({ bands }) },
      ),
    );
  }

  async getNotifications(signal?: AbortSignal): Promise<TeacherNotifications> {
    return parseTeacherNotifications(
      await this.api.request<unknown>("/notifications", {}, signal),
    );
  }

  async markNotificationRead(id: string): Promise<void> {
    const response = await this.api.request<unknown>(
      `/notifications/${encodeURIComponent(id)}/read`,
      { method: "PATCH" },
    );
    if (!isRecord(response) || response.success !== true) {
      throw new ApiError("The Dashify service did not confirm the notification update.", 502);
    }
  }

  async markAllNotificationsRead(): Promise<number> {
    const response = await this.api.request<unknown>("/notifications/read-all", {
      method: "PATCH",
    });
    if (
      !isRecord(response) ||
      response.success !== true ||
      typeof response.updatedCount !== "number" ||
      !Number.isSafeInteger(response.updatedCount) ||
      response.updatedCount < 0
    ) {
      throw new ApiError("The Dashify service did not confirm notification updates.", 502);
    }
    return response.updatedCount;
  }

  async getTeacherAssignments(
    signal?: AbortSignal,
  ): Promise<TeacherAssignment[]> {
    const response = await this.api.request<unknown>(
      "/staff/teacher-assignments",
      {},
      signal,
    );
    if (!Array.isArray(response)) {
      throw new ApiError("The Dashify service returned invalid teacher assignments.", 502);
    }
    return response.map(parseTeacherAssignment);
  }

  async assignTeacher(input: AssignTeacherInput): Promise<TeacherAssignment> {
    return parseTeacherAssignment(
      await this.api.request<unknown>("/staff/teacher-assignments", {
        method: "POST",
        body: JSON.stringify(input),
      }),
    );
  }

  async getOverview(role: SchoolRole, signal?: AbortSignal): Promise<SchoolOverview> {
    if (role === "school_admin") {
      const response = await this.api.request<unknown>("/dashboard", {}, signal);
      return parseSchoolAdminDashboard(response);
    }
    if (role === "principal") {
      const response = await this.api.request<unknown>(
        "/dashboard/principal",
        {},
        signal,
      );
      return parsePrincipalDashboard(response);
    }
    throw new ApiError("Dashboard data is not available for this role yet.", 501);
  }

  getPortalOverview(role: PortalRole, signal?: AbortSignal): Promise<PortalOverview> {
    return this.api.request(`/school/portal-dashboard?role=${encodeURIComponent(role)}`, {}, signal);
  }

  async getStudents(page = 1, pageSize = 20, signal?: AbortSignal): Promise<StudentPage> {
    const response = await this.api.request<unknown>(
      `/students?page=${page}&pageSize=${pageSize}`,
      {},
      signal,
    );
    return parseStudentPage(response);
  }

  async searchStudents(input: StudentDirectorySearch, signal?: AbortSignal): Promise<StudentPage> {
    const response = await this.api.request<unknown>(
      "/students/search",
      { method: "POST", body: JSON.stringify(input) },
      signal,
    );
    return parseStudentPage(response, true);
  }

  async getStudent(id: string, signal?: AbortSignal): Promise<Student> {
    const response = await this.api.request<unknown>(
      `/students/${encodeURIComponent(id)}`,
      {},
      signal,
    );
    return parseStudent(response, "unique-active");
  }

  async createStudent(input: StudentCreateInput): Promise<Student> {
    const response = await this.api.request<unknown>("/students", {
      method: "POST",
      body: JSON.stringify(input),
    });
    return parseStudent(response);
  }

  async admitStudent(input: StudentAdmissionInput): Promise<Student> {
    const response = await this.api.request<unknown>("/students", {
      method: "POST", body: JSON.stringify(input),
    });
    return parseStudent(response, "unique-active");
  }

  async getAdmissionSettings(signal?: AbortSignal): Promise<{ prefix: string }> {
    return this.parseAdmissionSettings(await this.api.request<unknown>("/schools/current/admission-settings", {}, signal));
  }

  async updateAdmissionSettings(prefix: string): Promise<{ prefix: string }> {
    return this.parseAdmissionSettings(await this.api.request<unknown>("/schools/current/admission-settings", {
      method: "PATCH", body: JSON.stringify({ prefix }),
    }));
  }

  private parseAdmissionSettings(response: unknown): { prefix: string } {
    if (!isRecord(response) || typeof response.prefix !== "string" || !response.prefix.trim()) {
      throw new ApiError("The Dashify service returned invalid admission settings.", 502);
    }
    return { prefix: response.prefix };
  }

  async updateStudent(id: string, input: StudentInput): Promise<Student> {
    const response = await this.api.request<unknown>(`/students/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    });
    return parseStudent(response);
  }

  async getAcademicYears(signal?: AbortSignal): Promise<AcademicYear[]> {
    const response = await this.api.request<unknown>("/academic-years", {}, signal);
    if (!Array.isArray(response)) {
      throw new ApiError("The Dashify service returned invalid academic-year data.", 502);
    }

    return response.map((item, index) => {
      if (
        !isRecord(item) ||
        typeof item.id !== "string" ||
        typeof item.name !== "string" ||
        typeof item.startDate !== "string" ||
        typeof item.endDate !== "string" ||
        typeof item.status !== "string"
      ) {
        throw new ApiError(`The Dashify service returned invalid academic year ${index + 1}.`, 502);
      }
      return {
        id: item.id,
        name: item.name,
        startDate: item.startDate,
        endDate: item.endDate,
        status: item.status,
      };
    });
  }

  async createAcademicYear(input: CreateAcademicYearInput): Promise<AcademicYear> {
    const response = await this.api.request<unknown>("/academic-years", {
      method: "POST",
      body: JSON.stringify(input),
    });
    if (
      !isRecord(response) ||
      typeof response.id !== "string" ||
      typeof response.name !== "string" ||
      typeof response.startDate !== "string" ||
      typeof response.endDate !== "string" ||
      typeof response.status !== "string"
    ) {
      throw new ApiError("The Dashify service returned invalid academic-year data.", 502);
    }
    return {
      id: response.id,
      name: response.name,
      startDate: response.startDate,
      endDate: response.endDate,
      status: response.status,
    };
  }

  async getStaff(signal?: AbortSignal): Promise<StaffMember[]> {
    const response = await this.api.request<unknown>("/staff", {}, signal);
    if (!Array.isArray(response)) {
      throw new ApiError("The Dashify service returned invalid staff data.", 502);
    }
    return response.map(parseStaffMember);
  }

  async getAnnouncements(
    includeDrafts = false,
    signal?: AbortSignal,
  ): Promise<Announcement[]> {
    const response = await this.api.request<unknown>(
      includeDrafts ? "/announcements/manage" : "/announcements",
      {},
      signal,
    );
    return parseAnnouncements(response);
  }

  async createAnnouncement(
    input: CreateAnnouncementInput,
  ): Promise<Announcement> {
    const response = await this.api.request<unknown>("/announcements", {
      method: "POST",
      body: JSON.stringify(input),
    });
    return parseAnnouncement(response);
  }

  async publishAnnouncement(id: string): Promise<Announcement> {
    const response = await this.api.request<unknown>(
      `/announcements/${encodeURIComponent(id)}/publish`,
      { method: "POST" },
    );
    return parseAnnouncement(response);
  }

  async createStaff(input: CreateStaffInput): Promise<StaffMember> {
    const response = await this.api.request<unknown>("/staff", {
      method: "POST",
      body: JSON.stringify(input),
    });
    return parseStaffMember(response);
  }

  async createTeacherAccount(input: CreateTeacherAccountInput): Promise<StaffMember> {
    const response = await this.api.request<unknown>("/staff/teacher-accounts", {
      method: "POST", body: JSON.stringify(input),
    });
    return parseStaffMember(response);
  }

  async getDepartments(signal?: AbortSignal): Promise<StaffDepartment[]> {
    const response = await this.api.request<unknown>("/departments", {}, signal);
    if (!Array.isArray(response)) throw new ApiError("The Dashify service returned invalid department data.", 502);
    return response.map(parseDepartment);
  }

  async createDepartment(name: string): Promise<StaffDepartment> {
    return parseDepartment(await this.api.request<unknown>("/departments", {
      method: "POST", body: JSON.stringify({ name }),
    }));
  }

  async updateDepartment(id: string, input: { name?: string; isActive?: false }): Promise<StaffDepartment> {
    return parseDepartment(await this.api.request<unknown>(`/departments/${encodeURIComponent(id)}`, {
      method: "PATCH", body: JSON.stringify(input),
    }));
  }

  async updateStaff(
    id: string,
    input: UpdateStaffInput,
  ): Promise<StaffMember> {
    const response = await this.api.request<unknown>(
      `/staff/${encodeURIComponent(id)}`,
      { method: "PATCH", body: JSON.stringify(input) },
    );
    return parseStaffMember(response);
  }

  async deactivateStaff(id: string): Promise<void> {
    await this.api.request<unknown>(
      `/staff/${encodeURIComponent(id)}/deactivate`,
      { method: "POST" },
    );
  }

  async getClassrooms(signal?: AbortSignal): Promise<Classroom[]> {
    const response = await this.api.request<unknown>("/classes", {}, signal);
    return parseAcademicClasses(response);
  }

  async createClassroom(input: CreateClassroomInput): Promise<Classroom> {
    const response = await this.api.request<unknown>("/classes", {
      method: "POST",
      body: JSON.stringify(input),
    });
    return parseCreatedClassroom(response);
  }

  async createClassroomWithSection(input: CreateClassroomWithSectionInput): Promise<Classroom> {
    const response = await this.api.request<unknown>("/classes/with-section", {
      method: "POST",
      body: JSON.stringify(input),
    });
    const [classroom] = parseAcademicClasses([response]);
    if (classroom.sections.length !== 1) {
      throw new ApiError("The Dashify service returned invalid created-class data.", 502);
    }
    return classroom;
  }

  async createAcademicSection(
    input: CreateAcademicSectionInput,
  ): Promise<AcademicSection> {
    const response = await this.api.request<unknown>("/sections", {
      method: "POST",
      body: JSON.stringify(input),
    });
    return parseAcademicSection(response);
  }

  async updateClassroom(id: string, input: UpdateClassroomInput): Promise<Classroom> {
    const response = await this.api.request<unknown>(`/classes/${encodeURIComponent(id)}`, {
      method: "PUT", body: JSON.stringify(input),
    });
    const [classroom] = parseAcademicClasses([response]);
    if (classroom.id !== id) throw new ApiError("The Dashify service returned a different class.", 502);
    return classroom;
  }

  async updateAcademicSection(classId: string, sectionId: string, input: UpdateAcademicSectionInput): Promise<AcademicSection> {
    const response = await this.api.request<unknown>(
      `/classes/${encodeURIComponent(classId)}/sections/${encodeURIComponent(sectionId)}`,
      { method: "PUT", body: JSON.stringify(input) },
    );
    const section = parseAcademicSection(response);
    if (section.id !== sectionId) throw new ApiError("The Dashify service returned a different section.", 502);
    return section;
  }

  getSchools(signal?: AbortSignal): Promise<School[]> {
    return this.api.request("/schools", {}, signal);
  }

  async getPlatformSchools(signal?: AbortSignal): Promise<PlatformSchool[]> {
    return parsePlatformSchools(
      await this.api.request<unknown>("/platform/schools", {}, signal),
    );
  }

  async getPlatformSchool(id: string, signal?: AbortSignal): Promise<PlatformSchoolDetail | null> {
    let response: unknown;
    try {
      response = await this.api.request<unknown>(`/platform/schools/${encodeURIComponent(id)}`, {}, signal);
    } catch (error) {
      if (error instanceof ApiError && error.status === 404 && error.message === "School not found") return null;
      throw error;
    }
    if (!isRecord(response) || !(response.onboardingState === null || response.onboardingState === "NOT_STARTED" || response.onboardingState === "COMPLETED")) {
      throw new ApiError("The Dashify service returned invalid onboarding data.", 502);
    }
    const school = parsePlatformSchools([response])[0];
    if (school.id.toLowerCase() !== id.toLowerCase()) {
      throw new ApiError("The Dashify service returned a different school.", 502);
    }
    return { ...school, onboardingState: response.onboardingState };
  }

  async createPlatformSchool(input: CreatePlatformSchoolInput): Promise<CreatedPlatformSchool> {
    const response = await this.api.request<unknown>("/platform/schools", {
      method: "POST",
      body: JSON.stringify(input),
    });
    if (!isRecord(response) || response.onboardingState !== "NOT_STARTED") {
      throw new ApiError("The Dashify service returned invalid onboarding data.", 502);
    }
    return { ...parsePlatformSchools([response])[0], onboardingState: response.onboardingState };
  }

  getAttendance(signal?: AbortSignal): Promise<AttendanceRecord[]> {
    return this.api.request("/school/attendance", {}, signal);
  }

  async getAttendanceReport(
    fromDate: string,
    toDate: string,
    signal?: AbortSignal,
  ): Promise<AttendanceReport> {
    const query = new URLSearchParams({ fromDate, toDate });
    const response = await this.api.request<unknown>(
      `/reports/attendance?${query.toString()}`,
      {},
      signal,
    );
    return parseAttendanceReport(response, fromDate, toDate);
  }

  async getAttendanceSessions(date: string, signal?: AbortSignal): Promise<AttendanceSession[]> {
    const response = await this.api.request<unknown>(
      `/attendance/sessions?date=${encodeURIComponent(date)}`,
      {},
      signal,
    );
    if (!Array.isArray(response)) {
      throw new ApiError("The Dashify service returned invalid attendance data.", 502);
    }
    return response.map(parseAttendanceSession);
  }

  async getAttendanceRoster(
    sessionId: string,
    signal?: AbortSignal,
  ): Promise<AttendanceRosterStudent[]> {
    const response = await this.api.request<unknown>(
      `/attendance/sessions/${encodeURIComponent(sessionId)}/roster`,
      {},
      signal,
    );
    if (!Array.isArray(response)) {
      throw new ApiError("The Dashify service returned invalid attendance roster data.", 502);
    }
    return response.map((item, index) => {
      if (
        !isRecord(item) ||
        typeof item.id !== "string" ||
        typeof item.firstName !== "string" ||
        typeof item.admissionNumber !== "string" ||
        (item.lastName !== null && typeof item.lastName !== "string") ||
        (item.record !== null && !isRecord(item.record))
      ) {
        throw new ApiError(`The Dashify service returned invalid roster student ${index + 1}.`, 502);
      }
      const record = item.record === null
        ? null
        : parseAttendanceRecord(item.record);
      return {
        id: item.id,
        name: `${item.firstName} ${item.lastName ?? ""}`.trim(),
        admissionNumber: item.admissionNumber,
        record,
      };
    });
  }

  async createAttendanceSession(input: {
    classId: string;
    sectionId: string;
    date: string;
  }): Promise<AttendanceSession> {
    const response = await this.api.request<unknown>("/attendance/sessions", {
      method: "POST",
      body: JSON.stringify(input),
    });
    return parseAttendanceSession(response);
  }

  markAttendance(
    sessionId: string,
    input: MarkAttendanceInput,
  ): Promise<{ success: boolean; count: number }> {
    return this.api.request(`/attendance/sessions/${encodeURIComponent(sessionId)}/records`, {
      method: "PUT",
      body: JSON.stringify(input),
    });
  }

  closeAttendanceSession(sessionId: string): Promise<{ success: boolean }> {
    return this.api.request(`/attendance/sessions/${encodeURIComponent(sessionId)}/close`, {
      method: "POST",
    });
  }

  getReports(signal?: AbortSignal): Promise<AcademicReport[]> {
    return this.api.request("/school/reports", {}, signal);
  }

  getFees(signal?: AbortSignal): Promise<FeeRecord[]> {
    return this.api.request("/school/fees", {}, signal);
  }

  getAssignments(signal?: AbortSignal): Promise<Assignment[]> {
    return this.api.request("/school/assignments", {}, signal);
  }

  getSettings(signal?: AbortSignal): Promise<SchoolSettingsData> {
    return this.api.request("/school/settings", {}, signal);
  }

  updateSettings(settings: SchoolSettingsData): Promise<SchoolSettingsData> {
    return this.api.request("/school/settings", {
      method: "PUT",
      body: JSON.stringify(settings),
    });
  }

  async getSchoolProfile(signal?: AbortSignal): Promise<SchoolProfile> {
    return parseSchoolProfile(await this.api.request<unknown>("/schools/current", {}, signal));
  }

  async updateSchoolProfile(profile: UpdateSchoolProfileInput): Promise<SchoolProfile> {
    return parseSchoolProfile(await this.api.request<unknown>("/schools/current", {
      method: "PATCH",
      body: JSON.stringify(profile),
    }));
  }
}
