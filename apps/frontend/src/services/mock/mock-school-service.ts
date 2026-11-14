import type { SchoolService } from "@/services/school-service";
import type {
  AcademicYear,
  Announcement,
  AttendanceReport,
  AcademicSection,
  AcademicReport,
  AttendanceRosterStudent,
  AttendanceSession,
  CreateAcademicSectionInput,
  CreateAnnouncementInput,
  CreateAcademicYearInput,
  CreateClassroomInput,
  CreateClassroomWithSectionInput,
  UpdateClassroomInput,
  UpdateAcademicSectionInput,
  CreateStaffInput,
  Assignment,
  AttendanceRecord,
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
  SchoolProfile,
  TeacherDashboard,
  TeacherSection,
  TeacherAttendance,
  TeacherAttendanceStatus,
  TeacherAssessment,
  TeacherAssessmentResults,
  TeacherAssessmentType,
  TeacherAcademicYear,
  TeacherSections,
  TeacherGradeBand,
  TeacherGradeScale,
  TeacherNotifications,
  TeacherAssignment,
  AssignTeacherInput,
  UpdateStaffInput,
  UpdateSchoolProfileInput,
  MarkAttendanceInput,
  StaffMember,
  Student,
  StudentCreateInput,
  StudentInput,
  StudentPage,
} from "@/types/school";

const mockAnnouncements: Announcement[] = [
  {
    id: "announcement-1",
    title: "Welcome to the new term",
    body: "Classes begin Monday. Please check with your school office for the term schedule.",
    status: "PUBLISHED",
    publishedAt: "2026-04-03T08:00:00.000Z",
    createdAt: "2026-04-03T07:45:00.000Z",
  },
];

const teacherSections: TeacherSection[] = [
  {
    id: "SECTION-A",
    name: "Section A",
    classId: "CLASS-08",
    className: "Grade 8",
    subject: "Mathematics",
    isClassTeacher: true,
    classTeacherName: "Avery Johnson",
    studentCount: 3,
  },
];
const teacherRoster = [
  { studentId: "learner-001", rollNumber: "01", name: "Learner 01" },
  { studentId: "learner-002", rollNumber: "02", name: "Learner 02" },
  { studentId: "learner-003", rollNumber: "03", name: "Learner 03" },
];
const teacherAttendance = new Map<
  string,
  Map<string, { status: TeacherAttendanceStatus; remarks: string | null }>
>();
const teacherAttendanceStatuses = new Map<string, "DRAFT" | "SUBMITTED">();
let teacherAssessments: TeacherAssessment[] = [];
const teacherScores = new Map<
  string,
  Map<string, { score: number; feedback: string | null }>
>();
const mockGradeScales = new Map<string, TeacherGradeScale>();

function delay(signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException("The request was cancelled.", "AbortError"));
      return;
    }

    const onAbort = () => {
      window.clearTimeout(timer);
      reject(new DOMException("The request was cancelled.", "AbortError"));
    };
    const timer = window.setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, 260);
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

const students: Student[] = [
  { id: "stu-1042", name: "Olivia Bennett", studentNumber: "ST-1042", grade: "Grade 8", guardian: "Morgan Bennett", attendance: "96%", status: "Active" },
  { id: "stu-1038", name: "Noah Williams", studentNumber: "ST-1038", grade: "Grade 7", guardian: "Taylor Williams", attendance: "92%", status: "Active" },
  { id: "stu-1032", name: "Ava Thompson", studentNumber: "ST-1032", grade: "Grade 9", guardian: "Jordan Thompson", attendance: "88%", status: "Active" },
  { id: "stu-1026", name: "Liam Anderson", studentNumber: "ST-1026", grade: "Grade 6", guardian: "Casey Anderson", attendance: "—", status: "Pending" },
  { id: "stu-1019", name: "Sophia Martinez", studentNumber: "ST-1019", grade: "Grade 8", guardian: "Riley Martinez", attendance: "97%", status: "Active" },
  { id: "stu-1011", name: "Ethan Wilson", studentNumber: "ST-1011", grade: "Grade 5", guardian: "Alex Wilson", attendance: "84%", status: "On leave" },
];

const staff: StaffMember[] = [
  { id: "stf-201", name: "Avery Johnson", email: "avery.johnson@northstar.edu", position: "Principal", department: "Leadership", status: "Active" },
  { id: "stf-202", name: "Mia Robinson", email: "mia.robinson@northstar.edu", position: "Math teacher", department: "Mathematics", status: "Active" },
  { id: "stf-203", name: "Lucas Clark", email: "lucas.clark@northstar.edu", position: "Science teacher", department: "Science", status: "Active" },
  { id: "stf-204", name: "Isabella Lewis", email: "isabella.lewis@northstar.edu", position: "Counselor", department: "Student support", status: "On leave" },
];

const classrooms: Classroom[] = [
  { id: "CLS-06", name: "Grade 6", code: "G6", sortOrder: 6, isActive: true, sections: [{ id: "CLS-06C", name: "Section C", code: "C", capacity: 28, isActive: true }] },
  { id: "CLS-07", name: "Grade 7", code: "G7", sortOrder: 7, isActive: true, sections: [{ id: "CLS-07B", name: "Section B", code: "B", capacity: 28, isActive: true }] },
  { id: "CLS-08", name: "Grade 8", code: "G8", sortOrder: 8, isActive: true, sections: [{ id: "CLS-08A", name: "Section A", code: "A", capacity: 30, isActive: true }] },
  { id: "CLS-09", name: "Grade 9", code: "G9", sortOrder: 9, isActive: true, sections: [{ id: "CLS-09A", name: "Section A", code: "A", capacity: 26, isActive: true }] },
];

const academicYears: AcademicYear[] = [
  { id: "year-2026-27", name: "2026-2027", startDate: "2026-04-01", endDate: "2027-03-31", status: "ACTIVE" },
  { id: "year-2025-26", name: "2025-2026", startDate: "2025-04-01", endDate: "2026-03-31", status: "COMPLETED" },
];
const attendanceSessions: AttendanceSession[] = [];

