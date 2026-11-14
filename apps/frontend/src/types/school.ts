import type { IconName } from "@/components/ui/icon";

export type SchoolRole = "super_admin" | "school_admin" | "principal";
export type PortalRole = "teacher" | "accountant" | "parent" | "student";

export type SchoolMetric = {
  label: string;
  value: string;
  change: string;
  positive: boolean;
  icon: IconName;
  tone: "blue" | "violet" | "green" | "orange";
};

export type DashboardMetric = Omit<SchoolMetric, "change" | "positive"> & {
  change?: string;
  positive?: boolean;
};

export type EnrollmentPoint = {
  month: string;
  students: number;
};

export type PendingApproval = {
  id: string;
  studentName: string;
  grade: string;
  submittedAt: string;
  status: "Pending review" | "Needs information";
};

export type SchoolEvent = {
  id: string;
  title: string;
  date: string;
  time: string;
  type: "Academic" | "School" | "Meeting";
};

export type Announcement = {
  id: string;
  title: string;
  body: string;
  status: "DRAFT" | "PUBLISHED";
  publishedAt: string | null;
  createdAt: string;
};

export type CreateAnnouncementInput = {
  title: string;
  body: string;
};

export type SchoolOverview = {
  role: SchoolRole;
  schoolName: string;
  localDate?: string;
  metrics: DashboardMetric[];
  enrollment: EnrollmentPoint[];
  pendingApprovals: PendingApproval[];
  upcomingEvents: SchoolEvent[];
};

export type TeacherDashboard = {
  schoolId: string;
  schoolName: string;
  localDate: string;
  academicYearId: string | null;
  academicYearName: string | null;
  academicYearStatus: AcademicYear["status"] | null;
  assignments: TeacherDashboardAssignment[];
};

export type TeacherAcademicYear = Pick<
  AcademicYear,
  "id" | "name" | "startDate" | "endDate" | "status"
>;

export type TeacherDashboardAssignment = {
  id: string;
  classId: string;
  className: string;
  sectionId: string;
  sectionName: string;
  subject: string | null;
  studentCount: number | null;
  isClassTeacher: boolean;
  classTeacherName: string | null;
  sessionStatus: "DRAFT" | "SUBMITTED" | "OPEN" | "CLOSED" | null;
  unmarkedCount: number | null;
};

export type TeacherSection = {
  id: string;
  name: string;
  classId: string;
  className: string;
  subject: string | null;
  isClassTeacher: boolean;
  classTeacherName: string | null;
  studentCount: number | null;
};

export type TeacherSections = {
  academicYear: Pick<AcademicYear, "id" | "name" | "status"> | null;
  sections: TeacherSection[];
};

export type TeacherAttendanceStatus =
  AttendanceSessionRecord["status"];
export type TeacherAttendanceSessionStatus =
  | "DRAFT"
  | "SUBMITTED"
  | "OPEN"
  | "CLOSED";

export type TeacherAttendanceStudent = {
  studentId: string;
  rollNumber: string | null;
  name: string;
  status: TeacherAttendanceStatus | null;
  remarks: string | null;
};

export type TeacherAttendance = {
  academicYear: Pick<AcademicYear, "id" | "name" | "status">;
  section: Pick<TeacherSection, "id" | "name" | "classId" | "className">;
  date: string;
  status: TeacherAttendanceSessionStatus | null;
  canEdit: boolean;
  students: TeacherAttendanceStudent[];
};

export type TeacherAssessmentType = "ASSIGNMENT" | "EXAM" | "TEST";
export type TeacherAssessmentStatus = "DRAFT" | "PUBLISHED";

export type TeacherAssessment = {
  id: string;
  sectionId: string;
  type: TeacherAssessmentType;
  status: TeacherAssessmentStatus;
  title: string;
  description: string | null;
  dueDate: string;
  startTime: string | null;
  durationMinutes: number | null;
  maxScore: number;
  passMark: number | null;
  academicYearId: string | null;
  publishedAt: string | null;
  resultsStatus: "DRAFT" | "PUBLISHED";
  className: string;
  sectionName: string;
  resultCount: number;
};

export type TeacherAssessmentResults = {
  assessment: Pick<
    TeacherAssessment,
    "id"
    | "title"
    | "type"
    | "dueDate"
    | "startTime"
    | "durationMinutes"
    | "maxScore"
    | "passMark"
    | "academicYearId"
    | "resultsStatus"
    | "className"
    | "sectionName"
  > & {
    academicYearName: string;
    resultsPublishedAt: string | null;
    gradesConfigured: boolean;
  };
  students: {
    studentId: string;
    rollNumber: string | null;
    name: string;
    score: number | null;
    feedback: string | null;
    updatedAt: string | null;
    passed: boolean | null;
    grade: string | null;
  }[];
};

