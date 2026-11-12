"use client";

import { usePlatformSchools } from "@/hooks/use-school-data";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { MetricCard } from "@/components/ui/metric-card";
import { PageHeading } from "@/components/ui/page-heading";
import { StatusBadge } from "@/components/ui/status-badge";
import type { PlatformSchool } from "@/types/school";
import styles from "./platform-schools-directory.module.css";

const columns: DataTableColumn<PlatformSchool>[] = [
  { heading: "School", render: (school) => <strong>{school.name}</strong> },
  { heading: "Code", render: (school) => school.code },
  {
    heading: "Status",
    render: (school) => (
      <StatusBadge variant={school.isActive ? "success" : "neutral"}>
        {school.isActive ? "Active" : "Inactive"}
      </StatusBadge>
    ),
  },
  {
    heading: "Created",
    render: (school) =>
      new Intl.DateTimeFormat(undefined, {
        dateStyle: "medium",
        timeZone: "UTC",
      }).format(new Date(school.createdAt)),
  },
];

export function PlatformSchoolsDirectory() {
  const { data, isLoading, error, refresh } = usePlatformSchools();
  const activeCount = data?.filter((school) => school.isActive).length ?? 0;
  const inactiveCount = (data?.length ?? 0) - activeCount;

  return (
    <div className={styles.page}>
      <PageHeading
        eyebrow="PLATFORM ADMINISTRATION"
        title="Schools"
        description="Read-only directory of school workspaces and their status."
      />
      {data && (
        <section
          className={styles.metrics}
          aria-label="School directory summary"
        >
          <MetricCard
            label="Total schools"
            value={data.length.toLocaleString()}
            detail="All workspaces"
            icon="building"
            tone="blue"
          />
          <MetricCard
            label="Active"
            value={activeCount.toLocaleString()}
            detail="Available workspaces"
            icon="check"
            tone="green"
          />
          <MetricCard
            label="Inactive"
            value={inactiveCount.toLocaleString()}
            detail="Unavailable workspaces"
            icon="alert"
            tone="orange"
          />
        </section>
      )}
      <p className={styles.notice}>
        This platform session cannot open school records, switch into a school,
        or change school settings.
      </p>
      <DataTable
        title="School directory"
        description="Only school identity, status, and creation date are shown."
        rows={data}
        columns={columns}
        isLoading={isLoading}
        error={error}
        onRetry={refresh}
        searchText={(school) => `${school.name} ${school.code}`}
      />
    </div>
  );
}
