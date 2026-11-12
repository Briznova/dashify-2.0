"use client";

import { MetricCard } from "@/components/ui/metric-card";
import { PageHeading } from "@/components/ui/page-heading";
import { Panel } from "@/components/ui/panel";
import { ResourceState } from "@/components/ui/resource-state";
import { StatusBadge } from "@/components/ui/status-badge";
import { useTeacherDashboard } from "@/hooks/use-school-data";
import styles from "./teacher-dashboard.module.css";

export function TeacherDashboardView({
  userName,
}: {
  userName?: string;
} = {}) {
  const resource = useTeacherDashboard();
  const data = resource.data;
  const sessions =
    data?.assignments.filter(
      (assignment) => assignment.sessionStatus !== null,
    ) ?? [];
  const unmarkedTotal = sessions.reduce(
    (total, assignment) => total + (assignment.unmarkedCount ?? 0),
    0,
  );

  return (
    <>
      <PageHeading
        eyebrow={`${data?.schoolName ?? "SCHOOL WORKSPACE"} · TEACHER`}
        title={
          userName
            ? `Good morning, ${userName.trim().split(/\s+/)[0] ?? "Teacher"} ✨`
            : "Your teaching day"
        }
        description={
          data?.localDate
            ? `Your assigned classes and attendance status for ${data.localDate}.`
            : "Your assigned classes and today's attendance status."
        }
      />
      {data && (
        <section className={styles.metricsGrid} aria-label="Teacher summary">
          <MetricCard
            label="Assigned sections"
            value={data.assignments.length.toLocaleString()}
            detail="Active assignments"
            icon="book"
            tone="blue"
          />
          <MetricCard
            label="Sessions today"
            value={sessions.length.toLocaleString()}
            detail="In assigned sections"
            icon="calendarCheck"
            tone="green"
          />
          <MetricCard
            label="Students unmarked"
            value={sessions.length === 0 ? "—" : unmarkedTotal.toLocaleString()}
            detail="Across today's sessions"
            icon="clock"
            tone="orange"
          />
        </section>
      )}
      <ResourceState
        error={resource.error}
        isLoading={resource.isLoading}
        onRetry={resource.refresh}
      />
      {data && (
        <Panel
          title="Today's assigned classes"
          description="Only active classes and sections assigned to your teacher account are shown."
        >
          {data.assignments.length === 0 ? (
            <p className={styles.emptyState}>
              No active assigned classes are available today.
            </p>
          ) : (
            <ul className={styles.assignmentList}>
              {data.assignments.map((assignment) => (
                <li className={styles.assignment} key={assignment.id}>
                  <div className={styles.assignmentDetails}>
                    <strong>
                      {assignment.className} · {assignment.sectionName}
                    </strong>
                    <span>{assignment.subject ?? "Subject not specified"}</span>
                  </div>
                  <div className={styles.attendanceStatus}>
                    <StatusBadge
                      variant={
                        assignment.sessionStatus === "OPEN"
                          ? "success"
                          : undefined
                      }
                    >
                      {assignment.sessionStatus ?? "No session"}
                    </StatusBadge>
                    <span>
                      {assignment.unmarkedCount === null
                        ? "—"
                        : `${assignment.unmarkedCount.toLocaleString()} unmarked`}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      )}
    </>
  );
}