const schools: School[] = [
  { id: "SCH-001", name: "Northstar Academy", location: "Portland, Oregon", principal: "Avery Johnson", students: 1284, staff: 86, status: "Active" },
  { id: "SCH-002", name: "Cedar Grove School", location: "Vancouver, Washington", principal: "Morgan Ellis", students: 942, staff: 64, status: "Active" },
  { id: "SCH-003", name: "Summit Preparatory", location: "Salem, Oregon", principal: "Riley Parker", students: 716, staff: 51, status: "Setup in progress" },
];

const attendance: AttendanceRecord[] = [
  { id: "ATT-221A", date: "Today · 08:30 AM", grade: "Primary · Grades 1–3", present: 375, absent: 18, late: 7, rate: "93.8%" },
  { id: "ATT-221B", date: "Today · 08:30 AM", grade: "Elementary · Grades 4–5", present: 312, absent: 14, late: 6, rate: "94.0%" },
  { id: "ATT-221C", date: "Today · 08:30 AM", grade: "Middle · Grades 6–8", present: 330, absent: 14, late: 6, rate: "94.3%" },
  { id: "ATT-221D", date: "Today · 08:30 AM", grade: "High · Grades 9–12", present: 186, absent: 10, late: 6, rate: "92.1%" },
  { id: "ATT-221", date: "Nov 06, 2026", grade: "All grades", present: 1203, absent: 56, late: 25, rate: "93.7%" },
  { id: "ATT-220", date: "Nov 05, 2026", grade: "All grades", present: 1191, absent: 72, late: 21, rate: "92.8%" },
  { id: "ATT-219", date: "Nov 04, 2026", grade: "All grades", present: 1212, absent: 49, late: 23, rate: "94.4%" },
  { id: "ATT-218", date: "Nov 03, 2026", grade: "All grades", present: 1189, absent: 68, late: 27, rate: "92.6%" },
];

const reports: AcademicReport[] = [
  { id: "RPT-41", title: "Term 1 academic performance", category: "Academics", updatedAt: "Nov 06, 2026", owner: "Avery Johnson" },
  { id: "RPT-40", title: "Weekly attendance summary", category: "Attendance", updatedAt: "Nov 05, 2026", owner: "Mia Robinson" },
  { id: "RPT-39", title: "Student enrollment overview", category: "Enrollment", updatedAt: "Nov 04, 2026", owner: "Jordan Davis" },
  { id: "RPT-38", title: "Grade 8 progress report", category: "Academics", updatedAt: "Nov 03, 2026", owner: "Lucas Clark" },
];

const pendingApprovals = [
  { id: "APP-1098", studentName: "Isabella Carter", grade: "Grade 6", submittedAt: "Today, 9:42 AM", status: "Pending review" as const },
  { id: "APP-1097", studentName: "Mason Taylor", grade: "Grade 8", submittedAt: "Today, 8:16 AM", status: "Needs information" as const },
  { id: "APP-1096", studentName: "Charlotte Moore", grade: "Grade 7", submittedAt: "Yesterday", status: "Pending review" as const },
];

const events = [
  { id: "EV-01", title: "Parent–teacher conferences", date: "Nov 10", time: "09:00 AM", type: "Meeting" as const },
  { id: "EV-02", title: "Midterm assessments begin", date: "Nov 12", time: "All day", type: "Academic" as const },
  { id: "EV-03", title: "Community open house", date: "Nov 16", time: "04:30 PM", type: "School" as const },
];

const fees: FeeRecord[] = [
  { id: "FEE-2401", studentName: "Olivia Bennett", studentNumber: "ST-1042", grade: "Grade 8", invoiceNumber: "INV-2026-1042", amount: 1250, dueDate: "Nov 10, 2026", status: "Pending" },
  { id: "FEE-2398", studentName: "Noah Williams", studentNumber: "ST-1038", grade: "Grade 7", invoiceNumber: "INV-2026-1038", amount: 980, dueDate: "Nov 08, 2026", status: "Paid" },
  { id: "FEE-2392", studentName: "Ava Thompson", studentNumber: "ST-1032", grade: "Grade 9", invoiceNumber: "INV-2026-1032", amount: 1425, dueDate: "Nov 01, 2026", status: "Overdue" },
  { id: "FEE-2387", studentName: "Liam Anderson", studentNumber: "ST-1026", grade: "Grade 6", invoiceNumber: "INV-2026-1026", amount: 1120, dueDate: "Nov 12, 2026", status: "Pending" },
  { id: "FEE-2381", studentName: "Sophia Martinez", studentNumber: "ST-1019", grade: "Grade 8", invoiceNumber: "INV-2026-1019", amount: 1250, dueDate: "Oct 28, 2026", status: "Paid" },
];

const assignments: Assignment[] = [
  { id: "ASM-031", title: "Linear equations practice", subject: "Mathematics", className: "Grade 8 · Section A", dueDate: "Nov 08, 2026", submissions: "24 / 28", status: "Due soon" },
  { id: "ASM-030", title: "Ecosystems field notes", subject: "Science", className: "Grade 7 · Section B", dueDate: "Nov 10, 2026", submissions: "18 / 26", status: "Published" },
  { id: "ASM-029", title: "Reading reflection: Chapter 5", subject: "English", className: "Grade 8 · Section A", dueDate: "Nov 12, 2026", submissions: "—", status: "Draft" },
  { id: "ASM-028", title: "Fractions and ratios", subject: "Mathematics", className: "Grade 6 · Section C", dueDate: "Nov 14, 2026", submissions: "25 / 25", status: "Published" },
];

