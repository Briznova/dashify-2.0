"use client";

import { useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import { ResourceState } from "@/components/ui/resource-state";
import { useAuthSession } from "@/hooks/use-auth";
import {
  useAnnouncements,
  useTeacherDashboard,
  useTeacherYearSelection,
} from "@/hooks/use-school-data";
import styles from "./teacher-dashboard.module.css";
import { TeacherAcademicYearSelector } from "./teacher-academic-year-selector";

function formatPublishedDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? null
    : new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(
        date,
      );
}

export function TeacherDashboardView({
  userName,
}: {
  userName?: string;
} = {}) {
  const yearSelection = useTeacherYearSelection();
  const resource = useTeacherDashboard(yearSelection.selectedYearId || undefined);
  const notices = useAnnouncements(false);
  const { session } = useAuthSession();
  const data = resource.data;
  const [selectedAssignmentId, setSelectedAssignmentId] = useState("");
  const selectedAssignment =
    data?.assignments.find(
      (assignment) => assignment.id === selectedAssignmentId,
    ) ?? data?.assignments[0];
  const firstName =
    userName?.trim().split(/\s+/)[0] ||
    session?.user.name.trim().split(/\s+/)[0] ||
    "Teacher";
  const latestNotice = notices.data
    ?.filter((announcement) => announcement.status === "PUBLISHED")
    .sort(
      (left, right) =>
        Date.parse(right.publishedAt ?? right.createdAt) -
        Date.parse(left.publishedAt ?? left.createdAt),
    )[0];
  const publishedDate = latestNotice?.publishedAt
    ? formatPublishedDate(latestNotice.publishedAt)
    : null;
  const otherAssignments =
    data?.assignments.filter(
      (assignment) => assignment.id !== selectedAssignment?.id,
    ) ?? [];
  const attendanceSummary = selectedAssignment?.sessionStatus
    ? `Attendance ${selectedAssignment.sessionStatus.toLowerCase()}`
    : "No attendance session today";

  return (
    <div className={styles.page}>
      <header className={styles.intro}>
        <p className={styles.breadcrumb}>Teaching / Home</p>
        <h1>Good morning, {firstName}</h1>
        <p>Choose a class and get straight to your next task.</p>
      </header>

      <ResourceState
        error={yearSelection.years.error}
        isLoading={yearSelection.years.isLoading}
        onRetry={yearSelection.years.refresh}
      />
      <ResourceState
        error={resource.error}
        isLoading={resource.isLoading}
        onRetry={resource.refresh}
      />

      {data && (
        <section className={styles.workingClass} aria-label="Working class">
          <div className={styles.classHeading}>
            <div>
              <p className={styles.sectionEyebrow}>YOUR WORKING CLASS</p>
              <h2>Today’s class</h2>
            </div>
            <div className={styles.classSelectors}>
              <TeacherAcademicYearSelector
                years={yearSelection.years.data ?? []}
                selectedYearId={yearSelection.selectedYearId}
                onChange={yearSelection.setSelectedYearId}
                disabled={yearSelection.years.isLoading}
              />
              {data.assignments.length > 0 && (
                <label className={styles.classSelect}>
                  <span>Working class</span>
                  <select
                    aria-label="Working class"
                    value={selectedAssignment?.id ?? ""}
                    onChange={(event) => setSelectedAssignmentId(event.target.value)}
                  >
                    {data.assignments.map((assignment) => (
                      <option key={assignment.id} value={assignment.id}>
                        {assignment.className} · {assignment.sectionName}
                      </option>
                    ))}
                  </select>
                </label>
              )}
            </div>
          </div>
          {selectedAssignment ? (
            <div className={styles.classDetails}>
              <div className={styles.enrollment}>
                <strong>{selectedAssignment.studentCount ?? "—"}</strong>
                <span>
                  {selectedAssignment.studentCount === null
                    ? "enrollment count unavailable"
                    : "students enrolled"}
                </span>
              </div>
              <div className={styles.assignmentDetails}>
                <strong>
                  {selectedAssignment.subject ?? "Subject not assigned"}
                </strong>
                <span>
                  {selectedAssignment.subject
                    ? `${selectedAssignment.subject} · ${attendanceSummary}`
                    : attendanceSummary}
                </span>
                <small>
                  {selectedAssignment.isClassTeacher
                    ? "Class teacher"
                    : selectedAssignment.classTeacherName
                      ? `Class teacher: ${selectedAssignment.classTeacherName}`
                      : "Class teacher not designated"}
                </small>
                {otherAssignments.length > 0 && (
                  <small>
                    Also teaching{" "}
                    {otherAssignments
                      .map(
                        (assignment) =>
                          `${assignment.className} · ${assignment.sectionName}`,
                      )
                      .join(", ")}
                  </small>
                )}
              </div>
            </div>
          ) : (
            <p className={styles.emptyState}>
              No active assigned classes are available today.
            </p>
          )}
        </section>
      )}

      <section className={styles.tasks} aria-labelledby="teacher-task-heading">
        <div className={styles.tasksHeading}>
          <div>
            <p className={styles.sectionEyebrow}>YOUR TEACHING DAY</p>
            <h2 id="teacher-task-heading">What would you like to do?</h2>
          </div>
          {data?.localDate && (
            <time className={styles.todayDate} dateTime={data.localDate}>
              {new Intl.DateTimeFormat("en", {
                weekday: "long",
                month: "short",
                day: "numeric",
                timeZone: "UTC",
              }).format(new Date(`${data.localDate}T12:00:00Z`))}
            </time>
          )}
        </div>
        <nav className={styles.quickActions} aria-label="Teacher workspace actions">
          <Link className={styles.quickAction} href="/dashboard/teacher/attendance">
            <span className={`${styles.actionIcon} ${styles.attendanceIcon}`}>
              <Icon name="calendarCheck" size={19} />
            </span>
            <strong>Take attendance</strong>
            <span>Mark today’s register for an assigned section.</span>
            <span className={styles.actionLink}>
              Open class register <Icon name="arrowUpRight" size={14} />
            </span>
          </Link>
          <Link className={styles.quickAction} href="/dashboard/teacher/assessments">
            <span className={`${styles.actionIcon} ${styles.assignmentIcon}`}>
              <Icon name="book" size={19} />
            </span>
            <strong>Create assignment</strong>
            <span>Set classwork, instructions, and a due date.</span>
            <span className={styles.actionLink}>
              Create assignment <Icon name="arrowUpRight" size={14} />
            </span>
          </Link>
          <Link className={styles.quickAction} href="/dashboard/teacher/assessments">
            <span className={`${styles.actionIcon} ${styles.examIcon}`}>
              <Icon name="file" size={19} />
            </span>
            <strong>Create exam or test</strong>
            <span>Choose a class, subject, date, and total marks.</span>
            <span className={styles.actionLink}>
              Create assessment <Icon name="arrowUpRight" size={14} />
            </span>
          </Link>
          <Link className={styles.quickAction} href="/dashboard/teacher/results">
            <span className={`${styles.actionIcon} ${styles.resultsIcon}`}>
              <Icon name="chart" size={19} />
            </span>
            <strong>Update student scores</strong>
            <span>Enter marks and review class results.</span>
            <span className={styles.actionLink}>
              Open score entry <Icon name="arrowUpRight" size={14} />
            </span>
          </Link>
        </nav>
      </section>

      <section className={styles.noticeCard} aria-labelledby="school-notice-heading">
        <div className={styles.noticeHeading}>
          <span className={styles.noticeIcon}>
            <Icon name="bell" size={18} />
          </span>
          <div>
            <p className={styles.sectionEyebrow}>FROM YOUR SCHOOL</p>
            <h2 id="school-notice-heading">School notices</h2>
          </div>
          <Link className={styles.actionLink} href="/dashboard/announcements">
            View all <Icon name="arrowUpRight" size={14} />
          </Link>
        </div>
        {notices.error ? (
          <div className={styles.noticeError} role="alert">
            <span>{notices.error}</span>
            <button type="button" onClick={notices.refresh}>
              Try again
            </button>
          </div>
        ) : notices.isLoading ? (
          <p className={styles.noticeState} role="status">
            Loading school notices…
          </p>
        ) : latestNotice ? (
          <article className={styles.latestNotice}>
            <div className={styles.latestNoticeHeading}>
              <h3>{latestNotice.title}</h3>
              {publishedDate && (
                <time dateTime={latestNotice.publishedAt ?? undefined}>
                  Published {publishedDate}
                </time>
              )}
            </div>
            <p>{latestNotice.body}</p>
          </article>
        ) : (
          <p className={styles.noticeState}>
            No published school notices are available yet.
          </p>
        )}
      </section>
    </div>
  );
}
