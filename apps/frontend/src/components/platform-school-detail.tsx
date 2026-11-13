"use client";

import Link from "next/link";
import { usePlatformSchool } from "@/hooks/use-school-data";
import { useAuthSession } from "@/hooks/use-auth";
import { PageHeading } from "@/components/ui/page-heading";
import { Panel } from "@/components/ui/panel";
import { ResourceState } from "@/components/ui/resource-state";
import { StatusBadge } from "@/components/ui/status-badge";
import { isApiMode } from "@/services";
import styles from "./platform-schools-directory.module.css";

export function PlatformSchoolDetail({ schoolId }: { schoolId: string }) {
  const { data: school, isLoading, error, refresh } = usePlatformSchool(schoolId);
  const { session } = useAuthSession();
  const canCreateAdmin = isApiMode && session?.scope === "platform" &&
    session.user.role === "super_admin" && session.permissionKeys.includes("platform.schools.read") &&
    session.permissionKeys.includes("platform.school-admins.create");

  return (
    <div className={styles.page}>
      <PageHeading
        eyebrow="PLATFORM / SCHOOLS"
        title="School detail"
        description="Read-only school directory information."
      >
        <Link className={styles.textLink} href="/dashboard/schools">
          ← Back to schools
        </Link>
      </PageHeading>
      {!isApiMode && (
        <p className={styles.warning}>
          Dummy data: this school detail uses the local demo service, not the backend.
        </p>
      )}
      {isLoading || error ? (
        <ResourceState isLoading={isLoading} error={error} onRetry={refresh} />
      ) : school ? (
        <>
          <Panel title="School account" description="Platform directory metadata and known onboarding state.">
            <dl className={styles.details}>
              <dt>School name</dt><dd>{school.name}</dd>
              <dt>School code</dt><dd>{school.code}</dd>
              <dt>Status</dt>
              <dd>
                <StatusBadge variant={school.isActive ? "success" : "neutral"}>
                  {school.isActive ? "Active" : "Inactive"}
                </StatusBadge>
              </dd>
              <dt>Created</dt>
              <dd>{new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeZone: "UTC" }).format(new Date(school.createdAt))}</dd>
            </dl>
            {canCreateAdmin && school.isActive && <Link className={styles.textLink}
              href={`/dashboard/platform/create-school-admin?id=${encodeURIComponent(school.id)}`}>Create School Admin →</Link>}
          </Panel>
          <div className={styles.overviewPanels}>
            <Panel title="Onboarding progress">
              <p className={styles.previewText}>
                {school.onboardingState === "COMPLETED"
                  ? "Completed: the School Admin confirmed the required setup."
                  : school.onboardingState === "NOT_STARTED"
                  ? "Not started. No administrator invitation has been sent by school creation."
                  : "Onboarding state is not recorded for this school."}
              </p>
            </Panel>
            <Panel title="Recent account activity">
              <p className={styles.previewText}>Dummy preview: account activity is not connected.</p>
            </Panel>
          </div>
          <p className={styles.notice}>
            This platform session cannot open school records, switch into a school,
            or change school settings.
          </p>
        </>
      ) : (
        <Panel title="School not found">
          <p className={styles.previewText} role="status">
            This school is not in the available platform directory.
          </p>
        </Panel>
      )}
    </div>
  );
}
