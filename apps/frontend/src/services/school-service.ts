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
  CreateClassroomWithSectionInput,
  CreateStaffInput,
  CreateTeacherAccountInput,
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
  StaffDepartment,
  Student,
  StudentCreateInput,
  StudentInput,
  StudentPage,
  StudentDirectorySearch,
  StudentAdmissionInput,
  SchoolProfile,
  TeacherDashboard,
  TeacherSection,
  TeacherAttendance,
  TeacherAssessment,
  TeacherAssessmentResults,
  TeacherAssessmentType,
  TeacherAcademicYear,
  TeacherSections,
  TeacherGradeBand,
  TeacherGradeScale,
  TeacherNotifications,
  TeacherAttendanceSessionStatus,
  TeacherAttendanceStatus,
  TeacherAssignment,
  AssignTeacherInput,
  UpdateStaffInput,
  UpdateSchoolProfileInput,
  UpdateClassroomInput,
  UpdateAcademicSectionInput,
  MarkAttendanceInput,
} from "@/types/school";

export interface SchoolService {
  getOverview(role: SchoolRole, signal?: AbortSignal): Promise<SchoolOverview>;
  getTeacherAcademicYears(signal?: AbortSignal): Promise<TeacherAcademicYear[]>;
  getTeacherDashboard(academicYearId?: string, signal?: AbortSignal): Promise<TeacherDashboard>;
  getTeacherSections(academicYearId?: string, signal?: AbortSignal): Promise<TeacherSections>;
  getTeacherAttendance(academicYearId: string, sectionId: string, date: string, signal?: AbortSignal): Promise<TeacherAttendance>;
  saveTeacherAttendanceDraft(input: {
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
  }>;
  submitTeacherAttendance(input: {
    academicYearId: string;
    sectionId: string;
    date: string;
  }): Promise<{ sessionId: string; sectionId: string; date: string; recordCount: number; status: TeacherAttendanceSessionStatus }>;
  getTeacherAssessments(academicYearId?: string, sectionId?: string, signal?: AbortSignal): Promise<TeacherAssessment[]>;
  createTeacherAssessment(input: {
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
  }): Promise<TeacherAssessment>;
  publishTeacherAssessment(id: string): Promise<TeacherAssessment>;
  getTeacherResults(assessmentId: string, signal?: AbortSignal): Promise<TeacherAssessmentResults>;
  saveTeacherResults(
    assessmentId: string,
    input: {
      records: {
        studentId: string;
        score: number;
        feedback?: string;
      }[];
    },
  ): Promise<{ assessmentId: string; savedCount: number }>;
  publishTeacherResults(assessmentId: string): Promise<{ assessmentId: string; resultsStatus: "PUBLISHED"; publishedCount: number }>;
  getGradeScale(academicYearId: string, signal?: AbortSignal): Promise<TeacherGradeScale>;
  saveGradeScale(academicYearId: string, bands: TeacherGradeBand[]): Promise<TeacherGradeScale>;
  getNotifications(signal?: AbortSignal): Promise<TeacherNotifications>;
  markNotificationRead(id: string): Promise<void>;
  markAllNotificationsRead(): Promise<number>;
  getTeacherAssignments(signal?: AbortSignal): Promise<TeacherAssignment[]>;
  assignTeacher(input: AssignTeacherInput): Promise<TeacherAssignment>;
  getPortalOverview(role: PortalRole, signal?: AbortSignal): Promise<PortalOverview>;
  getStudents(page?: number, pageSize?: number, signal?: AbortSignal): Promise<StudentPage>;
  searchStudents(input: StudentDirectorySearch, signal?: AbortSignal): Promise<StudentPage>;
  getStudent(id: string, signal?: AbortSignal): Promise<Student>;
  createStudent(input: StudentCreateInput): Promise<Student>;
  admitStudent(input: StudentAdmissionInput): Promise<Student>;
  getAdmissionSettings(signal?: AbortSignal): Promise<{ prefix: string }>;
  updateAdmissionSettings(prefix: string): Promise<{ prefix: string }>;
  updateStudent(id: string, input: StudentInput): Promise<Student>;
  getAcademicYears(signal?: AbortSignal): Promise<AcademicYear[]>;
  createAcademicYear(input: CreateAcademicYearInput): Promise<AcademicYear>;
  activateAcademicYear(id: string): Promise<AcademicYear>;
  completeAcademicYear(id: string): Promise<AcademicYear>;
  getStaff(signal?: AbortSignal): Promise<StaffMember[]>;
  getAnnouncements(includeDrafts?: boolean, signal?: AbortSignal): Promise<Announcement[]>;
  createAnnouncement(input: CreateAnnouncementInput): Promise<Announcement>;
  publishAnnouncement(id: string): Promise<Announcement>;
  createStaff(input: CreateStaffInput): Promise<StaffMember>;
  createTeacherAccount(input: CreateTeacherAccountInput): Promise<StaffMember>;
  updateStaff(id: string, input: UpdateStaffInput): Promise<StaffMember>;
  deactivateStaff(id: string): Promise<void>;
  getDepartments(signal?: AbortSignal): Promise<StaffDepartment[]>;
  createDepartment(name: string): Promise<StaffDepartment>;
  updateDepartment(id: string, input: { name?: string; isActive?: false }): Promise<StaffDepartment>;
  getClassrooms(signal?: AbortSignal): Promise<Classroom[]>;
  createClassroom(input: CreateClassroomInput): Promise<Classroom>;
  createClassroomWithSection(input: CreateClassroomWithSectionInput): Promise<Classroom>;
  createAcademicSection(input: CreateAcademicSectionInput): Promise<AcademicSection>;
  updateClassroom(id: string, input: UpdateClassroomInput): Promise<Classroom>;
  updateAcademicSection(classId: string, sectionId: string, input: UpdateAcademicSectionInput): Promise<AcademicSection>;
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
