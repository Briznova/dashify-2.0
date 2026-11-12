import type {
  AcademicYear,
  AttendanceRosterStudent,
  AttendanceSession,
  CreateAcademicYearInput,
  AcademicReport,
  Assignment,
  AttendanceRecord,
  Classroom,
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
  StudentInput,
  StudentPage,
  SchoolProfile,
  UpdateSchoolProfileInput,
  MarkAttendanceInput,
} from "@/types/school";

export interface SchoolService {
  getOverview(role: SchoolRole, signal?: AbortSignal): Promise<SchoolOverview>;
  getPortalOverview(role: PortalRole, signal?: AbortSignal): Promise<PortalOverview>;
  getStudents(page?: number, pageSize?: number, signal?: AbortSignal): Promise<StudentPage>;
  getStudent(id: string, signal?: AbortSignal): Promise<Student>;
  createStudent(input: StudentCreateInput): Promise<Student>;
  updateStudent(id: string, input: StudentInput): Promise<Student>;
  getAcademicYears(signal?: AbortSignal): Promise<AcademicYear[]>;
  createAcademicYear(input: CreateAcademicYearInput): Promise<AcademicYear>;
  getStaff(signal?: AbortSignal): Promise<StaffMember[]>;
  getClassrooms(signal?: AbortSignal): Promise<Classroom[]>;
  getSchools(signal?: AbortSignal): Promise<School[]>;
  getAttendance(signal?: AbortSignal): Promise<AttendanceRecord[]>;
  getAttendanceSessions(date: string, signal?: AbortSignal): Promise<AttendanceSession[]>;
  getAttendanceRoster(sessionId: string, signal?: AbortSignal): Promise<AttendanceRosterStudent[]>;
  createAttendanceSession(input: { classId: string; sectionId: string; date: string }): Promise<AttendanceSession>;
  markAttendance(sessionId: string, input: MarkAttendanceInput): Promise<{ success: boolean; count: number }>;
  closeAttendanceSession(sessionId: string): Promise<{ success: boolean }>;
  getReports(signal?: AbortSignal): Promise<AcademicReport[]>;
  getFees(signal?: AbortSignal): Promise<FeeRecord[]>;
  getAssignments(signal?: AbortSignal): Promise<Assignment[]>;
  getSettings(signal?: AbortSignal): Promise<SchoolSettingsData>;
  updateSettings(settings: SchoolSettingsData): Promise<SchoolSettingsData>;
  getSchoolProfile(signal?: AbortSignal): Promise<SchoolProfile>;
  updateSchoolProfile(profile: UpdateSchoolProfileInput): Promise<SchoolProfile>;
}