const portalOverviews: Record<PortalRole, PortalOverview> = {
  teacher: {
    role: "teacher",
    greeting: "Your teaching day",
    schoolName: "Northstar Academy",
    metrics: [
      { label: "Classes today", value: "5", change: "Next class at 10:15", positive: true, icon: "book", tone: "blue" },
      { label: "Students", value: "126", change: "Across 5 classes", positive: true, icon: "users", tone: "violet" },
      { label: "To grade", value: "18", change: "6 due today", positive: false, icon: "clipboard", tone: "orange" },
      { label: "Attendance", value: "96.8%", change: "This week", positive: true, icon: "calendarCheck", tone: "green" },
    ],
    primaryTitle: "Today’s schedule",
    primaryDescription: "Your upcoming classes and teaching sessions.",
    primaryItems: [
      { id: "period-1", title: "Grade 8 · Mathematics", description: "Room 204 · Linear equations", meta: "09:00 – 09:50", status: "Completed" },
      { id: "period-2", title: "Grade 7 · Science", description: "Lab 2 · Ecosystems", meta: "10:15 – 11:05", status: "Next class" },
      { id: "period-3", title: "Grade 8 · Mathematics", description: "Room 204 · Practice review", meta: "11:30 – 12:20", status: "Upcoming" },
    ],
    secondaryTitle: "Needs your attention",
    secondaryItems: [
      { id: "grade-1", title: "Grade assignments", description: "18 submissions are waiting for review.", meta: "Due today", status: "Pending" },
      { id: "attendance-1", title: "Complete attendance", description: "One class register is still incomplete.", meta: "Grade 7 · Section B", status: "Action needed" },
    ],
  },
  accountant: {
    role: "accountant",
    greeting: "Finance overview",
    schoolName: "Northstar Academy",
    metrics: [
      { label: "Collected this month", value: "$84,250", change: "12.4%", positive: true, icon: "wallet", tone: "green" },
      { label: "Outstanding fees", value: "$12,840", change: "32 invoices", positive: false, icon: "clock", tone: "orange" },
      { label: "Paid invoices", value: "418", change: "This academic year", positive: true, icon: "check", tone: "blue" },
      { label: "Pending review", value: "7", change: "Receipts to reconcile", positive: false, icon: "receipt", tone: "violet" },
    ],
    primaryTitle: "Recent fee activity",
    primaryDescription: "Latest payments and invoices from your school.",
    primaryItems: fees.slice(0, 3).map((fee) => ({
      id: fee.id,
      title: `${fee.studentName} · ${fee.invoiceNumber}`,
      description: `${fee.grade} · $${fee.amount.toLocaleString()}`,
      meta: fee.dueDate,
      status: fee.status,
    })),
    secondaryTitle: "Finance tasks",
    secondaryItems: [
      { id: "task-1", title: "Reconcile payment receipts", description: "7 receipts are waiting to be matched.", meta: "Today", status: "Pending" },
      { id: "task-2", title: "Follow up on overdue fees", description: "32 families have an outstanding balance.", meta: "This week", status: "Action needed" },
    ],
  },
  parent: {
    role: "parent",
    greeting: "Olivia’s school day",
    schoolName: "Northstar Academy",
    metrics: [
      { label: "Attendance", value: "96%", change: "This term", positive: true, icon: "calendarCheck", tone: "green" },
      { label: "Average grade", value: "A−", change: "Across 6 subjects", positive: true, icon: "sparkles", tone: "violet" },
      { label: "Fee balance", value: "$1,250", change: "Due Nov 10", positive: false, icon: "wallet", tone: "orange" },
      { label: "Assignments", value: "2", change: "Due this week", positive: false, icon: "file", tone: "blue" },
    ],
    primaryTitle: "This week at school",
    primaryDescription: "A quick view of your child’s classes and upcoming work.",
    primaryItems: [
      { id: "parent-1", title: "Linear equations practice", description: "Mathematics · Ms. Robinson", meta: "Due Nov 08", status: "Due soon" },
      { id: "parent-2", title: "Ecosystems field notes", description: "Science · Mr. Clark", meta: "Due Nov 10", status: "Assigned" },
      { id: "parent-3", title: "Parent–teacher conference", description: "School conference room", meta: "Nov 10 · 9:00 AM", status: "Upcoming" },
    ],
    secondaryTitle: "Recent updates",
    secondaryItems: [
      { id: "update-1", title: "Attendance recorded", description: "Olivia arrived at school on time.", meta: "Today · 8:18 AM", status: "Present" },
      { id: "update-2", title: "Science project graded", description: "A strong result on the latest assignment.", meta: "Yesterday", status: "A−" },
    ],
  },
  student: {
    role: "student",
    greeting: "Your learning dashboard",
    schoolName: "Northstar Academy",
    metrics: [
      { label: "Classes today", value: "5", change: "Next: Mathematics", positive: true, icon: "book", tone: "blue" },
      { label: "Assignments due", value: "2", change: "One due tomorrow", positive: false, icon: "file", tone: "orange" },
      { label: "Current average", value: "A−", change: "Across 6 subjects", positive: true, icon: "sparkles", tone: "violet" },
      { label: "Attendance", value: "96%", change: "This term", positive: true, icon: "calendarCheck", tone: "green" },
    ],
    primaryTitle: "Your timetable",
    primaryDescription: "Today · Thursday, November 6",
    primaryItems: [
      { id: "student-1", title: "Mathematics", description: "Room 204 · Ms. Robinson", meta: "09:00 – 09:50", status: "Completed" },
      { id: "student-2", title: "Science", description: "Lab 2 · Mr. Clark", meta: "10:15 – 11:05", status: "Next class" },
      { id: "student-3", title: "English", description: "Room 112 · Ms. Parker", meta: "11:30 – 12:20", status: "Upcoming" },
    ],
    secondaryTitle: "Assignments to finish",
    secondaryItems: [
      { id: "work-1", title: "Linear equations practice", description: "Mathematics · 8 questions remaining", meta: "Due Nov 08", status: "Due soon" },
      { id: "work-2", title: "Ecosystems field notes", description: "Science · Add your observations", meta: "Due Nov 10", status: "Assigned" },
    ],
  },
};

let schoolSettings: SchoolSettingsData = {
  schoolName: "Northstar Academy",
  email: "hello@northstar.edu",
  schoolType: "private",
  academicYear: "2026-27",
  enrollmentNotifications: true,
  attendanceNotifications: true,
};
let schoolProfile: SchoolProfile = {
  id: "SCH-001",
  name: schoolSettings.schoolName,
  email: schoolSettings.email,
  phone: "+15550102000",
  timezone: "America/Los_Angeles",
  locale: "en-US",
};

