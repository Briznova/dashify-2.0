import type {
  AcademicYear,
  Announcement,
  AttendanceReport,
  AttendanceRosterStudent,
  AttendanceSession,
  CreateAcademicSectionInput,
  CreateAnnouncementInput,
  CreateAcademicYearInput,
  CreateClassroomInput,
  CreateStaffInput,
  CreatePlatformSchoolInput,
  CreatedPlatformSchool,
  AcademicReport,
  Assignment,
  AttendanceRecord,
  AcademicSection,
  Classroom,
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
  Student,
  StudentCreateInput,
  StudentInput,
  StudentPage,
  SchoolProfile,
  TeacherDashboard,
  UpdateStaffInput,
  UpdateSchoolProfileInput,
  MarkAttendanceInput,
} from "@/types/school";

export interface SchoolService {
  getOverview(role: SchoolRole, signal?: AbortSignal): Promise<SchoolOverview>;
  getTeacherDashboard(signal?: AbortSignal): Promise<TeacherDashboard>;
  getPortalOverview(role: PortalRole, signal?: AbortSignal): Promise<PortalOverview>;
  getStudents(page?: number, pageSize?: number, signal?: AbortSignal): Promise<StudentPage>;
  getStudent(id: string, signal?: AbortSignal): Promise<Student>;
  createStudent(input: StudentCreateInput): Promise<Student>;
  updateStudent(id: string, input: StudentInput): Promise<Student>;
  getAcademicYears(signal?: AbortSignal): Promise<AcademicYear[]>;
  createAcademicYear(input: CreateAcademicYearInput): Promise<AcademicYear>;
  getStaff(signal?: AbortSignal): Promise<StaffMember[]>;
  getAnnouncements(includeDrafts?: boolean, signal?: AbortSignal): Promise<Announcement[]>;
  createAnnouncement(input: CreateAnnouncementInput): Promise<Announcement>;
  publishAnnouncement(id: string): Promise<Announcement>;
  createStaff(input: CreateStaffInput): Promise<StaffMember>;
  updateStaff(id: string, input: UpdateStaffInput): Promise<StaffMember>;
  deactivateStaff(id: string): Promise<void>;
  getClassrooms(signal?: AbortSignal): Promise<Classroom[]>;
  createClassroom(input: CreateClassroomInput): Promise<Classroom>;
  createAcademicSection(input: CreateAcademicSectionInput): Promise<AcademicSection>;
  getSchools(signal?: AbortSignal): Promise<School[]>;
  getPlatformSchools(signal?: AbortSignal): Promise<PlatformSchool[]>;
  getPlatformSchool(id: string, signal?: AbortSignal): Promise<PlatformSchoolDetail | null>;
  createPlatformSchool(input: CreatePlatformSchoolInput): Promise<CreatedPlatformSchool>;
  getAttendance(signal?: AbortSignal): Promise<AttendanceRecord[]>;
  getAttendanceReport(fromDate: string, toDate: string, signal?: AbortSignal): Promise<AttendanceReport>;
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
