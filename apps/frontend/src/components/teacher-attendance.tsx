"use client";

import { useState, type FormEvent } from "react";
import { PageHeading } from "@/components/ui/page-heading";
import { Panel } from "@/components/ui/panel";
import { ResourceState } from "@/components/ui/resource-state";
import { useAuthSession } from "@/hooks/use-auth";
import { isApiMode } from "@/services";
import {
  useTeacherActions,
  useTeacherAttendance,
  useTeacherDashboard,
  useTeacherSections,
  useTeacherYearSelection,
} from "@/hooks/use-school-data";
import type { TeacherAttendanceStatus } from "@/types/school";
import styles from "./teacher-workspace.module.css";
import { TeacherAcademicYearSelector } from "./teacher-academic-year-selector";

const statuses: TeacherAttendanceStatus[] = [
  "PRESENT",
  "ABSENT",
  "LATE",
  "EXCUSED",
];

const statusClassNames: Record<TeacherAttendanceStatus, string> = {
  PRESENT: styles.statusPresent,
  ABSENT: styles.statusAbsent,
  LATE: styles.statusLate,
  EXCUSED: styles.statusExcused,
};

function formatStatus(status: TeacherAttendanceStatus) {
  return status[0] + status.slice(1).toLowerCase();
}

export function TeacherAttendanceView() {
  const { session } = useAuthSession();
  const yearSelection = useTeacherYearSelection();
  const yearId = yearSelection.selectedYearId;
  const dashboard = useTeacherDashboard(yearId || undefined);
  const sections = useTeacherSections(yearId || undefined);
  const [sectionId, setSectionId] = useState("");
  const [date, setDate] = useState("");
  const [search, setSearch] = useState("");
  const [edits, setEdits] = useState<
    Record<string, Record<string, TeacherAttendanceStatus | "">>
  >({});
  const [remarks, setRemarks] = useState<Record<string, Record<string, string>>>(
    {},
  );
  const assignedSections = sections.data?.sections ?? [];
  const selectedSectionId = sectionId || assignedSections[0]?.id || "";
  const academicYear = yearSelection.selectedYear;
  const selectedDateIsInYear = Boolean(
    date &&
      academicYear &&
      date >= academicYear.startDate.slice(0, 10) &&
      date <= academicYear.endDate.slice(0, 10),
  );
  const defaultDateIsInYear = Boolean(
    dashboard.data?.localDate &&
      academicYear &&
      dashboard.data.localDate >= academicYear.startDate.slice(0, 10) &&
      dashboard.data.localDate <= academicYear.endDate.slice(0, 10),
  );
  const selectedDate = selectedDateIsInYear
    ? date
    : academicYear?.status === "ACTIVE" && defaultDateIsInYear
      ? dashboard.data?.localDate ?? ""
      : "";
  const selectionKey = `${selectedSectionId}:${selectedDate}`;
  const values = edits[selectionKey] ?? {};
  const remarkValues = remarks[selectionKey] ?? {};
  const attendance = useTeacherAttendance(yearId, selectedSectionId, selectedDate);
  const actions = useTeacherActions();
  const canMark =
    !isApiMode ||
    session?.permissionKeys.includes("teacher.attendance.mark") === true;
  const statusFor = (
    studentId: string,
    status: TeacherAttendanceStatus | null,
  ) => values[studentId] ?? status ?? "";
  const isToday = Boolean(
    selectedDate && selectedDate === dashboard.data?.localDate,
  );
  const canEdit =
    Boolean(attendance.data?.canEdit) &&
    isToday &&
    academicYear?.status === "ACTIVE" &&
    canMark &&
    !actions.isPending;
  const filteredStudents =
    attendance.data?.students.filter((student) => {
      const query = search.trim().toLocaleLowerCase();
      return (
        !query ||
        student.name.toLocaleLowerCase().includes(query) ||
        (student.rollNumber ?? "").toLocaleLowerCase().includes(query)
      );
    }) ?? [];
  const statusCounts = statuses.reduce<Record<TeacherAttendanceStatus, number>>(
    (counts, status) => {
      counts[status] =
        attendance.data?.students.filter(
          (student) => statusFor(student.studentId, student.status) === status,
        ).length ?? 0;
      return counts;
    },
    { PRESENT: 0, ABSENT: 0, LATE: 0, EXCUSED: 0 },
  );
  const markedCount = statuses.reduce(
    (count, status) => count + statusCounts[status],
    0,
  );
  const canSave = Boolean(
    attendance.data &&
      attendance.data.students.length > 0 &&
      canEdit &&
      markedCount > 0,
  );
  const canSubmit = Boolean(
    attendance.data?.status === "DRAFT" &&
    attendance.data.canEdit &&
    isToday &&
    academicYear?.status === "ACTIVE" &&
    canMark &&
    markedCount > 0 &&
    !actions.isPending,
  );

  function markAllPresent() {
    if (!attendance.data) return;
    const students = attendance.data.students;
    setEdits((current) => ({
      ...current,
      [selectionKey]: Object.fromEntries(
        students.map((student) => [
          student.studentId,
          "PRESENT",
        ]),
      ),
    }));
  }

  function setStatus(studentId: string, status: TeacherAttendanceStatus) {
    setEdits((current) => ({
      ...current,
      [selectionKey]: {
        ...current[selectionKey],
        [studentId]: status,
      },
    }));
  }

  function remarkFor(studentId: string, savedRemark: string | null) {
    return remarkValues[studentId] ?? savedRemark ?? "";
  }

  function setRemark(studentId: string, value: string) {
    setRemarks((current) => ({
      ...current,
      [selectionKey]: {
        ...current[selectionKey],
        [studentId]: value,
      },
    }));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!attendance.data || !canSave) return;
    const saved = await actions.saveAttendanceDraft({
      academicYearId: yearId,
      sectionId: selectedSectionId,
      date: selectedDate,
      records: attendance.data.students.flatMap((student) => {
        const status = statusFor(student.studentId, student.status);
        if (!status) return [];
        const remark = remarkFor(student.studentId, student.remarks).trim();
        return [
          {
            studentId: student.studentId,
            status,
            ...(remark ? { remarks: remark } : {}),
          },
        ];
      }),
    });
    if (saved) {
      setEdits((current) => {
        const next = { ...current };
        delete next[selectionKey];
        return next;
      });
      setRemarks((current) => {
        const next = { ...current };
        delete next[selectionKey];
        return next;
      });
      attendance.refresh();
    }
  }

  async function submitAttendance() {
    if (!attendance.data || !canSubmit) return;
    if (
      await actions.submitAttendance({
        academicYearId: yearId,
        sectionId: selectedSectionId,
        date: selectedDate,
      })
    ) {
      attendance.refresh();
    }
  }

  return (
    <div className={styles.page}>
      <PageHeading
        eyebrow="TEACHING / ATTENDANCE"
        title="Attendance"
        description="Save today's attendance as an unpublished draft for your assigned section."
      />
      <ResourceState
        error={yearSelection.years.error ?? sections.error ?? dashboard.error}
        isLoading={
          yearSelection.years.isLoading ||
          sections.isLoading ||
          dashboard.isLoading
        }
        onRetry={() => {
          yearSelection.years.refresh();
          sections.refresh();
          dashboard.refresh();
        }}
      />
      <div className={styles.filters}>
        <TeacherAcademicYearSelector
          years={yearSelection.years.data ?? []}
          selectedYearId={yearId}
          onChange={yearSelection.setSelectedYearId}
          disabled={yearSelection.years.isLoading}
        />
      </div>
      {yearSelection.years.data?.length === 0 &&
        !yearSelection.years.isLoading && (
          <p className={styles.empty}>
            An academic year must be configured before attendance can be recorded.
          </p>
        )}
      {assignedSections.length === 0 && !sections.isLoading && (
        <p className={styles.empty}>
          No active sections are assigned to your account.
        </p>
      )}
      {assignedSections.length > 0 && yearId && (
        <>
          <div className={styles.filters}>
            <label>
              Class and section
              <select
                value={selectedSectionId}
                onChange={(event) => setSectionId(event.target.value)}
              >
                {assignedSections.map((section) => (
                  <option key={section.id} value={section.id}>
                    {section.className} · {section.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Attendance date
              <input
                type="date"
                value={selectedDate}
                min={academicYear?.startDate.slice(0, 10)}
                max={academicYear?.endDate.slice(0, 10)}
                onChange={(event) => setDate(event.target.value)}
                required
              />
            </label>
          </div>
          <ResourceState
            error={attendance.error}
            isLoading={attendance.isLoading}
            onRetry={attendance.refresh}
          />
          {attendance.data && (
            <form className={styles.page} onSubmit={(event) => void submit(event)}>
              {attendance.data.status === "DRAFT" &&
                attendance.data.canEdit && (
                  <p className={styles.infoNotice} role="status">
                    Draft saved. Attendance is not shared with families.
                  </p>
                )}
              {attendance.data.status === "SUBMITTED" && (
                <p className={styles.infoNotice} role="status">
                  Attendance submitted. You can continue editing it today.
                </p>
              )}
              {attendance.data.status !== null &&
                attendance.data.status !== "DRAFT" &&
                attendance.data.status !== "SUBMITTED" && (
                  <p className={styles.infoNotice}>
                    This attendance session is not a Teacher draft and is read-only.
                  </p>
                )}
              {academicYear?.status !== "ACTIVE" && (
                <p className={styles.infoNotice}>
                  Historical academic years are read-only.
                </p>
              )}
              {!isToday && (
                <p className={styles.infoNotice}>
                  Attendance drafts can only be saved for the school&apos;s current
                  local date. Historical attendance is view-only.
                </p>
              )}
              {attendance.data.status === "DRAFT" &&
                !attendance.data.canEdit && (
                  <p className={styles.infoNotice}>
                    This draft was saved by another Teacher and is read-only.
                  </p>
                )}
              {!canMark && (
                <p className={styles.infoNotice}>
                  You have read-only access to this attendance register.
                </p>
              )}
              <Panel
                title="Mark attendance"
                description="Mark students as you go, add optional remarks, then save an unpublished draft."
                className={styles.panel}
                action={
                  canEdit ? (
                    <button
                      className={styles.secondaryButton}
                      type="button"
                      onClick={markAllPresent}
                      disabled={attendance.data.students.length === 0}
                    >
                      Mark all present
                    </button>
                  ) : undefined
                }
              >
                <div className={styles.tableTools}>
                  <label className={styles.searchField}>
                    <span className={styles.visuallyHidden}>
                      Search students by name or roll number
                    </span>
                    <input
                      type="search"
                      placeholder="Search by name or roll number..."
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                    />
                  </label>
                  <div
                    className={styles.statusSummary}
                    role="group"
                    aria-label="Attendance totals"
                  >
                    <span className={styles.presentCount}>
                      {statusCounts.PRESENT} present
                    </span>
                    <span className={styles.absentCount}>
                      {statusCounts.ABSENT} absent
                    </span>
                    <span className={styles.lateCount}>
                      {statusCounts.LATE} late
                    </span>
                    <span>{markedCount} / {attendance.data.students.length} marked</span>
                  </div>
                </div>
                {attendance.data.students.length === 0 ? (
                  <p className={styles.empty}>
                    No active enrolled students were found for this date.
                  </p>
                ) : (
                  <>
                    <div className={`${styles.attendanceRow} ${styles.tableHeader}`} aria-hidden="true">
                      <span>Roll</span>
                      <span>Student</span>
                      <span>Attendance status</span>
                      <span>Remarks</span>
                    </div>
                    <ul className={styles.roster}>
                      {filteredStudents.map((student) => {
                        const selectedStatus = statusFor(
                          student.studentId,
                          student.status,
                        );
                        const disabled = !canEdit;
                        return (
                          <li
                            className={styles.attendanceRow}
                            key={student.studentId}
                          >
                            <span className={styles.rollNumber}>
                              {student.rollNumber ?? "—"}
                            </span>
                            <span className={styles.studentName}>
                              {student.name}
                            </span>
                            <div
                              className={styles.statusOptions}
                              role="group"
                              aria-label={`Attendance status for ${student.name}`}
                            >
                              {statuses.map((status) => (
                                <button
                                  className={`${styles.statusOption} ${selectedStatus === status ? statusClassNames[status] : ""}`}
                                  type="button"
                                  key={status}
                                  aria-label={`Mark ${student.name} ${formatStatus(status).toLowerCase()}`}
                                  aria-pressed={selectedStatus === status}
                                  disabled={disabled}
                                  onClick={() =>
                                    setStatus(student.studentId, status)
                                  }
                                >
                                  {formatStatus(status)}
                                </button>
                              ))}
                            </div>
                            <label className={styles.remarkCell}>
                              <span className={styles.visuallyHidden}>
                                Optional remark for {student.name}
                              </span>
                              <input
                                type="text"
                                value={remarkFor(
                                  student.studentId,
                                  student.remarks,
                                )}
                                maxLength={500}
                                placeholder="Optional remark"
                                disabled={disabled || !selectedStatus}
                                onChange={(event) =>
                                  setRemark(student.studentId, event.target.value)
                                }
                              />
                            </label>
                          </li>
                        );
                      })}
                    </ul>
                    {filteredStudents.length === 0 && (
                      <p className={styles.empty}>
                        No students match your search.
                      </p>
                    )}
                    <p className={styles.tableFootnote}>
                      Showing {filteredStudents.length} of{" "}
                      {attendance.data.students.length} students ·{" "}
                      {attendance.data.section.className}{" "}
                      {attendance.data.section.name}
                    </p>
                  </>
                )}
              </Panel>
              {actions.error && (
                <p className={styles.error} role="alert">
                  {actions.error}
                </p>
              )}
              {canMark &&
                attendance.data.canEdit &&
                isToday &&
                attendance.data.students.length > 0 && (
                  <Panel
                    title={
                      attendance.data.status === "SUBMITTED"
                        ? "Update submitted register"
                        : "Attendance register"
                    }
                    description={`${markedCount} students marked. Unmarked students remain unmarked.`}
                    className={styles.panel}
                    action={
                      <div className={styles.formActions}>
                        <button
                          className={styles.secondaryButton}
                          type="submit"
                          disabled={!canSave}
                        >
                          {actions.isPending ? "Saving..." : "Save changes"}
                        </button>
                        {attendance.data.status === "DRAFT" && (
                          <button
                            className={styles.primaryButton}
                            type="button"
                            onClick={() => void submitAttendance()}
                            disabled={!canSubmit}
                          >
                            {actions.isPending ? "Submitting..." : "Submit register"}
                          </button>
                        )}
                      </div>
                    }
                  >
                    {null}
                  </Panel>
                )}
            </form>
          )}
        </>
      )}
    </div>
  );
}