const metricsByRole: Record<SchoolRole, SchoolOverview["metrics"]> = {
  super_admin: [
    { label: "Total schools", value: "18", change: "2 new this term", positive: true, icon: "building", tone: "violet" },
    { label: "Total students", value: "12,846", change: "8.4%", positive: true, icon: "users", tone: "blue" },
    { label: "Teaching staff", value: "1,024", change: "4.2%", positive: true, icon: "user", tone: "green" },
    { label: "Average attendance", value: "93.7%", change: "1.2%", positive: true, icon: "calendarCheck", tone: "orange" },
  ],
  school_admin: [
    { label: "Total students", value: "1,284", change: "6.8%", positive: true, icon: "users", tone: "blue" },
    { label: "Teachers", value: "64", change: "3 new this term", positive: true, icon: "user", tone: "violet" },
    { label: "Attendance today", value: "93.7%", change: "1.2%", positive: true, icon: "calendarCheck", tone: "green" },
    { label: "Pending approvals", value: "23", change: "5 need review", positive: false, icon: "clock", tone: "orange" },
  ],
  principal: [
    { label: "My students", value: "1,284", change: "6.8%", positive: true, icon: "users", tone: "blue" },
    { label: "Classrooms", value: "42", change: "2 new this term", positive: true, icon: "book", tone: "violet" },
    { label: "Attendance today", value: "93.7%", change: "1.2%", positive: true, icon: "calendarCheck", tone: "green" },
    { label: "Students to review", value: "8", change: "2 urgent", positive: false, icon: "clock", tone: "orange" },
  ],
};

export class MockSchoolService implements SchoolService {
  async getTeacherAcademicYears(
    signal?: AbortSignal,
  ): Promise<TeacherAcademicYear[]> {
    await delay(signal);
    return [{
      id: "YEAR-2025-26",
      name: "2025-26",
      startDate: "2025-04-01",
      endDate: "2027-03-31",
      status: "ACTIVE",
    }];
  }

  async getTeacherDashboard(
    academicYearId?: string,
    signal?: AbortSignal,
  ): Promise<TeacherDashboard> {
    await delay(signal);
    return {
      schoolId: "SCH-001",
      schoolName: "Northstar Academy",
      localDate: "2026-04-03",
      academicYearId: academicYearId ?? "YEAR-2025-26",
      academicYearName: "2025-26",
      academicYearStatus: "ACTIVE",
      assignments: [
        {
          id: "CLASS-08-SECTION-A",
          classId: "CLASS-08",
          className: "Grade 8",
          sectionId: "SECTION-A",
          sectionName: "Section A",
          subject: "Mathematics",
          studentCount: teacherRoster.length,
          isClassTeacher: true,
          classTeacherName: "Avery Johnson",
          sessionStatus: "OPEN",
          unmarkedCount: 3,
        },
      ],
    };
  }

  async getTeacherSections(
    academicYearId?: string,
    signal?: AbortSignal,
  ): Promise<TeacherSections> {
    await delay(signal);
    return {
      academicYear: {
        id: academicYearId ?? "YEAR-2025-26",
        name: "2025-26",
        status: "ACTIVE",
      },
      sections: teacherSections.map((section) => ({ ...section })),
    };
  }

  async getTeacherAttendance(
    _academicYearId: string,
    sectionId: string,
    date: string,
    signal?: AbortSignal,
  ): Promise<TeacherAttendance> {
    await delay(signal);
    const section = teacherSections.find((item) => item.id === sectionId);
    if (!section) throw new Error("Assigned section not found.");
    const key = `${sectionId}:${date}`;
    const records = teacherAttendance.get(key);
    return {
      academicYear: {
        id: "YEAR-2025-26",
        name: "2025-26",
        status: "ACTIVE",
      },
      section: {
        id: section.id,
        name: section.name,
        classId: section.classId,
        className: section.className,
      },
      date,
      status: teacherAttendanceStatuses.get(key) ?? null,
      canEdit: true,
      students: teacherRoster.map((student) => ({
        ...student,
        status: records?.get(student.studentId)?.status ?? null,
        remarks: records?.get(student.studentId)?.remarks ?? null,
      })),
    };
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
    status: "DRAFT" | "SUBMITTED";
  }> {
    await delay();
    const key = `${input.sectionId}:${input.date}`;
    if (!teacherSections.some((section) => section.id === input.sectionId)) {
      throw new Error("Assigned section not found.");
    }
    const studentIds = new Set(input.records.map((record) => record.studentId));
    if (
      studentIds.size !== input.records.length ||
      input.records.length === 0 ||
      input.records.some(
        (record) =>
          !teacherRoster.some((student) => student.studentId === record.studentId),
      )
    ) {
      throw new Error("Attendance drafts may contain unique students from the assigned roster.");
    }
    const records = teacherAttendance.get(key) ?? new Map();
    input.records.forEach((record) =>
      records.set(record.studentId, {
        status: record.status,
        remarks: record.remarks?.trim() || null,
      }),
    );
    teacherAttendance.set(key, records);
    const status = teacherAttendanceStatuses.get(key) ?? "DRAFT";
    teacherAttendanceStatuses.set(key, status);
    return {
      sessionId: `mock-attendance-${Date.now()}`,
      sectionId: input.sectionId,
      date: input.date,
      recordCount: input.records.length,
      status,
    };
  }

  async submitTeacherAttendance(input: {
    academicYearId: string;
    sectionId: string;
    date: string;
  }) {
    await delay();
    const key = `${input.sectionId}:${input.date}`;
    const records = teacherAttendance.get(key);
    if (!records?.size) throw new Error("Mark at least one student before submitting attendance.");
    teacherAttendanceStatuses.set(key, "SUBMITTED");
    return {
      sessionId: `mock-attendance-${Date.now()}`,
      sectionId: input.sectionId,
      date: input.date,
      recordCount: records.size,
      status: "SUBMITTED" as const,
    };
  }

