"use client";

import { PortalDashboard } from "@/components/school-extras";
import { SchoolDashboardView } from "@/components/school-dashboard";
import { TeacherDashboardView } from "@/components/teacher-dashboard";
import { PlatformSchoolsDirectory } from "@/components/platform-schools-directory";
import { isApiMode } from "@/services";
import type { UserRole } from "@/types/auth";
import styles from "@/components/dashboard-shell.module.css";

export function WorkspaceHome({
  role,
  userName,
}: {
  role: UserRole;
  userName: string;
}) {
  switch (role) {
    case "super_admin":
      return <PlatformSchoolsDirectory overview />;
    case "school_admin":
    case "principal":
      return <SchoolDashboardView role={role} userName={userName} />;
    case "teacher":
      return isApiMode ? (
        <TeacherDashboardView userName={userName} />
      ) : (
        <PortalDashboard role={role} />
      );
    case "accountant":
    case "parent":
    case "student":
      return <PortalDashboard role={role} />;
    default:
      return (
        <p className={styles.sessionState} role="alert">
          This workspace role is not supported.
        </p>
      );
  }
}
