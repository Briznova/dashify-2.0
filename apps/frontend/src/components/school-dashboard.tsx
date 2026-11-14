"use client";

import Link from "next/link";
import { useState, type FormEvent, type ReactNode } from "react";
import {
  useAcademicReports,
  useAttendanceActions,
  useAttendanceRoster,
  useAttendanceReport,
  useAttendanceSessions,
  useAttendance,
  useClassrooms,
  useCreateClassroomWithSection,
  useDeactivateStaff,
  useDepartments,
  useSchoolOverview,
  useSchoolProfile,
  useSchoolSettings,
  useFees,
  useSchools,
  useStaff,
  useStudents,
  useStudentsPage,
  useUpdateSchoolSettings,
  useUpdateSchoolProfile,
  useSaveStaff,
  useTeacherActions,
  useTeacherAssignments,
} from "@/hooks/use-school-data";
import { useAuthSession } from "@/hooks/use-auth";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { Icon } from "@/components/ui/icon";
import { MetricCard } from "@/components/ui/metric-card";
import { PageHeading } from "@/components/ui/page-heading";
import { Panel } from "@/components/ui/panel";
import { ResourceState } from "@/components/ui/resource-state";
import { StatusBadge } from "@/components/ui/status-badge";
import { ApiStudentsDirectory } from "@/components/students-directory";
import { AdmissionSettings } from "@/components/admission-settings";
import { DepartmentSettings } from "@/components/department-settings";
import { downloadAttendanceReportCsv } from "@/lib/attendance-report-csv";
import { isApiMode, schoolService } from "@/services";
import type {
  AcademicReport,
  AttendanceSessionRecord,
  AttendanceRecord,
  Classroom,
  FeeRecord,
  School,
  SchoolEvent,
  SchoolOverview,
  SchoolRole,
  SchoolSettingsData,
  UpdateStaffInput,
  UpdateSchoolProfileInput,
  StaffMember,
  Student,
  AttendanceSession,
} from "@/types/school";
import styles from "./school-dashboard.module.css";

const roleLabels: Record<SchoolRole, string> = {
  super_admin: "Super administrator",
  school_admin: "School administrator",
  principal: "Principal",
};
function RoleDashboard({ sessionRole, userName }: { sessionRole: SchoolRole; userName: string }) {
  const role = sessionRole;
  const { data, isLoading, error, refresh } = useSchoolOverview(role);
  const maxEnrollment = Math.max(...(data?.enrollment.map((point) => point.students) ?? [1]));
  const points = data?.enrollment.map((point, index) => {
    const x = data.enrollment.length === 1 ? 50 : (index / (data.enrollment.length - 1)) * 100;
    const y = 93 - (point.students / maxEnrollment) * 70;
    return `${x},${y}`;
  }).join(" ") ?? "";

  return (
    <>
      <PageHeading
        eyebrow={`${data?.schoolName ?? "SCHOOL WORKSPACE"} · ${roleLabels[role].toUpperCase()}`}
        title={`Good morning, ${userName.trim().split(/\s+/)[0]} ✨`}
        description={isApiMode
          ? role === "school_admin"
            ? "Current counts for active students, staff, classes, and sections."
            : role === "principal"
              ? data?.localDate
                ? `Daily attendance snapshot for ${data.localDate} (school local date).`
                : "Daily attendance snapshot for the active school."
              : "Role-specific dashboard data is not available yet."
          : role === "super_admin"
            ? "Monitor school workspaces, onboarding, and network-wide performance."
            : role === "principal"
              ? "A school-wide view of learning, classroom activity, and student wellbeing."
              : "Your school at a glance: attendance, fees, enrollment, and daily operations."}
      />
      <ResourceState error={error} isLoading={isLoading} onRetry={refresh} />
      {data && (
        <section className={styles.metricsGrid} aria-label={`${roleLabels[role]} summary`}>
          {data.metrics.map((metric) => (
            <MetricCard
              key={metric.label}
              label={metric.label}
              value={metric.value}
              detail={metric.change ?? (role === "principal" ? "Today" : "Current total")}
              trend={metric.positive === undefined
                ? undefined
                : metric.positive ? "positive" : "negative"}
              icon={metric.icon}
              tone={metric.tone}
            />
          ))}
        </section>
      )}
      {data && !isApiMode && role === "super_admin" && <SuperAdminWorkspace data={data} points={points} />}
      {data && !isApiMode && role === "school_admin" && <SchoolAdminWorkspace events={data.upcomingEvents} approvals={data.pendingApprovals} />}
      {data && !isApiMode && role === "principal" && <PrincipalWorkspace events={data.upcomingEvents} approvals={data.pendingApprovals} />}
    </>
  );
}

function DashboardPanel({
  title,
  description,
  action,
  children,
}: {
  title: string;
  description: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className={styles.panel}>
      <div className={styles.panelHeading}>
        <div><h2>{title}</h2><p>{description}</p></div>
        {action}
      </div>
      {children}
    </section>
  );
}

function EnrollmentChart({ data, points }: { data: ReturnType<typeof useSchoolOverview>["data"]; points: string }) {
  if (!data) return null;
  return (
    <>
      <div className={styles.enrollmentSummary}>
        <strong>{data.enrollment.at(-1)?.students.toLocaleString()}</strong>
        <span>students enrolled</span>
        <span className={styles.positiveTag}>↗ 8.4% this term</span>
      </div>
      <div className={styles.chart} role="img" aria-label="Student enrollment chart">
        <div className={styles.chartGrid} />
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          <polyline points={points} fill="none" stroke="#5873ef" strokeWidth="2.2" vectorEffect="non-scaling-stroke" />
        </svg>
        <div className={styles.chartMonths}>{data.enrollment.map((point) => <span key={point.month}>{point.month}</span>)}</div>
      </div>
    </>
  );
}