  async getTeacherAssessments(
    academicYearId?: string,
    sectionId?: string,
    signal?: AbortSignal,
  ): Promise<TeacherAssessment[]> {
    await delay(signal);
    return teacherAssessments
      .filter(
        (assessment) =>
          (!academicYearId || assessment.academicYearId === academicYearId) &&
          (!sectionId || assessment.sectionId === sectionId),
      )
      .map((assessment) => ({ ...assessment }));
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
    await delay();
    const section = teacherSections.find((item) => item.id === input.sectionId);
    if (!section) throw new Error("Assigned section not found.");
    if (!input.title.trim() || !Number.isInteger(input.maxScore) || input.maxScore < 1 ||
      !Number.isInteger(input.passMark) || input.passMark < 0 ||
      input.passMark > input.maxScore) {
      throw new Error("Provide a title and a positive whole-number maximum score.");
    }
    if (
      (input.type === "TEST" &&
        (!input.startTime ||
          !Number.isInteger(input.durationMinutes) ||
          (input.durationMinutes ?? 0) < 1 ||
          (input.durationMinutes ?? 0) > 1440)) ||
      (input.type !== "TEST" &&
        (input.startTime !== undefined || input.durationMinutes !== undefined))
    ) {
      throw new Error("Tests require a start time and duration.");
    }
    const assessment: TeacherAssessment = {
      id: `mock-assessment-${Date.now()}`,
      sectionId: section.id,
      type: input.type,
      status: "DRAFT",
      title: input.title.trim(),
      description: input.description?.trim() || null,
      dueDate: input.dueDate,
      startTime: input.startTime ?? null,
      durationMinutes: input.durationMinutes ?? null,
      maxScore: input.maxScore,
      passMark: input.passMark,
      academicYearId: input.academicYearId,
      publishedAt: null,
      resultsStatus: "DRAFT",
      className: section.className,
      sectionName: section.name,
      resultCount: 0,
    };
    teacherAssessments = [assessment, ...teacherAssessments];
    return { ...assessment };
  }

  async publishTeacherAssessment(id: string): Promise<TeacherAssessment> {
    await delay();
    const assessment = teacherAssessments.find((item) => item.id === id);
    if (!assessment) throw new Error("Assessment not found.");
    if (assessment.status !== "DRAFT") {
      throw new Error("Only draft assessments can be published.");
    }
    assessment.status = "PUBLISHED";
    assessment.publishedAt = new Date().toISOString();
    return { ...assessment };
  }

  async getTeacherResults(
    assessmentId: string,
    signal?: AbortSignal,
  ): Promise<TeacherAssessmentResults> {
    await delay(signal);
    const assessment = teacherAssessments.find(
      (item) => item.id === assessmentId && item.status === "PUBLISHED",
    );
    if (!assessment) throw new Error("Published assessment not found.");
    const scores = teacherScores.get(assessmentId);
    return {
      assessment: {
        id: assessment.id,
        title: assessment.title,
        type: assessment.type,
        dueDate: assessment.dueDate,
        startTime: assessment.startTime,
        durationMinutes: assessment.durationMinutes,
        maxScore: assessment.maxScore,
        passMark: assessment.passMark,
        academicYearId: assessment.academicYearId,
        resultsStatus: assessment.resultsStatus,
        className: assessment.className,
        sectionName: assessment.sectionName,
        academicYearName: "2025-26",
        resultsPublishedAt:
          assessment.resultsStatus === "PUBLISHED" ? new Date().toISOString() : null,
        gradesConfigured: Boolean(
          mockGradeScales.get(assessment.academicYearId ?? "")?.bands.length,
        ),
      },
      students: teacherRoster.map((student) => ({
        ...student,
        score: scores?.get(student.studentId)?.score ?? null,
        feedback: scores?.get(student.studentId)?.feedback ?? null,
        updatedAt: null,
        passed:
          scores?.has(student.studentId) && assessment.passMark !== null
            ? scores.get(student.studentId)!.score >= assessment.passMark
            : null,
        grade: null,
      })),
    };
  }

  async saveTeacherResults(
    assessmentId: string,
    input: {
      records: {
        studentId: string;
        score: number;
        feedback?: string;
      }[];
    },
  ): Promise<{ assessmentId: string; savedCount: number }> {
    await delay();
    const assessment = teacherAssessments.find(
      (item) => item.id === assessmentId && item.status === "PUBLISHED",
    );
    if (!assessment) throw new Error("Published assessment not found.");
    const studentIds = new Set(input.records.map((record) => record.studentId));
    if (
      studentIds.size !== input.records.length ||
      input.records.some(
        (record) =>
          !teacherRoster.some((student) => student.studentId === record.studentId) ||
          !Number.isInteger(record.score) ||
          record.score < 0 ||
          record.score > assessment.maxScore,
      )
    ) {
      throw new Error("Scores must be unique, valid, and within the assessment maximum.");
    }
    const scores =
      teacherScores.get(assessmentId) ??
      new Map<string, { score: number; feedback: string | null }>();
    input.records.forEach((record) =>
      scores.set(record.studentId, {
        score: record.score,
        feedback: record.feedback?.trim() || null,
      }),
    );
    teacherScores.set(assessmentId, scores);
    assessment.resultCount = scores.size;
    return { assessmentId, savedCount: input.records.length };
  }

  async publishTeacherResults(assessmentId: string) {
    await delay();
    const assessment = teacherAssessments.find((item) => item.id === assessmentId);
    const scores = teacherScores.get(assessmentId);
    if (!assessment || !scores?.size) {
      throw new Error("Save at least one result before publishing results.");
    }
    assessment.resultsStatus = "PUBLISHED";
    return {
      assessmentId,
      resultsStatus: "PUBLISHED" as const,
      publishedCount: scores.size,
    };
  }

  async getGradeScale(
    academicYearId: string,
    signal?: AbortSignal,
  ): Promise<TeacherGradeScale> {
    await delay(signal);
    return mockGradeScales.get(academicYearId) ?? {
      academicYearId,
      academicYearName: "2025-26",
      bands: [],
    };
  }

  async saveGradeScale(
    academicYearId: string,
    bands: TeacherGradeBand[],
  ): Promise<TeacherGradeScale> {
    await delay();
    const scale = {
      academicYearId,
      academicYearName: "2025-26",
      bands: bands.map((band) => ({ ...band })),
    };
    mockGradeScales.set(academicYearId, scale);
    return scale;
  }

  async getNotifications(
    signal?: AbortSignal,
  ): Promise<TeacherNotifications> {
    await delay(signal);
    return { notifications: [], unreadCount: 0 };
  }

  async markNotificationRead(): Promise<void> {
    await delay();
  }

  async markAllNotificationsRead(): Promise<number> {
    await delay();
    return 0;
  }

  async getTeacherAssignments(
    signal?: AbortSignal,
  ): Promise<TeacherAssignment[]> {
    await delay(signal);
    return [];
  }