export type TeacherGradeBand = {
  id?: string;
  label: string;
  minPercent: number;
  maxPercent: number;
};

export type TeacherGradeScale = {
  academicYearId: string;
  academicYearName: string;
  bands: TeacherGradeBand[];
};

export type TeacherNotification = {
  id: string;
  type: "GENERAL" | "ATTENDANCE" | "FEE" | "ANNOUNCEMENT" | "SYSTEM";
  title: string;
  body: string;
  readAt: string | null;
  createdAt: string;
};

export type TeacherNotifications = {
  notifications: TeacherNotification[];
  unreadCount: number;
};

export type Student = {
  id: string;
  name: string;
  studentNumber: string;
  grade: string;
  guardian: string | null;
  attendance: string | null;
  status: "Active" | "Inactive" | "Pending" | "On leave" | "Archived";
  firstName?: string;
  middleName?: string | null;
  lastName?: string | null;
  dateOfBirth?: string | null;
  gender?: string | null;
  admissionDate?: string;
  academicYearName?: string | null;
  academicYearId?: string | null;
  className?: string | null;
  classId?: string | null;
  sectionName?: string | null;
  sectionId?: string | null;
  guardians?: StudentGuardian[];
  address?: StudentAddress | null;
  emergencyContact?: { kind: "PRIMARY_GUARDIAN" } | { kind: "OTHER"; name: string; phone: string } | null;
  rollNumber?: string | null;
};

export type StudentAddress = {
  line1?: string;
  city?: string;
  state?: string;
  postalCode?: string;
};

export type StudentAdmissionInput = {
  firstName: string;
  middleName?: string;
  lastName: string;
  dateOfBirth: string;
  gender?: "MALE" | "FEMALE" | "OTHER" | "PREFER_NOT_TO_SAY";
  admissionDate: string;
  academicYearId: string;
  classId: string;
  sectionId: string;
  guardians: StudentGuardianInput[];
  emergencyContact: { kind: "PRIMARY_GUARDIAN" } | { kind: "OTHER"; name: string; phone: string };
  address?: StudentAddress;
  rollNumber?: string;
};

export type StudentGuardian = {
  id: string;
  name: string;
  relationship: string;
  phone: string;
  email: string | null;
  isPrimary: boolean;
};

export type StudentPage = {
  data: Student[];
  meta: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
};

export type StudentDirectorySearch = {
  page: number;
  pageSize: number;
  query?: string;
  academicYearId?: string;
  classId?: string;
  sectionId?: string;
  status?: "ACTIVE" | "INACTIVE";
};

export type StudentGuardianInput = {
  id?: string;
  firstName: string;
  lastName?: string;
  relationship: "FATHER" | "MOTHER" | "GUARDIAN" | "GRANDPARENT" | "OTHER";
  phone: string;
  email?: string;
  isPrimary: boolean;
};

export type StudentCreateInput = {
  admissionNumber: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  dateOfBirth?: string;
  gender?: "MALE" | "FEMALE" | "OTHER" | "PREFER_NOT_TO_SAY";
  admissionDate: string;
  academicYearId: string;
  classId: string;
  sectionId: string;
  guardians: StudentGuardianInput[];
};

export type StudentInput = Partial<StudentCreateInput> & {
  name?: string;
  studentNumber?: string;
  grade?: string;
  guardian?: string;
};

export type AcademicYear = {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  status: "DRAFT" | "ACTIVE" | "COMPLETED";
};

export type CreateAcademicYearInput = Pick<AcademicYear, "name" | "startDate" | "endDate">;

export type SchoolProfile = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  timezone: string;
  locale: string;
};

export type UpdateSchoolProfileInput = Omit<SchoolProfile, "id">;

export type AttendanceSession = {
  id: string;
  classId: string;
  sectionId: string;
  date: string;
  status: "OPEN" | "CLOSED";
  records: AttendanceSessionRecord[];
};

export type AttendanceSessionRecord = {
  studentId: string;
  status: "PRESENT" | "ABSENT" | "LATE" | "EXCUSED";
  remarks: string | null;
  markedAt: string | null;
};

export type AttendanceReport = {
  fromDate: string;
  toDate: string;
  totalSessions: number;
  totalRecords: number;
  statusCounts: Record<AttendanceSessionRecord["status"], number>;
  dailyBreakdown: {
    date: string;
    totalSessions: number;
    totalRecords: number;
    statusCounts: Record<AttendanceSessionRecord["status"], number>;
  }[];
};