function SchoolAdminWorkspace({ events, approvals }: { events: SchoolEvent[]; approvals: SchoolOverview["pendingApprovals"] }) {
  const students = useStudents();
  const attendance = useAttendance();
  const fees = useFees();
  const lowAttendance = students.data?.data.filter((student) => {
    const rate = Number.parseFloat(student.attendance ?? "");
    return Number.isFinite(rate) && rate < 90;
  }) ?? [];
  const collected = fees.data?.filter((fee) => fee.status === "Paid").reduce((sum, fee) => sum + fee.amount, 0) ?? 0;
  const expected = fees.data?.reduce((sum, fee) => sum + fee.amount, 0) ?? 0;
  const collectionRate = expected > 0 ? Math.round((collected / expected) * 100) : 0;

  return (
    <>
      {students.data && lowAttendance.length > 0 && (
        <section className={styles.attendanceAlert} aria-label="Attendance alert">
          <span className={styles.alertIcon}><Icon name="alert" size={17} /></span>
          <div>
            <strong>{lowAttendance.length} students need attendance follow-up</strong>
            <p>{lowAttendance.slice(0, 3).map((student) => `${student.name} (${student.attendance})`).join(" · ")}</p>
          </div>
        </section>
      )}
      {students.error && <ResourceState error={students.error} isLoading={false} onRetry={students.refresh} />}
      <div className={styles.dashboardGrid}>
        <DashboardPanel
          title="Today’s attendance"
          description="Daily attendance recorded across your school."
        >
          <ResourceState error={attendance.error} isLoading={attendance.isLoading} onRetry={attendance.refresh} />
          {attendance.data && (
            <div className={styles.dashboardTableScroll}>
              <table className={styles.dashboardTable}>
                <thead><tr><th>DATE</th><th>PRESENT</th><th>ABSENT</th><th>LATE</th><th>RATE</th></tr></thead>
                <tbody>
                  {attendance.data.slice(0, 4).map((record) => (
                    <tr key={record.id}>
                      <td><strong>{record.date}</strong><small>{record.grade}</small></td>
                      <td>{record.present.toLocaleString()}</td>
                      <td>{record.absent}</td>
                      <td>{record.late}</td>
                      <td><span className={styles.rateValue}>{record.rate}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </DashboardPanel>
        <DashboardPanel
          title="Fee position"
          description="Collection progress for the current school year."
          action={<Link href="/dashboard/fees">View fees <Icon name="arrowUpRight" size={14} /></Link>}
        >
          <ResourceState error={fees.error} isLoading={fees.isLoading} onRetry={fees.refresh} />
          {fees.data && (
            <div className={styles.feeSummary}>
              <div className={styles.feeTotal}><strong>${collected.toLocaleString()}</strong><span>of ${expected.toLocaleString()} in invoices</span></div>
              <div className={styles.feeProgress} role="progressbar" aria-label="Fees collected" aria-valuenow={collectionRate} aria-valuemin={0} aria-valuemax={100}>
                <span style={{ width: `${collectionRate}%` }} />
              </div>
              <div className={styles.feeLegend}>
                <span><i className={styles.paidDot} />Collected <strong>{collectionRate}%</strong></span>
                <span><i className={styles.dueDot} />Open balances <strong>{fees.data.filter((fee) => fee.status !== "Paid").length}</strong></span>
              </div>
              <div className={styles.feeRows}>
                {fees.data.slice(0, 3).map((fee) => <FeeRow fee={fee} key={fee.id} />)}
              </div>
            </div>
          )}
        </DashboardPanel>
        <DashboardPanel title="Notices & upcoming" description="Keep up with school events and announcements." action={<Link href="/dashboard/reports">View calendar <span aria-hidden="true">↗</span></Link>}>
          <EventList events={events} />
        </DashboardPanel>
        <DashboardPanel title="Enrollment requests" description="New students waiting for your review." action={<Link href="/dashboard/students">Open directory <span aria-hidden="true">↗</span></Link>}>
          <ApprovalList approvals={approvals} />
        </DashboardPanel>
      </div>
    </>
  );
}

function FeeRow({ fee }: { fee: FeeRecord }) {
  return (
    <div className={styles.feeRow}>
      <span className={styles.studentAvatar}>{fee.studentName.split(" ").map((part) => part[0]).join("")}</span>
      <span className={styles.feeRowInfo}><strong>{fee.studentName}</strong><small>{fee.invoiceNumber}</small></span>
      <span className={styles.feeRowAmount}>${fee.amount.toLocaleString()}</span>
      <StatusBadge variant={fee.status === "Paid" ? "success" : fee.status === "Overdue" ? "warning" : "info"}>{fee.status}</StatusBadge>
    </div>
  );
}

function EventList({ events }: { events: SchoolEvent[] }) {
  return (
    <div className={styles.eventList}>
      {events.map((event) => (
        <div className={styles.eventRow} key={event.id}>
          <span className={styles.eventDate}>{event.date.split(" ")[0]}<strong>{event.date.split(" ")[1]}</strong></span>
          <div><strong>{event.title}</strong><span>{event.time} · {event.type}</span></div>
          <span className={styles.eventArrow}><Icon name="arrowUpRight" size={15} /></span>
        </div>
      ))}
    </div>
  );
}

function ApprovalList({ approvals }: { approvals: SchoolOverview["pendingApprovals"] }) {
  return (
    <div className={styles.approvalList}>
      {approvals.slice(0, 3).map((approval) => (
        <div className={styles.approvalRow} key={approval.id}>
          <span className={styles.studentAvatar}>{approval.studentName.split(" ").map((part) => part[0]).join("")}</span>
          <div className={styles.approvalInfo}><strong>{approval.studentName}</strong><span>{approval.grade} · {approval.submittedAt}</span></div>
          <StatusBadge variant={approval.status === "Pending review" ? "warning" : "info"}>{approval.status}</StatusBadge>
        </div>
      ))}
      {approvals.length === 0 && <div className={styles.emptyState}>No students are waiting for approval.</div>}
    </div>
  );
}

function SuperAdminWorkspace({ data, points }: { data: NonNullable<ReturnType<typeof useSchoolOverview>["data"]>; points: string }) {
  const schools = useSchools();
  return (
    <div className={styles.dashboardGrid}>
      <DashboardPanel title="Enrollment across schools" description="Student growth across every workspace." action={<Link href="/dashboard/schools">Manage schools <Icon name="arrowUpRight" size={14} /></Link>}>
        <EnrollmentChart data={data} points={points} />
      </DashboardPanel>
      <DashboardPanel title="Platform notices" description="Setup and account activity that may need attention.">
        <div className={styles.platformNotices}>
          <div><span className={`${styles.noticeIcon} ${styles.noticeWarning}`}><Icon name="alert" size={16} /></span><p><strong>School setup in progress</strong><small>Summit Preparatory still needs to finish onboarding.</small></p><StatusBadge variant="warning">Action needed</StatusBadge></div>
          <div><span className={`${styles.noticeIcon} ${styles.noticeSuccess}`}><Icon name="check" size={16} /></span><p><strong>Term activity is healthy</strong><small>Attendance is up 1.2% across the network this term.</small></p><StatusBadge variant="success">On track</StatusBadge></div>
        </div>
      </DashboardPanel>
      <DashboardPanel title="School portfolio" description="Workspace status and enrollment at a glance." action={<Link href="/dashboard/schools">View all schools <Icon name="arrowUpRight" size={14} /></Link>}>
        <ResourceState error={schools.error} isLoading={schools.isLoading} onRetry={schools.refresh} />
        {schools.data && (
          <div className={styles.dashboardTableScroll}>
            <table className={styles.dashboardTable}>
              <thead><tr><th>SCHOOL</th><th>PRINCIPAL</th><th>STUDENTS</th><th>STAFF</th><th>STATUS</th></tr></thead>
              <tbody>{schools.data.map((school) => (
                <tr key={school.id}>
                  <td><strong>{school.name}</strong><small>{school.location}</small></td>
                  <td>{school.principal}</td><td>{school.students.toLocaleString()}</td><td>{school.staff}</td>
                  <td><StatusBadge variant={school.status === "Active" ? "success" : "warning"}>{school.status}</StatusBadge></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </DashboardPanel>
      <DashboardPanel title="Network activity" description="Recent enrollment decisions and upcoming milestones.">
        <ApprovalList approvals={data.pendingApprovals} />
        <EventList events={data.upcomingEvents.slice(0, 2)} />
      </DashboardPanel>
    </div>
  );
}

function PrincipalWorkspace({ events, approvals }: { events: SchoolEvent[]; approvals: SchoolOverview["pendingApprovals"] }) {
  const classrooms = useClassrooms();
  const reports = useAcademicReports();
  const attendance = useAttendance();
  return (
    <div className={styles.dashboardGrid}>
      <DashboardPanel title="Classroom pulse" description="Classes in session and the staff leading them." action={<Link href="/dashboard/classes">View classes <Icon name="arrowUpRight" size={14} /></Link>}>
        <ResourceState error={classrooms.error} isLoading={classrooms.isLoading} onRetry={classrooms.refresh} />
        {classrooms.data && (
          <div className={styles.classroomList}>
            {classrooms.data.slice(0, 4).map((room) => (
              <div className={styles.classroomRow} key={room.id}>
                <span className={styles.classroomIcon}><Icon name="book" size={16} /></span>
                <span><strong>{room.name}</strong><small>{room.sections.length} sections · {room.code}</small></span>
                <StatusBadge variant={room.isActive ? "success" : "warning"}>{room.isActive ? "Active" : "Inactive"}</StatusBadge>
              </div>
            ))}
          </div>
        )}
      </DashboardPanel>
      <DashboardPanel title="Attendance watch" description="School-wide daily attendance trends." action={<Link href="/dashboard/attendance">Review attendance <Icon name="arrowUpRight" size={14} /></Link>}>
        <ResourceState error={attendance.error} isLoading={attendance.isLoading} onRetry={attendance.refresh} />
        {attendance.data && (
          <div className={styles.attendanceWatch}>
            {attendance.data.slice(0, 3).map((record) => (
              <div key={record.id}><span>{record.date}</span><strong>{record.rate}</strong><small>{record.absent} absent · {record.late} late</small></div>
            ))}
          </div>
        )}
      </DashboardPanel>
      <DashboardPanel title="Academic reports" description="Latest school performance and progress reports." action={<Link href="/dashboard/analytics">Open analytics <Icon name="arrowUpRight" size={14} /></Link>}>
        <ResourceState error={reports.error} isLoading={reports.isLoading} onRetry={reports.refresh} />
        {reports.data && (
          <div className={styles.reportList}>
            {reports.data.slice(0, 4).map((report) => (
              <div key={report.id}><span className={styles.reportIcon}><Icon name="file" size={16} /></span><span><strong>{report.title}</strong><small>{report.category} · Updated {report.updatedAt}</small></span><span className={styles.eventArrow}><Icon name="arrowUpRight" size={15} /></span></div>
            ))}
          </div>
        )}
      </DashboardPanel>
      <DashboardPanel title="Leadership priorities" description="Student support and upcoming school commitments." action={<Link href="/dashboard/students">Review students <Icon name="arrowUpRight" size={14} /></Link>}>
        <ApprovalList approvals={approvals} />
        <EventList events={events.slice(0, 2)} />
      </DashboardPanel>
    </div>
  );
}

type Column<T> = DataTableColumn<T>;

function DirectoryTable<T extends { id: string }>({
  title,
  description,
  rows,
  columns,
  isLoading,
  error,
  refresh,
  searchText,
  headingAction,
  pagination,
  searchEnabled = true,
}: {
  title: string;
  description: string;
  rows: T[] | null;
  columns: Column<T>[];
  isLoading: boolean;
  error: string | null;
  refresh: () => void;
  searchText: (row: T) => string;
  headingAction?: ReactNode;
  pagination?: {
    page: number;
    totalPages: number;
    total: number;
    onChange: (page: number) => void;
  };
  searchEnabled?: boolean;
}) {
  return (
    <>
      <PageHeading eyebrow="SCHOOL MANAGEMENT" title={title} description={description}>
        <div className={styles.pageActions}>
          {headingAction}
          <button className={styles.outlineButton} type="button" onClick={refresh} disabled={isLoading}>
            <Icon className={isLoading ? styles.refreshing : undefined} name="refresh" size={16} />
            {isLoading ? "Refreshing…" : "Refresh"}
          </button>
        </div>
      </PageHeading>
      <DataTable
        title={title}
        description={rows ? `${pagination?.total ?? rows.length} records` : description}
        rows={rows}
        columns={columns}
        isLoading={isLoading}
        error={error}
        onRetry={refresh}
        searchText={searchText}
        searchEnabled={searchEnabled}
      />
      {pagination && pagination.totalPages > 1 && (
        <nav className={styles.pagination} aria-label="Student pages">
          <span>{pagination.total} students · Page {pagination.page} of {pagination.totalPages}</span>
          <div>
            <button type="button" onClick={() => pagination.onChange(pagination.page - 1)} disabled={pagination.page <= 1}>Previous</button>
            <button type="button" onClick={() => pagination.onChange(pagination.page + 1)} disabled={pagination.page >= pagination.totalPages}>Next</button>
          </div>
        </nav>
      )}
    </>
  );
}

export function StudentsDirectory() {
  return isApiMode ? <ApiStudentsDirectory /> : <PreviewStudentsDirectory />;
}

function PreviewStudentsDirectory() {
  const [page, setPage] = useState(1);
  const resource = useStudentsPage(page);
  const { session } = useAuthSession();
  const columns: Column<Student>[] = [
    { heading: "STUDENT", render: (row) => <span className={styles.tablePerson}><i>{row.name.split(" ").map((part) => part[0]).join("")}</i><span><Link className={styles.studentLink} href={`/dashboard/students/${row.id}`}>{row.name}</Link><small>{row.studentNumber}</small></span></span> },
    { heading: "CLASS & SECTION", render: (row) => [row.className ?? row.grade, row.sectionName].filter(Boolean).join(" · ") || "—" },
    { heading: "PARENT / GUARDIAN", render: (row) => row.guardian ?? "—" },
    { heading: "STATUS", render: (row) => <StatusBadge>{row.status}</StatusBadge> },
  ];
  const canCreate = !isApiMode || Boolean(
    session?.permissionKeys.includes("students.create") &&
    session.permissionKeys.includes("academic_structure.read"),
  );
  const students = resource.data?.data ?? null;
  return <DirectoryTable title="Students" description="View student records and their current class enrollment." rows={students} columns={columns} isLoading={resource.isLoading} error={resource.error} refresh={resource.refresh} searchText={(row) => `${row.name} ${row.studentNumber} ${row.className ?? row.grade} ${row.sectionName ?? ""}`} headingAction={canCreate ? <Link className={styles.primaryButton} href="/dashboard/students/new">+ Add student</Link> : undefined} pagination={resource.data ? { page: resource.data.meta.page, totalPages: resource.data.meta.totalPages, total: resource.data.meta.total, onChange: setPage } : undefined} searchEnabled={!isApiMode} />;
}

export function StaffDirectory() {
  const { session } = useAuthSession();
  return <SchoolStaffDirectory key={session?.activeSchool?.id ?? "no-school"} />;
}

function SchoolStaffDirectory() {
  const resource = useStaff();
  const { session } = useAuthSession();
  const canManage = Boolean(session?.scope === "school" && session.activeWorkspaceRole === "school_admin" && session.permissionKeys.includes("staff.manage"));
  const saveStaff = useSaveStaff();
  const deactivateStaff = useDeactivateStaff();
  const teacherActions = useTeacherActions();
  const assignments = useTeacherAssignments(canManage);
  const classrooms = useClassrooms(isApiMode && canManage);
  const [editing, setEditing] = useState<StaffMember | null>(null);
  const [employeeCode, setEmployeeCode] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [created, setCreated] = useState(false);
  const [assignmentStaffId, setAssignmentStaffId] = useState("");
  const [assignmentClassId, setAssignmentClassId] = useState("");
  const [assignmentSectionId, setAssignmentSectionId] = useState("");
  const [assignmentSubject, setAssignmentSubject] = useState("");
  const [isClassTeacher, setIsClassTeacher] = useState(false);
  const assignmentClass = classrooms.data?.find(
    (item) => item.id === assignmentClassId,
  );
  const departments = useDepartments(session?.activeSchool?.id, isApiMode && canManage);

  function resetForm() {
    setEditing(null);
    setEmployeeCode("");
    setFirstName("");
    setLastName("");
    setEmail("");
    setPhone("");
    setPassword("");
    setConfirmPassword("");
    setDepartmentId("");
    setCreateError(null);
  }

  function editStaff(row: StaffMember) {
    setEditing(row);
    setEmployeeCode(row.employeeCode ?? "");
    setFirstName(row.firstName ?? row.name.split(" ")[0] ?? "");
    setLastName(row.lastName ?? "");
    setEmail(row.email);
    setPhone(row.phone ?? "");
    setDepartmentId(row.departmentId ?? "");
    setPassword("");
    setConfirmPassword("");
    setCreateError(null);
    setCreated(false);
  }

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (creating) return;
    const input: UpdateStaffInput = {
      employeeCode: employeeCode.trim() || undefined,
      firstName: firstName.trim() || undefined,
      lastName: lastName.trim() || undefined,
      email: email.trim() || undefined,
      phone: phone.trim() || undefined,
      designation: "Teacher",
      departmentId: departmentId || null,
    };
    if (editing) {
      const saved = await saveStaff.save(editing.id, input);
      if (!saved) return;
      resetForm();
      resource.refresh();
      return;
    }
    if (password !== confirmPassword) {
      setCreateError("The passwords do not match.");
      return;
    }
    setCreating(true);
    setCreateError(null);
    setCreated(false);
    try {
      await schoolService.createTeacherAccount({
        employeeCode: employeeCode.trim(), firstName: firstName.trim(),
        lastName: lastName.trim() || undefined, email: email.trim(), password,
        phone: phone.trim() || undefined, departmentId: departmentId || undefined,
      });
      resetForm();
      setCreated(true);
      resource.refresh();
    } catch (reason) {
      setCreateError(reason instanceof Error ? reason.message : "Unable to create the Teacher account.");
    } finally {
      setCreating(false);
    }
  }

  async function handleDeactivate(row: StaffMember) {
    if (
      typeof window !== "undefined" &&
      !window.confirm(
        `Deactivate ${row.name}? Their Teacher access in this school will be revoked.`,
      )
    ) {
      return;
    }
    if (await deactivateStaff.deactivate(row.id)) resource.refresh();
  }

  async function handleAssignTeacher(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!assignmentStaffId || !assignmentClassId) return;
    const saved = await teacherActions.assignTeacher({
      staffId: assignmentStaffId,
      classId: assignmentClassId,
      ...(assignmentSectionId ? { sectionId: assignmentSectionId } : {}),
      ...(assignmentSubject.trim()
        ? { subject: assignmentSubject.trim() }
        : {}),
      isClassTeacher,
    });
    if (saved) {
      assignments.refresh();
      setAssignmentSubject("");
    }
  }

  const columns: Column<StaffMember>[] = [
    { heading: "STAFF MEMBER", render: (row) => <span className={styles.tablePerson}><i>{row.name.split(" ").map((part) => part[0]).join("")}</i><span><strong>{row.name}</strong><small>{row.email}</small></span></span> },
    { heading: "POSITION", render: (row) => row.position },
    { heading: "DEPARTMENT", render: (row) => row.department },
    { heading: "STATUS", render: (row) => <StatusBadge>{row.status}</StatusBadge> },
    ...(isApiMode && canManage
      ? [{
          heading: "ACTIONS",
          render: (row: StaffMember) => (
            <div className={styles.pageActions}>
              <button type="button" className={styles.outlineButton} onClick={() => editStaff(row)}>
                Edit
              </button>
              <button
                type="button"
                className={styles.outlineButton}
                disabled={deactivateStaff.isPending}
                onClick={() => void handleDeactivate(row)}
              >
                Deactivate
              </button>
            </div>
          ),
        }]
      : []),
  ];

  return (
    <>
      {isApiMode && canManage && (
        <div className={styles.createStructureForms}>
          <Panel
            title={editing ? "Edit staff profile" : "Add Teacher"}
            description={editing
              ? "Update this active-school staff profile."
              : "Create a Teacher login and staff profile. Share the password securely; no invitation is sent."}
          >
            <form className={styles.createStructureForm} onSubmit={handleSave}>
              <label>Employee code<input value={employeeCode} onChange={(event) => setEmployeeCode(event.target.value)} maxLength={20} required={!editing} /></label>
              <label>First name<input value={firstName} onChange={(event) => setFirstName(event.target.value)} maxLength={80} required={!editing} /></label>
              <label>Last name<input value={lastName} onChange={(event) => setLastName(event.target.value)} maxLength={80} /></label>
              <label>{editing ? "Contact email" : "Login email"}<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} maxLength={160} required={!editing} /></label>
              <label>Phone<input value={phone} onChange={(event) => setPhone(event.target.value)} maxLength={30} /></label>
              {!editing && <label>Initial password<input type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} minLength={12} maxLength={1024} required /></label>}
              {!editing && <label>Confirm password<input type="password" autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} minLength={12} maxLength={1024} required /></label>}
              <label>Designation<select defaultValue="Teacher"><option value="Teacher">Teacher</option></select></label>
              <label>Department (optional)<select value={departmentId} onChange={(event) => setDepartmentId(event.target.value)} disabled={!departments.data}><option value="">No department</option>{departments.data?.filter((item) => item.isActive || item.id === departmentId).map((item) => <option key={item.id} value={item.id}>{item.name}{!item.isActive ? " (inactive)" : ""}</option>)}</select></label>
              <button type="submit" disabled={saveStaff.isPending || creating || !departments.data}>{saveStaff.isPending || creating ? "Saving…" : editing ? "Save changes" : "Create Teacher account"}</button>
              {editing && <button type="button" className={styles.outlineButton} onClick={resetForm}>Cancel</button>}
            </form>
            <ResourceState isLoading={departments.isLoading} error={departments.error} onRetry={departments.refresh} />
            <p><Link href="/dashboard/settings">Manage departments in Settings</Link>, or continue without one.</p>
            {createError && <p className={styles.structureFormError} role="alert">{createError}</p>}
            {created && <p role="status">Teacher account created. Share the initial password securely.</p>}
            {saveStaff.error && <p className={styles.structureFormError} role="alert">{saveStaff.error}</p>}
            {deactivateStaff.error && <p className={styles.structureFormError} role="alert">{deactivateStaff.error}</p>}
          </Panel>
          <Panel
            title="Class and section assignments"
            description="Assign Teachers to active classes or sections. A section can have only one designated class teacher."
          >
            <ResourceState
              error={assignments.error ?? classrooms.error}
              isLoading={assignments.isLoading || classrooms.isLoading}
              onRetry={() => {
                assignments.refresh();
                classrooms.refresh();
              }}
            />
            <form
              className={styles.createStructureForm}
              onSubmit={(event) => void handleAssignTeacher(event)}
            >
              <label>
                Teacher
                <select
                  value={assignmentStaffId}
                  onChange={(event) => setAssignmentStaffId(event.target.value)}
                  required
                >
                  <option value="">Select a teacher</option>
                  {(resource.data ?? [])
                    .filter((member) => member.status === "Active")
                    .map((member) => (
                      <option key={member.id} value={member.id}>
                        {member.name}
                      </option>
                    ))}
                </select>
              </label>
              <label>
                Class
                <select
                  value={assignmentClassId}
                  onChange={(event) => {
                    setAssignmentClassId(event.target.value);
                    setAssignmentSectionId("");
                  }}
                  required
                >
                  <option value="">Select a class</option>
                  {(classrooms.data ?? [])
                    .filter((item) => item.isActive)
                    .map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                </select>
              </label>
              <label>
                Section (optional)
                <select
                  value={assignmentSectionId}
                  onChange={(event) => setAssignmentSectionId(event.target.value)}
                  required={isClassTeacher}
                >
                  <option value="">All active sections in class</option>
                  {(assignmentClass?.sections ?? [])
                    .filter((section) => section.isActive)
                    .map((section) => (
                      <option key={section.id} value={section.id}>
                        {section.name}
                      </option>
                    ))}
                </select>
              </label>
              <label>
                Subject (optional)
                <input
                  value={assignmentSubject}
                  onChange={(event) => setAssignmentSubject(event.target.value)}
                  maxLength={80}
                />
              </label>
              <label className={styles.classTeacherToggle}>
                <input
                  type="checkbox"
                  checked={isClassTeacher}
                  onChange={(event) => setIsClassTeacher(event.target.checked)}
                />
                Designate as class teacher for this section
              </label>
              <button
                type="submit"
                disabled={
                  teacherActions.isPending ||
                  !assignmentStaffId ||
                  !assignmentClassId ||
                  (isClassTeacher && !assignmentSectionId)
                }
              >
                {teacherActions.isPending ? "Saving..." : "Save assignment"}
              </button>
            </form>
            {teacherActions.error && (
              <p className={styles.structureFormError} role="alert">
                {teacherActions.error}
              </p>
            )}
            {assignments.data && assignments.data.length > 0 && (
              <ul className={styles.teacherAssignmentList}>
                {assignments.data.map((assignment) => (
                  <li key={assignment.id}>
                    <span>
                      <strong>{assignment.staffName}</strong>
                      <small>
                        {assignment.className}
                        {assignment.sectionName
                          ? ` · ${assignment.sectionName}`
                          : " · All sections"}
                        {assignment.subject ? ` · ${assignment.subject}` : ""}
                      </small>
                    </span>
                    {assignment.isClassTeacher && (
                      <StatusBadge variant="success">Class teacher</StatusBadge>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      )}
      <DirectoryTable title="Staff" description="View and manage staff profiles for the active school." rows={resource.data} columns={columns} isLoading={resource.isLoading} error={resource.error} refresh={resource.refresh} searchText={(row) => `${row.name} ${row.email} ${row.position} ${row.department}`} />
    </>
  );
}

export function ClassroomsDirectory() {
  const resource = useClassrooms();
  const { session } = useAuthSession();
  const createClassroom = useCreateClassroomWithSection();
  const [className, setClassName] = useState("");
  const [classCode, setClassCode] = useState("");
  const [sortOrder, setSortOrder] = useState("");
  const [firstSectionName, setFirstSectionName] = useState("");
  const [firstSectionCode, setFirstSectionCode] = useState("");
  const [firstSectionCapacity, setFirstSectionCapacity] = useState("");
  const canManage = Boolean(
    session?.permissionKeys.includes("academic_structure.manage"),
  );
  const columns: Column<Classroom>[] = [
    { heading: "CLASS", render: (row) => <span className={styles.tablePerson}><Link className={styles.studentLink} href={`/dashboard/classes/${encodeURIComponent(row.id)}`}>{row.name}</Link><small>{row.code}</small></span> },
    { heading: "SECTIONS", render: (row) => row.sections.length === 0 ? "—" : row.sections.map((section) => `${section.name} (${section.code})${section.capacity === null ? "" : ` · Capacity ${section.capacity}`}${section.isActive ? "" : " · Inactive"}`).join(", ") },
    { heading: "STATUS", render: (row) => <StatusBadge variant={row.isActive ? "success" : "warning"}>{row.isActive ? "Active" : "Inactive"}</StatusBadge> },
  ];

  async function handleCreateClass(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const classroom = await createClassroom.create({
      name: className.trim(),
      code: classCode.trim(),
      sortOrder: sortOrder ? Number(sortOrder) : undefined,
      section: {
        name: firstSectionName.trim(),
        code: firstSectionCode.trim(),
        capacity: firstSectionCapacity ? Number(firstSectionCapacity) : undefined,
      },
    });
    if (!classroom) return;
    setClassName("");
    setClassCode("");
    setSortOrder("");
    setFirstSectionName("");
    setFirstSectionCode("");
    setFirstSectionCapacity("");
    resource.refresh();
  }

  return (
    <>
      {isApiMode && canManage && (
        <div className={styles.classCreateCard}>
          <Panel title="Create class and first section" description="Add a class and its first section together. Class codes must be unique within the school.">
            <form className={styles.createStructureForm} onSubmit={handleCreateClass}>
              <label>Class name<input value={className} onChange={(event) => setClassName(event.target.value)} maxLength={80} required /></label>
              <label>Class code<input value={classCode} onChange={(event) => setClassCode(event.target.value)} maxLength={20} required /></label>
              <label>Sort order<input type="number" min="0" step="1" value={sortOrder} onChange={(event) => setSortOrder(event.target.value)} /></label>
              <label>First section name<input value={firstSectionName} onChange={(event) => setFirstSectionName(event.target.value)} maxLength={40} required /></label>
              <label>First section code<input value={firstSectionCode} onChange={(event) => setFirstSectionCode(event.target.value)} maxLength={20} required /></label>
              <label>First section capacity<input type="number" min="1" step="1" value={firstSectionCapacity} onChange={(event) => setFirstSectionCapacity(event.target.value)} /></label>
              <button type="submit" disabled={createClassroom.isPending}>{createClassroom.isPending ? "Creating…" : "Create class and section"}</button>
            </form>
            {createClassroom.error && <p className={styles.structureFormError} role="alert">{createClassroom.error}</p>}
          </Panel>
        </div>
      )}
      {isApiMode && !canManage && <p className={styles.structureReadOnly}>You have read-only access to classes and sections.</p>}
      <DirectoryTable title="Classes & sections" description="View academic classes and their configured sections." rows={resource.data} columns={columns} isLoading={resource.isLoading} error={resource.error} refresh={resource.refresh} searchText={(row) => `${row.name} ${row.code} ${row.sections.map((section) => `${section.name} ${section.code}`).join(" ")}`} />
    </>
  );
}

export function SchoolsDirectory() {
  const resource = useSchools();
  const columns: Column<School>[] = [
    { heading: "SCHOOL", render: (row) => <span className={styles.schoolName}><strong>{row.name}</strong><small>{row.id}</small></span> },
    { heading: "LOCATION", render: (row) => row.location },
    { heading: "PRINCIPAL", render: (row) => row.principal },
    { heading: "STUDENTS", render: (row) => row.students.toLocaleString() },
    { heading: "STAFF", render: (row) => row.staff },
    { heading: "STATUS", render: (row) => <StatusBadge>{row.status}</StatusBadge> },
  ];
  return <DirectoryTable title="Schools" description="Oversee school locations, leadership, and enrollment." rows={resource.data} columns={columns} isLoading={resource.isLoading} error={resource.error} refresh={resource.refresh} searchText={(row) => `${row.name} ${row.location} ${row.principal}`} />;
}

export function AttendanceDirectory() {
  return isApiMode ? <ApiAttendanceDirectory /> : <MockAttendanceDirectory />;
}

function MockAttendanceDirectory() {
  const resource = useAttendance();
  const columns: Column<AttendanceRecord>[] = [
    { heading: "DATE", render: (row) => <strong className={styles.tableStrong}>{row.date}</strong> },
    { heading: "GRADE", render: (row) => row.grade },
    { heading: "PRESENT", render: (row) => row.present.toLocaleString() },
    { heading: "ABSENT", render: (row) => row.absent },
    { heading: "LATE", render: (row) => row.late },
    { heading: "ATTENDANCE RATE", render: (row) => <strong className={styles.rateValue}>{row.rate}</strong> },
  ];
  return <DirectoryTable title="Attendance" description="Monitor attendance and spot patterns across grade levels." rows={resource.data} columns={columns} isLoading={resource.isLoading} error={resource.error} refresh={resource.refresh} searchText={(row) => `${row.date} ${row.grade} ${row.rate}`} />;
}

function dateInTimezone(timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const part = (type: "year" | "month" | "day") => parts.find((value) => value.type === type)?.value;
  const year = part("year");
  const month = part("month");
  const day = part("day");
  if (!year || !month || !day) throw new Error("Unable to determine today in the school timezone.");
  return `${year}-${month}-${day}`;
}

function ApiAttendanceDirectory() {
  const profile = useSchoolProfile();
  const classrooms = useClassrooms();
  const { session } = useAuthSession();
  const [date, setDate] = useState("");
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [classId, setClassId] = useState("");
  const [sectionId, setSectionId] = useState("");
  const [statuses, setStatuses] = useState<Record<string, AttendanceSessionRecord["status"]>>({});
  const activeDate = date || (profile.data ? dateInTimezone(profile.data.timezone) : "");
  const sessions = useAttendanceSessions(activeDate, Boolean(activeDate));
  const roster = useAttendanceRoster(selectedSessionId);
  const actions = useAttendanceActions();
  const permissionKeys = session?.permissionKeys ?? [];
  const canManage = permissionKeys.includes("attendance.mark");
  const canClose = permissionKeys.includes("attendance.correct");
  const classOptions = (classrooms.data ?? []).filter((item) => item.isActive);
  const sections = (classOptions.find((item) => item.id === classId)?.sections ?? [])
    .filter((item) => item.isActive);
  const selectedSession = sessions.data?.find((item) => item.id === selectedSessionId) ?? null;

  async function createSession(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!classId || !sectionId || !activeDate) return;
    const created = await actions.run(() => schoolService.createAttendanceSession({ classId, sectionId, date: activeDate }));
    if (created) {
      sessions.refresh();
      setSelectedSessionId(created.id);
      setStatuses({});
    }
  }

  async function saveMarks(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedSessionId) return;
    const records = (roster.data ?? []).flatMap((student) => {
      const status = statuses[student.id];
      return !student.record && status ? [{ studentId: student.id, status }] : [];
    });
    if (records.length === 0) return;
    const result = await actions.run(() => schoolService.markAttendance(selectedSessionId, { records }));
    if (result) {
      roster.refresh();
      sessions.refresh();
      setStatuses({});
    }
  }

  async function closeSession(item: AttendanceSession) {
    const result = await actions.run(() => schoolService.closeAttendanceSession(item.id));
    if (result) {
      sessions.refresh();
      roster.refresh();
    }
  }

  return (
    <>
      <PageHeading eyebrow="SCHOOL WORKSPACE" title="Attendance" description="Create a dated class session, mark the enrolled roster, and close it when complete." />
      <ResourceState
        error={profile.error ?? classrooms.error ?? sessions.error}
        isLoading={profile.isLoading || classrooms.isLoading || (Boolean(date) && sessions.isLoading)}
        onRetry={() => { profile.refresh(); classrooms.refresh(); sessions.refresh(); }}
      />
      {profile.data && (
        <section className={styles.settingsCard}>
          <div><h2>Attendance sessions</h2><p>Dates are interpreted in {profile.data.timezone}.</p></div>
          <label>School date<input type="date" value={activeDate} onChange={(event) => { setDate(event.target.value); setSelectedSessionId(null); setStatuses({}); }} required /></label>
          {canManage && (
            <form className={styles.settingsGrid} onSubmit={createSession}>
              <label>Class<select value={classId} onChange={(event) => { setClassId(event.target.value); setSectionId(""); }} required>
                <option value="">Select a class</option>
                {classOptions.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}
              </select></label>
              <label>Section<select value={sectionId} onChange={(event) => setSectionId(event.target.value)} required disabled={!classId}>
                <option value="">Select a section</option>
                {sections.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}
              </select></label>
              <button type="submit" disabled={actions.isPending || !activeDate}>{actions.isPending ? "Creating..." : "Create session"}</button>
            </form>
          )}
          {sessions.data && sessions.data.length === 0 && <p>No sessions exist for this date.</p>}
          {sessions.data && sessions.data.length > 0 && (
            <div className={styles.roleList}>
              {sessions.data.map((item) => {
                const classroom = classOptions.find((value) => value.id === item.classId);
                const section = classroom?.sections.find((value) => value.id === item.sectionId);
                return (
                  <div className={styles.roleRow} key={item.id}>
                    <div><strong>{classroom?.name ?? "Class"}{section ? ` · ${section.name}` : ""}</strong><span>{item.records.length} marked · {item.status.toLowerCase()}</span></div>
                    <button className={styles.outlineButton} type="button" onClick={() => { setSelectedSessionId(item.id); setStatuses({}); }}>{selectedSessionId === item.id ? "Selected" : "Open roster"}</button>
                    {item.status === "OPEN" && canClose && <button className={styles.outlineButton} type="button" disabled={actions.isPending} onClick={() => void closeSession(item)}>Close session</button>}
                  </div>
                );
              })}
            </div>
          )}
          {selectedSession && selectedSession.status === "OPEN" && canManage && (
            <form onSubmit={saveMarks}>
              <h3>Roster</h3>
              <ResourceState error={roster.error} isLoading={roster.isLoading} onRetry={roster.refresh} />
              {roster.data && (
                <>
                  <div className={styles.tableScroll}>
                    <table className={styles.table}><thead><tr><th>STUDENT</th><th>ADMISSION NO.</th><th>STATUS</th></tr></thead>
                      <tbody>{roster.data.map((student) => (
                        <tr key={student.id}><td>{student.name}</td><td>{student.admissionNumber}</td><td>
                          {student.record ? student.record.status.toLowerCase() : (
                            <select aria-label={`Attendance status for ${student.name}`} value={statuses[student.id] ?? ""} onChange={(event) => {
                              const value = event.target.value;
                              setStatuses((current) => {
                                const next = { ...current };
                                if (["PRESENT", "ABSENT", "LATE", "EXCUSED"].includes(value)) {
                                  next[student.id] = value as AttendanceSessionRecord["status"];
                                } else {
                                  delete next[student.id];
                                }
                                return next;
                              });
                            }}>
                              <option value="">Unmarked</option><option value="PRESENT">Present</option><option value="ABSENT">Absent</option><option value="LATE">Late</option><option value="EXCUSED">Excused</option>
                            </select>
                          )}
                        </td></tr>
                      ))}</tbody>
                    </table>
                  </div>
                  {actions.error && <div className={styles.errorState} role="alert">{actions.error}</div>}
                  <button type="submit" disabled={actions.isPending || !Object.keys(statuses).length}>{actions.isPending ? "Saving..." : "Save attendance"}</button>
                </>
              )}
            </form>
          )}
          {actions.error && <div className={styles.errorState} role="alert">{actions.error}</div>}
        </section>
      )}
    </>
  );
}

export function AcademicReportsDirectory() {
  return isApiMode
    ? <ApiAttendanceReportDirectory />
    : <MockAcademicReportsDirectory />;
}

function MockAcademicReportsDirectory() {
  const resource = useAcademicReports();
  const columns: Column<AcademicReport>[] = [
    { heading: "REPORT", render: (row) => <strong className={styles.tableStrong}>{row.title}</strong> },
    { heading: "CATEGORY", render: (row) => row.category },
    { heading: "LAST UPDATED", render: (row) => row.updatedAt },
    { heading: "OWNER", render: (row) => row.owner },
    { heading: "ACTION", render: () => <span className={styles.reportAction}>Open report ↗</span> },
  ];
  return <DirectoryTable title="Academic reports" description="Review enrollment, attendance, and academic performance." rows={resource.data} columns={columns} isLoading={resource.isLoading} error={resource.error} refresh={resource.refresh} searchText={(row) => `${row.title} ${row.category} ${row.owner}`} />;
}

function ApiAttendanceReportDirectory() {
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [requestedRange, setRequestedRange] = useState<{
    fromDate: string;
    toDate: string;
  } | null>(null);
  const [rangeError, setRangeError] = useState<string | null>(null);
  const report = useAttendanceReport(
    requestedRange?.fromDate ?? null,
    requestedRange?.toDate ?? null,
  );

  function generateReport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setRangeError(null);
    if (!fromDate || !toDate || fromDate > toDate) {
      setRangeError("Choose a valid date range with the start date on or before the end date.");
      return;
    }
    if (
      requestedRange?.fromDate === fromDate &&
      requestedRange.toDate === toDate
    ) {
      report.refresh();
    } else {
      setRequestedRange({ fromDate, toDate });
    }
  }

  return (
    <>
      <PageHeading
        eyebrow="REPORTS"
        title="Attendance report"
        description="School-wide counts from closed attendance sessions for a selected date range."
      />
      <form className={styles.reportFilters} onSubmit={generateReport}>
        <label className={styles.reportDateField} htmlFor="attendance-report-from">
          From date
          <input
            id="attendance-report-from"
            type="date"
            required
            value={fromDate}
            onChange={(event) => setFromDate(event.target.value)}
          />
        </label>
        <label className={styles.reportDateField} htmlFor="attendance-report-to">
          To date
          <input
            id="attendance-report-to"
            type="date"
            required
            value={toDate}
            onChange={(event) => setToDate(event.target.value)}
          />
        </label>
        <button className={styles.primaryButton} type="submit" disabled={report.isLoading}>
          {report.isLoading ? "Generating…" : "Generate report"}
        </button>
      </form>
      {rangeError && <p className={styles.reportError} role="alert">{rangeError}</p>}
      {requestedRange && (
        <ResourceState
          error={report.error}
          isLoading={report.isLoading}
          onRetry={report.refresh}
        />
      )}
      {report.data && (
        <>
          <div className={styles.reportResultActions}>
            <p className={styles.reportSummary}>
              {report.data.fromDate} to {report.data.toDate} · {report.data.totalSessions} closed sessions · {report.data.totalRecords} attendance records
            </p>
            <button
              className={styles.outlineButton}
              type="button"
              onClick={() => {
                if (report.data) downloadAttendanceReportCsv(report.data);
              }}
            >
              Download CSV
            </button>
          </div>
          <p className={styles.reportExportNote}>
            Aggregate counts only. The CSV is downloaded to your device and is not stored by Dashify.
          </p>
          <section className={styles.metricsGrid} aria-label="Attendance report counts">
            <MetricCard label="Present" value={report.data.statusCounts.PRESENT.toLocaleString()} detail="Recorded status" icon="users" tone="green" />
            <MetricCard label="Absent" value={report.data.statusCounts.ABSENT.toLocaleString()} detail="Recorded status" icon="users" tone="orange" />
            <MetricCard label="Late" value={report.data.statusCounts.LATE.toLocaleString()} detail="Recorded status" icon="clock" tone="violet" />
            <MetricCard label="Excused" value={report.data.statusCounts.EXCUSED.toLocaleString()} detail="Recorded status" icon="check" tone="blue" />
          </section>
          {report.data.dailyBreakdown.length > 0 && (
            <section className={styles.panel} aria-labelledby="daily-attendance-breakdown">
              <div className={styles.panelHeading}>
                <div>
                  <h2 id="daily-attendance-breakdown">Daily attendance breakdown</h2>
                  <p>Counts for each date with at least one closed attendance session.</p>
                </div>
              </div>
              <div className={styles.tableScroll}>
                <table className={styles.table} aria-label="Daily attendance counts">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Closed sessions</th>
                      <th>Records</th>
                      <th>Present</th>
                      <th>Absent</th>
                      <th>Late</th>
                      <th>Excused</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.data.dailyBreakdown.map((day) => (
                      <tr key={day.date}>
                        <td>{day.date}</td>
                        <td>{day.totalSessions.toLocaleString()}</td>
                        <td>{day.totalRecords.toLocaleString()}</td>
                        <td>{day.statusCounts.PRESENT.toLocaleString()}</td>
                        <td>{day.statusCounts.ABSENT.toLocaleString()}</td>
                        <td>{day.statusCounts.LATE.toLocaleString()}</td>
                        <td>{day.statusCounts.EXCUSED.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
          {report.data.totalSessions === 0 && (
            <p className={styles.reportSummary}>No closed attendance sessions were found for this date range.</p>
          )}
        </>
      )}
    </>
  );
}

export function AcademicAnalytics() {
  const resource = useAttendance();
  const average = resource.data?.length
    ? `${(resource.data.reduce((sum, row) => sum + Number.parseFloat(row.rate), 0) / resource.data.length).toFixed(1)}%`
    : "—";
  return (
    <>
      <PageHeading eyebrow="SCHOOL PERFORMANCE" title="Academic analytics" description="Understand attendance and enrollment trends across your school.">
        <button className={styles.outlineButton} type="button" onClick={resource.refresh} disabled={resource.isLoading}>
          <Icon className={resource.isLoading ? styles.refreshing : undefined} name="refresh" size={16} />
          {resource.isLoading ? "Refreshing…" : "Refresh"}
        </button>
      </PageHeading>
      <ResourceState error={resource.error} isLoading={resource.isLoading} onRetry={resource.refresh} />
      {resource.data && <>
        <div className={styles.metricsGrid}>
          <MetricCard label="Average attendance" value={average} detail="Across recent school days" icon="calendarCheck" tone="green" />
          <MetricCard label="Students present today" value={resource.data[0]?.present.toLocaleString() ?? "—"} detail="Latest attendance record" icon="users" tone="blue" />
          <MetricCard label="Students absent today" value={resource.data[0]?.absent.toLocaleString() ?? "—"} detail="Latest attendance record" icon="clock" tone="orange" />
          <MetricCard label="Late arrivals" value={resource.data[0]?.late.toLocaleString() ?? "—"} detail="Latest attendance record" icon="chart" tone="violet" />
        </div>
        <section className={styles.panel}><div className={styles.panelHeading}><div><h2>Recent attendance</h2><p>Daily school attendance summary.</p></div><Link href="/dashboard/attendance">Full attendance <span aria-hidden="true">↗</span></Link></div><div className={styles.tableScroll}><table className={styles.table}><thead><tr><th>DATE</th><th>PRESENT</th><th>ABSENT</th><th>LATE</th><th>ATTENDANCE RATE</th></tr></thead><tbody>{resource.data.map((row) => <tr key={row.id}><td>{row.date}</td><td>{row.present.toLocaleString()}</td><td>{row.absent}</td><td>{row.late}</td><td><strong className={styles.rateValue}>{row.rate}</strong></td></tr>)}</tbody></table></div></section>
      </>}
    </>
  );
}

function MockSchoolSettings() {
  const resource = useSchoolSettings();
  const { update, isPending, error } = useUpdateSchoolSettings();
  const [draftSettings, setDraftSettings] = useState<SchoolSettingsData | null>(null);
  const [saved, setSaved] = useState(false);
  const settings = draftSettings ?? resource.data;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!settings) return;
    const updated = await update(settings);
    if (updated) {
      setDraftSettings(updated);
      setSaved(true);
    }

  }

  return (
    <>
      <PageHeading eyebrow="SCHOOL WORKSPACE" title="Settings" description="Manage school profile and workspace preferences." />
      <ResourceState error={resource.error} isLoading={resource.isLoading} onRetry={resource.refresh} />
      {settings && <>
        <form onSubmit={handleSubmit}>
          <section className={styles.settingsCard}>
            <div><h2>School profile</h2><p>Update your institution details and the information your community sees.</p></div>
            <div className={styles.settingsGrid}>
              <label>School name<input value={settings.schoolName} onChange={(event) => { setDraftSettings({ ...settings, schoolName: event.target.value }); setSaved(false); }} required /></label>
              <label>School email<input type="email" value={settings.email} onChange={(event) => { setDraftSettings({ ...settings, email: event.target.value }); setSaved(false); }} required /></label>
              <label>School type<select value={settings.schoolType} onChange={(event) => { if (event.target.value === "private" || event.target.value === "public" || event.target.value === "charter") setDraftSettings({ ...settings, schoolType: event.target.value }); setSaved(false); }}><option value="private">Private school</option><option value="public">Public school</option><option value="charter">Charter school</option></select></label>
              <label>School year<select value={settings.academicYear} onChange={(event) => { if (event.target.value === "2026-27" || event.target.value === "2025-26") setDraftSettings({ ...settings, academicYear: event.target.value }); setSaved(false); }}><option value="2026-27">2026–2027</option><option value="2025-26">2025–2026</option></select></label>
            </div>
            {error && <div className={styles.errorState} role="alert">{error}</div>}
            <div className={styles.settingsSave}><span>{saved ? "Your school settings are saved." : "Settings are saved to the active service."}</span><button type="submit" disabled={isPending}>{isPending ? "Saving..." : "Save changes"}</button></div>
          </section>
          <section className={styles.settingsCard}>
            <div><h2>Notifications</h2><p>Choose which school updates are sent to your inbox.</p></div>
            <label className={styles.preference}><span><strong>Enrollment requests</strong><small>Get notified when a new student applies.</small></span><input type="checkbox" checked={settings.enrollmentNotifications} onChange={(event) => { setDraftSettings({ ...settings, enrollmentNotifications: event.target.checked }); setSaved(false); }} /></label>
            <label className={styles.preference}><span><strong>Daily attendance summary</strong><small>Receive a daily school attendance recap.</small></span><input type="checkbox" checked={settings.attendanceNotifications} onChange={(event) => { setDraftSettings({ ...settings, attendanceNotifications: event.target.checked }); setSaved(false); }} /></label>
          </section>
          <section className={styles.settingsCard}>
            <div>
              <h2>School roles & permissions</h2>
              <p>Review the access each member role is designed to have.</p>
            </div>
            <div className={styles.roleList}>
              {[
                ["School administrator", "School profile, people, classes, and settings"],
                ["Principal", "Academic overview, attendance, and student support"],
                ["Teacher", "Assigned classes, class registers, and coursework"],
                ["Accountant", "Fee collection, invoices, and payment receipts"],
                ["Parent", "Linked child’s attendance, progress, and updates"],
                ["Student", "Personal timetable, assignments, and results"],
              ].map(([role, permissions]) => (
                <div className={styles.roleRow} key={role}>
                  <div><strong>{role}</strong><span>{permissions}</span></div>
                  <StatusBadge variant="info">Preview role</StatusBadge>
                </div>
              ))}
            </div>
            <p className={styles.permissionsNote}>
              These are preview permissions. Enforce role access in your trusted API before production.
            </p>
          </section>
        </form>
      </>}
    </>
  );
}

function ApiSchoolSettings() {
  const resource = useSchoolProfile();
  const { session } = useAuthSession();
  const { update, isPending, error } = useUpdateSchoolProfile();
  const [draft, setDraft] = useState<UpdateSchoolProfileInput | null>(null);
  const [saved, setSaved] = useState(false);
  const profile = draft ?? (resource.data ? {
    name: resource.data.name,
    email: resource.data.email,
    phone: resource.data.phone,
    timezone: resource.data.timezone,
    locale: resource.data.locale,
  } : null);
  const canUpdate = Boolean(session?.permissionKeys.includes("school.update"));

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!profile || !canUpdate) return;
    const updated = await update(profile);
    if (updated) {
      setDraft({
        name: updated.name,
        email: updated.email,
        phone: updated.phone,
        timezone: updated.timezone,
        locale: updated.locale,
      });
      setSaved(true);
    }
  }

  return (
    <>
      <PageHeading eyebrow="SCHOOL WORKSPACE" title="Settings" description="Manage the active school's profile, timezone, and locale." />
      <ResourceState error={resource.error} isLoading={resource.isLoading} onRetry={resource.refresh} />
      {profile && (
        <form onSubmit={handleSubmit}>
          <section className={styles.settingsCard}>
            <div><h2>School profile</h2><p>These details are stored on the active school record.</p></div>
            <div className={styles.settingsGrid}>
              <label>School name<input value={profile.name} onChange={(event) => { setDraft({ ...profile, name: event.target.value }); setSaved(false); }} required disabled={!canUpdate} /></label>
              <label>School email<input type="email" value={profile.email ?? ""} onChange={(event) => { setDraft({ ...profile, email: event.target.value || null }); setSaved(false); }} disabled={!canUpdate} /></label>
              <label>Phone<input type="tel" value={profile.phone ?? ""} onChange={(event) => { setDraft({ ...profile, phone: event.target.value || null }); setSaved(false); }} disabled={!canUpdate} /></label>
              <label>Timezone<input value={profile.timezone} onChange={(event) => { setDraft({ ...profile, timezone: event.target.value }); setSaved(false); }} required disabled={!canUpdate} /></label>
              <label>Locale<input value={profile.locale} onChange={(event) => { setDraft({ ...profile, locale: event.target.value }); setSaved(false); }} required disabled={!canUpdate} /></label>
            </div>
            {!canUpdate && <p className={styles.permissionsNote}>Your account does not have permission to update this profile.</p>}
            {error && <div className={styles.errorState} role="alert">{error}</div>}
            {canUpdate && <div className={styles.settingsSave}><span>{saved ? "School profile saved." : "Changes are saved to the active school."}</span><button type="submit" disabled={isPending}>{isPending ? "Saving..." : "Save changes"}</button></div>}
          </section>
        </form>
      )}
      {session?.scope === "school" && session.activeWorkspaceRole === "school_admin" && canUpdate && (
        <>
          <AdmissionSettings key={`admissions-${session.activeSchool?.id}`} />
          {session.activeSchool?.id && session.permissionKeys.includes("staff.read") && <DepartmentSettings key={`departments-${session.activeSchool.id}`} schoolId={session.activeSchool.id} />}
        </>
      )}
    </>
  );
}

export function SchoolSettings() {
  return isApiMode ? <ApiSchoolSettings /> : <MockSchoolSettings />;
}

export function SchoolDashboardView({ role, userName }: { role: SchoolRole; userName: string }) {
  return <RoleDashboard sessionRole={role} userName={userName} />;
}