  async assignTeacher(
    input: AssignTeacherInput,
  ): Promise<TeacherAssignment> {
    await delay();
    const staffMember = staff.find((member) => member.id === input.staffId);
    const classroom = classrooms.find((item) => item.id === input.classId);
    const section = classroom?.sections.find(
      (item) => item.id === input.sectionId,
    );
    if (!staffMember || !classroom) {
      throw new Error("Choose an active teacher and class.");
    }
    return {
      id: `mock-assignment-${Date.now()}`,
      staffId: input.staffId,
      classId: input.classId,
      sectionId: input.sectionId ?? null,
      subject: input.subject ?? null,
      isClassTeacher: input.isClassTeacher,
      staffName: staffMember.name,
      className: classroom.name,
      sectionName: section?.name ?? null,
    };
  }

  async getOverview(role: SchoolRole, signal?: AbortSignal): Promise<SchoolOverview> {
    await delay(signal);
    return {
      role,
      schoolName: role === "super_admin" ? "All schools" : "Northstar Academy",
      metrics: metricsByRole[role],
      enrollment: [
        { month: "Jun", students: 802 },
        { month: "Jul", students: 846 },
        { month: "Aug", students: 924 },
        { month: "Sep", students: 1008 },
        { month: "Oct", students: 1142 },
        { month: "Nov", students: 1284 },
      ],
      pendingApprovals,
      upcomingEvents: events,
    };
  }

  async getPortalOverview(role: PortalRole, signal?: AbortSignal): Promise<PortalOverview> {
    await delay(signal);
    return portalOverviews[role];
  }

  async getStudents(page = 1, pageSize = 20, signal?: AbortSignal): Promise<StudentPage> {
    await delay(signal);
    const start = (page - 1) * pageSize;
    return {
      data: students.slice(start, start + pageSize).map((student) => ({ ...student })),
      meta: {
        page,
        pageSize,
        total: students.length,
        totalPages: Math.ceil(students.length / pageSize),
      },
    };
  }

  searchStudents(): Promise<StudentPage> {
    return Promise.reject(new Error("Student directory search is unavailable in preview mode."));
  }

  admitStudent(): Promise<Student> {
    return Promise.reject(new Error("Student admissions are unavailable in preview mode."));
  }

  getAdmissionSettings(): Promise<{ prefix: string }> {
    return Promise.reject(new Error("Admission settings are unavailable in preview mode."));
  }

  updateAdmissionSettings(): Promise<{ prefix: string }> {
    return Promise.reject(new Error("Admission settings are unavailable in preview mode."));
  }

  async getStudent(id: string, signal?: AbortSignal): Promise<Student> {
    await delay(signal);
    const student = students.find((item) => item.id === id);
    if (!student) throw new Error("This student could not be found.");
    return { ...student };
  }

  async createStudent(input: StudentCreateInput): Promise<Student> {
    await delay();
    const duplicate = students.some(
      (student) => student.studentNumber.toLowerCase() === input.admissionNumber.trim().toLowerCase(),
    );
    if (duplicate) throw new Error("Admission number already exists.");
    if (!input.firstName.trim() || !input.lastName.trim() || !input.admissionNumber.trim()) {
      throw new Error("Complete all student details before saving.");
    }
    const nextNumber = Math.max(
      1042,
      ...students.map((student) => Number(student.studentNumber.replace(/\D/g, ""))),
    ) + 1;
    const selectedClass = classrooms.find((room) => room.id === input.classId);
    const selectedSection = selectedClass?.sections.find((section) => section.id === input.sectionId);
    const guardian = input.guardians[0];
    const student: Student = {
      id: `stu-${nextNumber}`,
      name: `${input.firstName} ${input.lastName}`.trim(),
      studentNumber: input.admissionNumber,
      grade: selectedClass?.name ?? "—",
      guardian: guardian ? `${guardian.firstName} ${guardian.lastName ?? ""}`.trim() : null,
      attendance: "—",
      status: "Pending",
      firstName: input.firstName,
      lastName: input.lastName,
      middleName: input.middleName ?? null,
      dateOfBirth: input.dateOfBirth ?? null,
      gender: input.gender ?? null,
      admissionDate: input.admissionDate,
      academicYearName: academicYears.find((year) => year.id === input.academicYearId)?.name ?? null,
      className: selectedClass?.name ?? null,
      sectionName: selectedSection?.name ?? null,
      guardians: guardian ? [{
        id: `guardian-${nextNumber}`,
        name: `${guardian.firstName} ${guardian.lastName ?? ""}`.trim(),
        relationship: guardian.relationship,
        phone: guardian.phone,
        email: guardian.email ?? null,
        isPrimary: guardian.isPrimary,
      }] : [],
    };
    students.unshift(student);
    return { ...student };
  }

  async updateStudent(id: string, input: StudentInput): Promise<Student> {
    await delay();
    const index = students.findIndex((student) => student.id === id);
    if (index < 0) throw new Error("This student could not be found.");
    const { name, studentNumber, grade, guardian } = input;
    if (
      typeof name !== "string" ||
      typeof studentNumber !== "string" ||
      typeof grade !== "string" ||
      typeof guardian !== "string"
    ) {
      throw new Error("Complete all student details before saving.");
    }
    const duplicate = students.some(
      (student, studentIndex) =>
        studentIndex !== index &&
        student.studentNumber.toLowerCase() === studentNumber.trim().toLowerCase(),
    );
    if (duplicate) throw new Error("A student with this ID already exists.");
    if (!name.trim() || !studentNumber.trim() || !grade.trim() || !guardian.trim()) {
      throw new Error("Complete all student details before saving.");
    }
    const updated: Student = {
      ...students[index],
      name: name.trim(),
      studentNumber: studentNumber.trim(),
      grade: grade.trim(),
      guardian: guardian.trim(),
    };
    students[index] = updated;
    return { ...updated };
  }

  async getStaff(signal?: AbortSignal): Promise<StaffMember[]> {
    await delay(signal);
    return staff.map((member) => ({ ...member }));
  }

  async getAnnouncements(
    includeDrafts = false,
    signal?: AbortSignal,
  ): Promise<Announcement[]> {
    await delay(signal);
    return mockAnnouncements
      .filter((announcement) => includeDrafts || announcement.status === "PUBLISHED")
      .map((announcement) => ({ ...announcement }));
  }

