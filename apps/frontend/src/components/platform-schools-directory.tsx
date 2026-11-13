"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePlatformSchools } from "@/hooks/use-school-data";
import { useAuthSession } from "@/hooks/use-auth";
import { MetricCard } from "@/components/ui/metric-card";
import { PageHeading } from "@/components/ui/page-heading";
import { Panel } from "@/components/ui/panel";
import { ResourceState } from "@/components/ui/resource-state";
import { StatusBadge } from "@/components/ui/status-badge";
import { PlatformActivity } from "@/components/platform-activity";
import { isApiMode, platformOnboardingSummaryService, platformSupportService } from "@/services";
import type { PlatformOnboardingSummary as Summary } from "@/services/http/http-platform-onboarding-summary-service";
import { downloadPlatformSchoolsCsv } from "@/lib/platform-schools-csv";
import styles from "./platform-schools-directory.module.css";

type StatusFilter = "all" | "active" | "inactive";

const pageSize = 6;

function OnboardingSummary() {
  const [data, setData] = useState<Summary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    void platformOnboardingSummaryService.get(controller.signal).then(
      (result) => { if (!controller.signal.aborted) { setData(result); setError(null); } },
      (reason: unknown) => {
        if (!controller.signal.aborted) {
          setData(null);
          setError(reason instanceof Error ? reason.message : "Unable to load onboarding summary.");
        }
      },
    );
    return () => controller.abort();
  }, [version]);
  return (
    <div>
      <MetricCard label="Confirmed onboarding" icon="clipboard" tone="blue"
        value={data ? data.completed.toLocaleString() : "—"}
        detail={data ? `${data.notStarted.toLocaleString()} not started · ${data.unknown.toLocaleString()} unknown`
          : error ? "Onboarding summary unavailable" : "Loading onboarding summary"} />
      {error && <p role="alert">{error} <button type="button" onClick={() => { setError(null); setVersion((value) => value + 1); }}>Retry onboarding summary</button></p>}
    </div>
  );
}

function SupportSummary() {
  const [count, setCount] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    void platformSupportService.summary(controller.signal).then(
      (result) => { if (!controller.signal.aborted) { setCount(result.unresolved); setError(null); } },
      (reason: unknown) => {
        if (!controller.signal.aborted) {
          setCount(null);
          setError(reason instanceof Error ? reason.message : "Unable to load support summary.");
        }
      },
    );
    return () => controller.abort();
  }, [version]);
  return (
    <div>
      <MetricCard label="Open support requests" icon="mail" tone="violet"
        value={count === null ? "—" : count.toLocaleString()}
        detail={error ? "Support summary unavailable" : count === null ? "Loading support summary" : "Open and in progress"} />
      {error && <p role="alert">{error} <button type="button" onClick={() => { setError(null); setVersion((value) => value + 1); }}>Retry support summary</button></p>}
    </div>
  );
}

