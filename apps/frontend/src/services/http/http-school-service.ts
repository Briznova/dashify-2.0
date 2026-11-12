import { ApiError, type ApiClient } from "@/services/api-client";
import type { SchoolService } from "@/services/school-service";
import type {
  AcademicYear,
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
  CreateClassroomInput,
  DashboardMetric,
  FeeRecord,
  PortalOverview,
  PortalRole,
  School,
  SchoolOverview,
  SchoolRole,
  SchoolSettingsData,
  StaffMember,
  Student,
  StudentCreateInput,
  StudentGuardian,
  StudentInput,
  StudentPage,
  SchoolProfile,
  UpdateSchoolProfileInput,
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

function parseSchoolAdminDashboard(response: unknown): SchoolOverview {
  if (
    !isRecord(response) ||
    typeof response.schoolId !== "string" ||
    !response.schoolId.trim() ||
    typeof response.schoolName !== "string" ||
    !response.schoolName.trim()
  ) {
    throw new ApiError("The Dashify service returned invalid dashboard data.", 502);
  }

  const parseCount = (value: unknown) => {
    if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0) {
      throw new ApiError("The Dashify service returned invalid dashboard counts.", 502);
    }
    return value;
  };
  const metrics: DashboardMetric[] = [
    {
      label: "Active students",
      value: parseCount(response.activeStudentCount).toLocaleString(),
      icon: "users",
      tone: "blue",
    },
    {
      label: "Active staff",
      value: parseCount(response.activeStaffCount).toLocaleString(),
      icon: "graduationCap",
      tone: "violet",
    },
    {
      label: "Active classes",
      value: parseCount(response.activeClassCount).toLocaleString(),
      icon: "book",
      tone: "green",
    },
    {
      label: "Active sections",
      value: parseCount(response.activeSectionCount).toLocaleString(),
      icon: "layoutDashboard",
      tone: "orange",
    },
  ];

  return {
    role: "school_admin",
    schoolName: response.schoolName,
    metrics,
    enrollment: [],
    pendingApprovals: [],
    upcomingEvents: [],
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
  const lastName = typeof response.lastName === "string" ? response.lastName : "";
  const email = typeof response.email === "string"
    ? response.email
    : user && typeof user.email === "string"
      ? user.email
      : "";

  const designation = typeof response.designation === "string"
    ? response.designation
    : "Staff";
  const department = typeof response.department === "string"
    ? response.department
    : "General";
  const isActive = response.isActive !== false;

  return {
    id: response.id,
    name: `${firstName} ${lastName}`.trim() || email.split("@")[0] || "Staff member",
    email,
    position: designation,
    department,
    status: isActive ? "Active" : "On leave",
  };
}

function parseStudent(response: unknown): Student {
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
  const latest = enrolments.find(isRecord);
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
  };
}

function parseStudentPage(response: unknown): StudentPage {
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
    data: response.data.map(parseStudent),
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
    !isRecord(response.statusCounts)
  ) {
    throw new ApiError("The Dashify service returned invalid attendance report data.", 502);
  }

  const count = (value: unknown) => {
    if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0) {
      throw new ApiError("The Dashify service returned invalid attendance report counts.", 502);
    }
    return value;
  };
  const statusCounts = {
    PRESENT: count(response.statusCounts.PRESENT),
    ABSENT: count(response.statusCounts.ABSENT),
    LATE: count(response.statusCounts.LATE),
    EXCUSED: count(response.statusCounts.EXCUSED),
  };
  const totalSessions = count(response.totalSessions);
  const totalRecords = count(response.totalRecords);
  if (totalRecords !== Object.values(statusCounts).reduce((total, value) => total + value, 0)) {
    throw new ApiError("The Dashify service returned inconsistent attendance report totals.", 502);
  }

  return {
    fromDate,
    toDate,
    totalSessions,
    totalRecords,
    statusCounts,
  };
}

export class HttpSchoolService implements SchoolService {
  constructor(private readonly api: ApiClient) {}

  async getOverview(role: SchoolRole, signal?: AbortSignal): Promise<SchoolOverview> {
    if (role !== "school_admin") {
      throw new ApiError(
        "Dashboard data is not available for this role yet.",
        501,
      );
    }

    const response = await this.api.request<unknown>("/dashboard", {}, signal);
    return parseSchoolAdminDashboard(response);
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

  async getStudent(id: string, signal?: AbortSignal): Promise<Student> {
    const response = await this.api.request<unknown>(
      `/students/${encodeURIComponent(id)}`,
      {},
      signal,
    );
    return parseStudent(response);
  }

  async createStudent(input: StudentCreateInput): Promise<Student> {
    const response = await this.api.request<unknown>("/students", {
      method: "POST",
      body: JSON.stringify(input),
    });
    return parseStudent(response);
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

  async createAcademicSection(
    input: CreateAcademicSectionInput,
  ): Promise<AcademicSection> {
    const response = await this.api.request<unknown>("/sections", {
      method: "POST",
      body: JSON.stringify(input),
    });
    return parseAcademicSection(response);
  }

  getSchools(signal?: AbortSignal): Promise<School[]> {
    return this.api.request("/schools", {}, signal);
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