  async createAnnouncement(
    input: CreateAnnouncementInput,
  ): Promise<Announcement> {
    await delay();
    const title = input.title.trim();
    const body = input.body.trim();
    if (!title || !body) {
      throw new Error("Enter a title and announcement message.");
    }
    const now = new Date().toISOString();
    const announcement: Announcement = {
      id: `announcement-${Date.now()}`,
      title,
      body,
      status: "DRAFT",
      publishedAt: null,
      createdAt: now,
    };
    mockAnnouncements.unshift(announcement);
    return { ...announcement };
  }

  async publishAnnouncement(id: string): Promise<Announcement> {
    await delay();
    const announcement = mockAnnouncements.find((item) => item.id === id);
    if (!announcement) throw new Error("This announcement could not be found.");
    if (announcement.status !== "DRAFT") {
      throw new Error("This announcement has already been published.");
    }
    announcement.status = "PUBLISHED";
    announcement.publishedAt = new Date().toISOString();
    return { ...announcement };
  }

  async createStaff(input: CreateStaffInput): Promise<StaffMember> {
    await delay();
    if (
      input.employeeCode &&
      staff.some(
        (member) =>
          member.employeeCode?.toLowerCase() ===
          input.employeeCode.trim().toLowerCase(),
      )
    ) {
      throw new Error("Employee code already exists.");
    }
    const member: StaffMember = {
      id: `staff-${Date.now()}`,
      name: `${input.firstName} ${input.lastName ?? ""}`.trim(),
      email: input.email ?? input.accountEmail ?? "",
      position: input.designation ?? "Staff",
      department: input.department ?? "General",
      status: "Active",
      employeeCode: input.employeeCode,
      firstName: input.firstName,
      lastName: input.lastName ?? null,
      phone: input.phone ?? null,
    };
    staff.push(member);
    return { ...member };
  }

  async createTeacherAccount(): Promise<StaffMember> {
    throw new Error("Teacher login accounts require API mode.");
  }

  async getDepartments(): Promise<never> {
    throw new Error("School department settings require API mode.");
  }

  async createDepartment(): Promise<never> {
    throw new Error("School department settings require API mode.");
  }

  async updateDepartment(): Promise<never> {
    throw new Error("School department settings require API mode.");
  }

  async updateStaff(
    id: string,
    input: UpdateStaffInput,
  ): Promise<StaffMember> {
    await delay();
    const index = staff.findIndex((member) => member.id === id);
    if (index < 0) throw new Error("This staff member could not be found.");
    const current = staff[index];
    const firstName = input.firstName ?? current.firstName ?? "";
    const lastName = input.lastName ?? current.lastName ?? "";
    const updated: StaffMember = {
      ...current,
      name: `${firstName} ${lastName}`.trim(),
      email: input.email ?? current.email,
      position: input.designation ?? current.position,
      department: input.department ?? current.department,
      employeeCode: input.employeeCode ?? current.employeeCode,
      firstName,
      lastName,
      phone: input.phone ?? current.phone,
    };
    staff[index] = updated;
    return { ...updated };
  }

  async deactivateStaff(id: string): Promise<void> {
    await delay();
    const member = staff.find((item) => item.id === id);
    if (!member) throw new Error("This staff member could not be found.");
    member.status = "Inactive";
  }

  async getClassrooms(signal?: AbortSignal): Promise<Classroom[]> {
    await delay(signal);
    return classrooms;
  }

  async createClassroom(input: CreateClassroomInput): Promise<Classroom> {
    await delay();
    if (classrooms.some((classroom) => classroom.code === input.code)) {
      throw new Error("A class with this code already exists.");
    }
    const classroom: Classroom = {
      id: `class-${Date.now()}`,
      name: input.name,
      code: input.code,
      sortOrder: input.sortOrder ?? 0,
      isActive: true,
      sections: [],
    };
    classrooms.push(classroom);
    return classroom;
  }

  async createClassroomWithSection(input: CreateClassroomWithSectionInput): Promise<Classroom> {
    await delay();
    if (classrooms.some((classroom) => classroom.code === input.code)) {
      throw new Error("A class with this code already exists.");
    }
    const classroom: Classroom = {
      id: `class-${Date.now()}`,
      name: input.name,
      code: input.code,
      sortOrder: input.sortOrder ?? 0,
      isActive: true,
      sections: [{
        id: `section-${Date.now()}`,
        name: input.section.name,
        code: input.section.code,
        capacity: input.section.capacity ?? null,
        isActive: true,
      }],
    };
    classrooms.push(classroom);
    return classroom;
  }

  async createAcademicSection(
    input: CreateAcademicSectionInput,
  ): Promise<AcademicSection> {
    await delay();
    const classroom = classrooms.find((item) => item.id === input.classId);
    if (!classroom) throw new Error("This class could not be found.");
    if (classroom.sections.some((section) => section.code === input.code)) {
      throw new Error("A section with this code already exists for this class.");
    }
    const section: AcademicSection = {
      id: `section-${Date.now()}`,
      name: input.name,
      code: input.code,
      capacity: input.capacity ?? null,
      isActive: true,
    };
    classroom.sections.push(section);
    return section;
  }

  async updateClassroom(id: string, input: UpdateClassroomInput): Promise<Classroom> {
    await delay();
    const classroom = classrooms.find((item) => item.id === id && item.isActive);
    if (!classroom) throw new Error("This class could not be found.");
    if (classrooms.some((item) => item.id !== id && item.code === input.code)) {
      throw new Error("A class with this code already exists.");
    }
    Object.assign(classroom, input);
    return classroom;
  }

  async updateAcademicSection(classId: string, sectionId: string, input: UpdateAcademicSectionInput): Promise<AcademicSection> {
    await delay();
    const classroom = classrooms.find((item) => item.id === classId && item.isActive);
    const section = classroom?.sections.find((item) => item.id === sectionId && item.isActive);
    if (!classroom || !section) throw new Error("This section could not be found.");
    if (classroom.sections.some((item) => item.id !== sectionId && item.code === input.code)) {
      throw new Error("A section with this code already exists for this class.");
    }
    Object.assign(section, input);
    return section;
  }

  async getAcademicYears(signal?: AbortSignal): Promise<AcademicYear[]> {
    await delay(signal);
    return academicYears;
  }