export function PlatformSchoolsDirectory({ overview = false }: { overview?: boolean }) {
  const { data, isLoading, error, refresh } = usePlatformSchools();
  const { session, isLoading: sessionLoading, error: sessionError, refresh: refreshSession } = useAuthSession();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [page, setPage] = useState(1);
  const [exportError, setExportError] = useState<string | null>(null);
  const availableData = !isLoading && !error ? data : null;
  const activeCount = availableData?.filter((school) => school.isActive).length;
  const inactiveCount = availableData && activeCount !== undefined
    ? availableData.length - activeCount
    : undefined;
  const filteredSchools = availableData?.filter((school) => {
    const matchesSearch = `${school.name} ${school.code}`
      .toLowerCase()
      .includes(query.trim().toLowerCase());
    const matchesStatus = status === "all" || school.isActive === (status === "active");
    return matchesSearch && matchesStatus;
  }) ?? [];
  const totalPages = Math.max(1, Math.ceil(filteredSchools.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const visibleSchools = overview
    ? filteredSchools.slice(0, 5)
    : filteredSchools.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const canCreate = isApiMode &&
    session?.scope === "platform" &&
    session.user.role === "super_admin" &&
    session.permissionKeys.includes("platform.schools.read") &&
    session.permissionKeys.includes("platform.schools.create");
  const canReadAudit = isApiMode && session?.scope === "platform" &&
    session.user.role === "super_admin" && session.permissionKeys.includes("platform.audit.read");
  const canReadSupport = isApiMode && session?.scope === "platform" &&
    session.user.role === "super_admin" && session.permissionKeys.includes("platform.support.read");
  const canReadSchools = isApiMode && session?.scope === "platform" &&
    session.user.role === "super_admin" && session.permissionKeys.includes("platform.schools.read");
  const canCreateAdmin = canReadSchools && session?.permissionKeys.includes("platform.school-admins.create");

  const filters = (
    <div className={styles.filters}>
      <label>
        <span>Search schools</span>
        <input
          aria-label="Search school directory"
          placeholder="School name or code"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setPage(1);
          }}
        />
        {!overview && <small>Search by school name or code</small>}
      </label>
      <label>
        <span>School status</span>
        <select
          value={status}
          onChange={(event) => {
            const value = event.target.value;
            if (value === "all" || value === "active" || value === "inactive") {
              setStatus(value);
              setPage(1);
            }
          }}
        >
          <option value="all">All statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
        {!overview && <small>Filter by directory status</small>}
      </label>
      <label>
        <span>Subscription</span>
        <select disabled defaultValue="">
          <option value="">Not connected</option>
        </select>
        {!overview && <small>Subscription filtering is unavailable</small>}
      </label>
    </div>
  );

  return (
    <div className={styles.page}>
      <PageHeading
        eyebrow={overview ? "PLATFORM / OVERVIEW" : "PLATFORM / SCHOOLS"}
        title={overview ? "Platform overview" : "Schools"}
        description={overview
          ? "View school tenants and platform operations."
          : "Manage school tenants, administrator access and onboarding."}
      >
        <div className={styles.headingActions}>
          {overview ? (
            <button type="button" className={styles.secondaryButton} disabled>Export report</button>
          ) : (
            <button
              type="button"
              className={styles.secondaryButton}
              disabled={!availableData || filteredSchools.length === 0}
              onClick={() => {
                try {
                  downloadPlatformSchoolsCsv(filteredSchools);
                  setExportError(null);
                } catch {
                  setExportError("Unable to download the school directory. Please try again.");
                }
              }}
            >
              Export filtered schools
            </button>
          )}
          {(canCreate || !isApiMode) && <Link className={styles.primaryLink} href={canCreate ? "/dashboard/schools/new" : "/dashboard/platform/create-school-admin"}>
            {canCreate ? "Create school" : overview ? "Add school preview" : "Create school admin preview"}
          </Link>}
          {canCreateAdmin && <Link className={styles.textLink} href="/dashboard/platform/create-school-admin">Create School Admin</Link>}
        </div>
      </PageHeading>

      <p className={styles.warning}>
        {isApiMode
          ? "School directory and onboarding summaries, authorized school creation, and support summaries with access are connected. Unavailable features are labeled."
          : "Dummy data: this directory uses the local demo service. Other metrics and actions are previews."}
      </p>
      {exportError && <p className={styles.exportError} role="alert">{exportError}</p>}

      <section className={styles.metrics} aria-label={overview ? "Platform overview summary" : "School directory summary"}>
        <MetricCard
          label="Active schools"
          value={activeCount === undefined ? "—" : activeCount.toLocaleString()}
          detail={availableData && inactiveCount !== undefined
            ? `${availableData.length.toLocaleString()} total · ${inactiveCount.toLocaleString()} inactive`
            : isLoading ? "Loading directory" : "Directory unavailable"}
          icon="building"
          tone="blue"
        />
        {(overview
          ? [
              { label: "Monthly recurring revenue", icon: "wallet", tone: "blue" },
              { label: "Renewals this month", icon: "calendarCheck", tone: "orange" },
            ] as const
          : [
              { label: "Pending invitations", icon: "mail", tone: "orange" },
            ] as const
        ).map((metric) => (
          <MetricCard key={metric.label} {...metric} value="—" detail="Dummy preview · not connected" />
        ))}
        {overview ? (
          canReadSupport ? <SupportSummary key={session.user.id} /> :
            <MetricCard label="Open support requests" icon="mail" tone="violet" value="—"
              detail={sessionLoading ? "Loading session" : sessionError ? "Session unavailable" : "Support access required"} />
        ) : (
          <>
            <MetricCard label="Inactive schools" icon="alert" tone="violet"
              value={inactiveCount === undefined ? "—" : inactiveCount.toLocaleString()}
              detail={availableData ? "Directory status, not suspension" : isLoading ? "Loading directory" : "Directory unavailable"} />
            {canReadSchools ? <OnboardingSummary key={session.user.id} /> :
              <MetricCard label="Confirmed onboarding" icon="clipboard" tone="blue" value="—"
                detail={!isApiMode ? "Dummy preview · not connected" : sessionLoading ? "Loading session" : sessionError ? "Session unavailable" : "School directory access required"} />}
          </>
        )}
      </section>

      {!overview && filters}
      {!overview && (
        <p className={styles.notice}>
          Export downloads all matching directory entries, not just the current page.
        </p>
      )}

      <Panel
        title={overview ? "School tenants" : "All schools"}
        description={overview
          ? "School directory metadata only; no access to school operations."
          : "Read-only school identity and status."}
        action={overview ? <Link className={styles.textLink} href="/dashboard/schools">View all schools →</Link> : undefined}
        stackActionOnNarrow
      >
        {overview && filters}
        {isLoading || error ? (
          <ResourceState isLoading={isLoading} error={error} onRetry={refresh} />
        ) : (
          <>
            <div className={styles.tableScroll}>
              <table className={styles.table}>
                <thead><tr><th>School / tenant</th><th>Status</th><th>Created</th></tr></thead>
                <tbody>
                  {visibleSchools.map((school) => (
                    <tr key={school.id}>
                      <td><strong><Link className={styles.textLink} href={`/dashboard/schools/${encodeURIComponent(school.id)}`}>{school.name}</Link></strong><small>{school.code}</small></td>
                      <td><StatusBadge variant={school.isActive ? "success" : "neutral"}>{school.isActive ? "Active" : "Inactive"}</StatusBadge></td>
                      <td>{new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeZone: "UTC" }).format(new Date(school.createdAt))}</td>
                    </tr>
                  ))}
                  {visibleSchools.length === 0 && (
                    <tr><td className={styles.empty} colSpan={3}>No records match your search.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className={styles.tableFooter}>
              <span>
                {filteredSchools.length === 0
                  ? "No schools to display"
                  : `Showing ${overview ? 1 : (currentPage - 1) * pageSize + 1}–${overview ? visibleSchools.length : (currentPage - 1) * pageSize + visibleSchools.length} of ${filteredSchools.length} schools`}
              </span>
              {!overview && totalPages > 1 && (
                <div className={styles.pagination}>
                  <button type="button" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}>Previous</button>
                  <span>Page {currentPage} of {totalPages}</span>
                  <button type="button" disabled={currentPage === totalPages} onClick={() => setPage(currentPage + 1)}>Next</button>
                </div>
              )}
            </div>
          </>
        )}
      </Panel>

      {overview ? (
        <div className={styles.overviewPanels}>
          <Panel title="Renewals & account actions" action={<Link className={styles.textLink} href="/dashboard/platform/subscriptions">Subscriptions →</Link>}>
            <p className={styles.previewText}>Dummy preview: renewal and account actions are not connected.</p>
          </Panel>
          <Panel title="Platform activity" description="Administrative events only" action={<Link className={styles.textLink} href="/dashboard/platform/audit-log">Audit log →</Link>}>
            {!isApiMode ? (
              <p className={styles.previewText}>Dummy preview: platform activity uses no live data.</p>
            ) : sessionLoading || sessionError ? (
              <ResourceState isLoading={sessionLoading} error={sessionError} onRetry={refreshSession} />
            ) : canReadAudit ? (
              <PlatformActivity key={session.user.id} />
            ) : (
              <p className={styles.previewText}>Platform activity requires audit access.</p>
            )}
          </Panel>
        </div>
      ) : (
        <div className={styles.setupNotice}>
          <strong>School-led setup</strong>
          <p>{isApiMode
            ? "School Admins can confirm setup after creating an academic year, class and section. Email invitations are not connected."
            : "Dummy preview: administrator invitations and onboarding are not connected."}</p>
          <Link className={styles.textLink} href="/dashboard/platform/school-setup">View school setup and CSV import preview →</Link>
          <Link className={styles.textLink} href="/dashboard/platform/school-detail">School detail preview →</Link>
        </div>
      )}
      <p className={styles.notice}>
        This platform session cannot open school records, switch into a school,
        or change school settings.
      </p>
    </div>
  );
}
