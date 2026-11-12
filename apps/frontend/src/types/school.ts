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
  assignments: TeacherDashboardAssignment[];
};

export type TeacherDashboardAssignment = {
  id: string;
  classId: string;
  className: string;
  sectionId: string;
  sectionName: string;
  subject: string | null;
  sessionStatus: "OPEN" | "CLOSED" | null;
  unmarkedCount: number | null;
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
  status: string;
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

export type UpdateStaffInput = Partial<Omit<CreateStaffInput, "accountEmail">>;

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