  async createAcademicYear(input: CreateAcademicYearInput): Promise<AcademicYear> {
    await delay();
    const year: AcademicYear = {
      id: `year-${Date.now()}`,
      ...input,
      status: "DRAFT",
    };
    academicYears.unshift(year);
    return year;
  }

  async getSchools(signal?: AbortSignal): Promise<School[]> {
    await delay(signal);
    return schools;
  }

  async getPlatformSchools(signal?: AbortSignal): Promise<PlatformSchool[]> {
    await delay(signal);
    return schools.map((school, index) => ({
      id: school.id,
      name: school.name,
      code: school.id,
      isActive: index !== 2,
      createdAt: "2026-01-01T00:00:00.000Z",
    }));
  }

  async getPlatformSchool(id: string, signal?: AbortSignal): Promise<PlatformSchoolDetail | null> {
    const school = (await this.getPlatformSchools(signal)).find((item) => item.id === id);
    return school ? { ...school, onboardingState: null } : null;
  }

  async createPlatformSchool(): Promise<never> {
    throw new Error("School creation is unavailable in demo mode.");
  }

  async getAttendance(signal?: AbortSignal): Promise<AttendanceRecord[]> {
    await delay(signal);
    return attendance;
  }

  async getAttendanceReport(
    fromDate: string,
    toDate: string,
    signal?: AbortSignal,
  ): Promise<AttendanceReport> {
    await delay(signal);
    const sessions = attendanceSessions.filter(
      (session) =>
        session.status === "CLOSED" &&
        session.date >= fromDate &&
        session.date <= toDate,
    );
    const statusCounts: AttendanceReport["statusCounts"] = {
      PRESENT: 0,
      ABSENT: 0,
      LATE: 0,
      EXCUSED: 0,
    };
    const dailyByDate = new Map<
      string,
      AttendanceReport["dailyBreakdown"][number]
    >();
    for (const session of sessions) {
      let day = dailyByDate.get(session.date);
      if (!day) {
        day = {
          date: session.date,
          totalSessions: 0,
          totalRecords: 0,
          statusCounts: {
            PRESENT: 0,
            ABSENT: 0,
            LATE: 0,
            EXCUSED: 0,
          },
        };
        dailyByDate.set(session.date, day);
      }
      day.totalSessions += 1;
      for (const record of session.records) {
        statusCounts[record.status] += 1;
        day.statusCounts[record.status] += 1;
        day.totalRecords += 1;
      }
    }
    const dailyBreakdown = [...dailyByDate.values()].sort((first, second) =>
      first.date.localeCompare(second.date),
    );

    return {
      fromDate,
      toDate,
      totalSessions: sessions.length,
      totalRecords: Object.values(statusCounts).reduce(
        (total, count) => total + count,
        0,
      ),
      statusCounts,
      dailyBreakdown,
    };
  }

  async getAttendanceSessions(date: string, signal?: AbortSignal): Promise<AttendanceSession[]> {
    await delay(signal);
    return attendanceSessions.filter((session) => session.date === date);
  }

  async getAttendanceRoster(sessionId: string, signal?: AbortSignal): Promise<AttendanceRosterStudent[]> {
    await delay(signal);
    const session = attendanceSessions.find((item) => item.id === sessionId);
    if (!session) throw new Error("Attendance session not found.");
    const classroom = classrooms.find((item) => item.id === session.classId);
    if (!classroom?.sections.some((section) => section.id === session.sectionId)) return [];
    return students
      .filter((student) => student.grade === classroom.name)
      .map((student) => ({
        id: student.id,
        name: student.name,
        admissionNumber: student.studentNumber,
        record: session.records.find((record) => record.studentId === student.id) ?? null,
      }));
  }

  async createAttendanceSession(input: { classId: string; sectionId: string; date: string }): Promise<AttendanceSession> {
    await delay();
    const existing = attendanceSessions.find((session) =>
      session.classId === input.classId &&
      session.sectionId === input.sectionId &&
      session.date === input.date,
    );
    if (existing) throw new Error("Attendance session already exists for this class, section and date.");
    const session: AttendanceSession = {
      id: `attendance-${Date.now()}`,
      ...input,
      status: "OPEN",
      records: [],
    };
    attendanceSessions.unshift(session);
    return session;
  }

  async markAttendance(sessionId: string, input: MarkAttendanceInput): Promise<{ success: boolean; count: number }> {
    await delay();
    const session = attendanceSessions.find((item) => item.id === sessionId);
    if (!session) throw new Error("Attendance session not found.");
    if (session.status !== "OPEN") throw new Error("Attendance session is closed.");
    if (input.records.some((record) => session.records.some((current) => current.studentId === record.studentId))) {
      throw new Error("Attendance has already been marked for one or more students.");
    }
    for (const record of input.records) {
      session.records.push({ ...record, remarks: record.remarks ?? null, markedAt: new Date().toISOString() });
    }
    return { success: true, count: input.records.length };
  }

  async closeAttendanceSession(sessionId: string): Promise<{ success: boolean }> {
    await delay();
    const session = attendanceSessions.find((item) => item.id === sessionId);
    if (!session || session.status !== "OPEN") throw new Error("Attendance session is not open.");
    session.status = "CLOSED";
    return { success: true };
  }

  async getReports(signal?: AbortSignal): Promise<AcademicReport[]> {
    await delay(signal);
    return reports;
  }

  async getFees(signal?: AbortSignal): Promise<FeeRecord[]> {
    await delay(signal);
    return fees;
  }

  async getAssignments(signal?: AbortSignal): Promise<Assignment[]> {
    await delay(signal);
    return assignments;
  }

  async getSettings(signal?: AbortSignal): Promise<SchoolSettingsData> {
    await delay(signal);
    return { ...schoolSettings };
  }

  async updateSettings(settings: SchoolSettingsData): Promise<SchoolSettingsData> {
    await delay();
    schoolSettings = { ...settings };
    return { ...schoolSettings };
  }

  async getSchoolProfile(signal?: AbortSignal): Promise<SchoolProfile> {
    await delay(signal);
    return { ...schoolProfile };
  }

  async updateSchoolProfile(profile: UpdateSchoolProfileInput): Promise<SchoolProfile> {
    await delay();
    schoolProfile = { ...schoolProfile, ...profile };
    return { ...schoolProfile };
  }
}