export type AttendanceRosterStudent = {
  id: string;
  name: string;
  admissionNumber: string;
  record: AttendanceSessionRecord | null;
};

export type MarkAttendanceInput = {
  records: {
    studentId: string;
    status: AttendanceSessionRecord["status"];
    remarks?: string;
  }[];
};

export type StaffMember = {
  id: string;
  name: string;
  email: string;
  position: string;
  department: string;
  status: "Active" | "Inactive" | "On leave";
  employeeCode?: string | null;
  firstName?: string;
  lastName?: string | null;
  phone?: string | null;
  departmentId?: string | null;
};

export type TeacherAssignment = {
  id: string;
  staffId: string;
  classId: string;
  sectionId: string | null;
  subject: string | null;
  isClassTeacher: boolean;
  staffName: string;
  className: string;
  sectionName: string | null;
};

export type AssignTeacherInput = {
  staffId: string;
  classId: string;
  sectionId?: string;
  subject?: string;
  isClassTeacher: boolean;
};

export type StaffDepartment = {
  id: string;
  name: string;
  isActive: boolean;
};

export type CreateTeacherAccountInput = {
  employeeCode: string;
  firstName: string;
  lastName?: string;
  email: string;
  password: string;
  phone?: string;
  departmentId?: string;
};

export type CreateStaffInput = {
  employeeCode: string;
  firstName: string;
  lastName?: string;
  email?: string;
  phone?: string;
  designation?: string;
  department?: string;
  accountEmail?: string;
};

export type UpdateStaffInput = Partial<Omit<CreateStaffInput, "accountEmail">> & {
  departmentId?: string | null;
};

export type Classroom = {
  id: string;
  name: string;
  code: string;
  sortOrder: number;
  isActive: boolean;
  sections: AcademicSection[];
};

export type CreateClassroomInput = Pick<Classroom, "name" | "code"> & {
  sortOrder?: number;
};

export type UpdateClassroomInput = Pick<Classroom, "name" | "code" | "sortOrder">;

export type AcademicSection = {
  id: string;
  name: string;
  code: string;
  capacity: number | null;
  isActive: boolean;
};

export type CreateAcademicSectionInput = Pick<
  AcademicSection,
  "name" | "code"
> & {
  classId: string;
  capacity?: number;
};

export type CreateClassroomWithSectionInput = CreateClassroomInput & {
  section: Omit<CreateAcademicSectionInput, "classId">;
};

export type UpdateAcademicSectionInput = Pick<AcademicSection, "name" | "code" | "capacity">;

export type School = {
  id: string;
  name: string;
  location: string;
  principal: string;
  students: number;
  staff: number;
  status: "Active" | "Setup in progress";
};

export type PlatformSchool = {
  id: string;
  name: string;
  code: string;
  isActive: boolean;
  createdAt: string;
};

export type CreatePlatformSchoolInput = {
  name: string;
  code: string;
};

export type PlatformSchoolDetail = PlatformSchool & {
  onboardingState: "NOT_STARTED" | "COMPLETED" | null;
};

export type CreatedPlatformSchool = PlatformSchoolDetail & {
  onboardingState: "NOT_STARTED";
};

export type AttendanceRecord = {
  id: string;
  date: string;
  grade: string;
  present: number;
  absent: number;
  late: number;
  rate: string;
};

export type AcademicReport = {
  id: string;
  title: string;
  category: string;
  updatedAt: string;
  owner: string;
};

export type SchoolSettingsData = {
  schoolName: string;
  email: string;
  schoolType: "private" | "public" | "charter";
  academicYear: "2026-27" | "2025-26";
  enrollmentNotifications: boolean;
  attendanceNotifications: boolean;
};

export type PortalAction = {
  id: string;
  title: string;
  description: string;
  meta: string;
  status: string;
};

export type PortalOverview = {
  role: PortalRole;
  greeting: string;
  schoolName: string;
  metrics: SchoolMetric[];
  primaryTitle: string;
  primaryDescription: string;
  primaryItems: PortalAction[];
  secondaryTitle: string;
  secondaryItems: PortalAction[];
};

export type FeeRecord = {
  id: string;
  studentName: string;
  studentNumber: string;
  grade: string;
  invoiceNumber: string;
  amount: number;
  dueDate: string;
  status: "Paid" | "Pending" | "Overdue";
};

export type Assignment = {
  id: string;
  title: string;
  subject: string;
  className: string;
  dueDate: string;
  submissions: string;
  status: "Published" | "Due soon" | "Draft";
};
