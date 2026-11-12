"use client";

import Link from "next/link";
import { useAuthSession } from "@/hooks/use-auth";
import { WorkspaceHome } from "@/modules/workspace/workspace-home";
import { isApiMode } from "@/services";
import styles from "./dashboard-shell.module.css";

export function DashboardHome() {
  const { session, isLoading, error } = useAuthSession();

  if (isLoading) {
    return (
      <p className={styles.sessionState} role="status">
        Loading your role workspace…
      </p>
    );
  }
  if (error) {
    return (
      <p className={styles.sessionState} role="alert">
        {error}
      </p>
    );
  }
  if (!session) return null;
  if (!session.user.role) {
    return (
      <p className={styles.sessionState}>
        Choose a <Link href="/auth/select-workspace">school workspace</Link> to
        continue.
      </p>
    );
  }

  if (
    isApiMode &&
    session.user.role !== "super_admin" &&
    session.user.role !== "school_admin" &&
    session.user.role !== "principal" &&
    session.user.role !== "teacher"
  ) {
    return (
      <p className={styles.sessionState} role="status">
        Dashboard data is not connected for this role yet.
      </p>
    );
  }
  if (
    isApiMode &&
    session.scope === "platform" &&
    !session.permissionKeys.includes("platform.schools.read")
  ) {
    return (
      <p className={styles.sessionState} role="alert">
        This platform session does not have school-directory access.
      </p>
    );
  }

  return (
    <WorkspaceHome role={session.user.role} userName={session.user.name} />
  );
}
