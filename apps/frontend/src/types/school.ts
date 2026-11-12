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

export type SchoolOverview = {
  role: SchoolRole;
  schoolName: string;
  metrics: SchoolMetric[];
  enrollment: EnrollmentPoint[];
  pendingApprovals: PendingApproval[];
  upcomingEvents: SchoolEvent[];
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
  className?: string | null;
  sectionName?: string | null;
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
  guardians: {
    firstName: string;
    lastName?: string;
    relationship: "FATHER" | "MOTHER" | "GUARDIAN" | "GRANDPARENT" | "OTHER";
    phone: string;
    email?: string;
    isPrimary: boolean;
  }[];
};

export type StudentInput = {
  name: string;
  studentNumber: string;
  grade: string;
  guardian: string;
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
  status: "Active" | "On leave";
};

export type Classroom = {
  id: string;
  name: string;
  code: string;
  sortOrder: number;
  isActive: boolean;
  sections: AcademicSection[];
};

export type AcademicSection = {
  id: string;
  name: string;
  code: string;
  capacity: number | null;
  isActive: boolean;
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
