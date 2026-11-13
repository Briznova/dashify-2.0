"use client";

import { useEffect, useState } from "react";
import { useAuthSession } from "@/hooks/use-auth";
import { PageHeading } from "@/components/ui/page-heading";
import { Panel } from "@/components/ui/panel";
import { ResourceState } from "@/components/ui/resource-state";
import { PlatformPreview } from "@/components/platform-preview";
import { isApiMode, platformAuditService } from "@/services";
import { platformAuditActions, type PlatformAuditAction, type PlatformAuditPageData } from "@/types/platform-audit";
import styles from "./platform-preview.module.css";

export function PlatformAuditLog() {
  const { session, isLoading: sessionLoading, error: sessionError, refresh } = useAuthSession();
  const allowed = isApiMode && session?.scope === "platform" &&
    session.user.role === "super_admin" && session.permissionKeys.includes("platform.audit.read");
  if (!isApiMode) return <PlatformPreview page="audit-log" />;
  if (sessionLoading || sessionError) {
    return <ResourceState isLoading={sessionLoading} error={sessionError} onRetry={refresh} />;
  }
  if (!allowed) return <p role="alert">Platform audit access is unavailable for this session.</p>;
  return <PlatformAuditContents key={session.user.id} />;
}

function PlatformAuditContents() {
  const [action, setAction] = useState<PlatformAuditAction | "">("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [cursors, setCursors] = useState<(string | undefined)[]>([undefined]);
  const [page, setPage] = useState(0);
  const [version, setVersion] = useState(0);
  const [data, setData] = useState<PlatformAuditPageData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const invalidDateRange = Boolean(fromDate && toDate && fromDate > toDate);

  useEffect(() => {
    if (invalidDateRange) return;
    const controller = new AbortController();
    void platformAuditService.list({
      action: action || undefined,
      cursor: cursors[page],
      from: fromDate ? `${fromDate}T00:00:00Z` : undefined,
      to: toDate ? `${toDate}T23:59:59.999Z` : undefined,
    }, controller.signal)
      .then((result) => {
        if (!controller.signal.aborted) { setData(result); setError(null); setLoading(false); }
      }, (reason: unknown) => {
        if (!controller.signal.aborted) {
          setData(null);
          setError(reason instanceof Error ? reason.message : "Unable to load platform audit events.");
          setLoading(false);
        }
      });
    return () => controller.abort();
  }, [action, cursors, fromDate, invalidDateRange, page, toDate, version]);

  function reload() {
    setData(null); setError(null); setLoading(true); setVersion((current) => current + 1);
  }
  function resetPage() {
    setPage(0); setCursors([undefined]); setData(null); setError(null); setLoading(true);
  }

  return (
    <div className={styles.page}>
      <PageHeading eyebrow="PLATFORM ADMINISTRATION" title="Audit log" description="Redacted platform-origin activity." />
      <p className={styles.note}>Only supported platform events are shown. School audit records and unimplemented retention controls are not included.</p>
      <Panel title="Platform events" description="Newest first. Times are shown in UTC.">
        <label className={styles.field}>
          Event type
          <select value={action} onChange={(event) => {
            const value = platformAuditActions.find((item) => item === event.target.value) ?? "";
            setAction(value); resetPage();
          }}>
            <option value="">All supported events</option>
            {platformAuditActions.map((item) => <option key={item} value={item}>{item.replaceAll("_", " ")}</option>)}
          </select>
        </label>
        <div className={styles.actions}>
          <label className={styles.field}>From date (UTC)<input type="date" value={fromDate} onChange={(event) => {
            setFromDate(event.target.value); resetPage();
          }} /></label>
          <label className={styles.field}>To date (UTC)<input type="date" value={toDate} onChange={(event) => {
            setToDate(event.target.value); resetPage();
          }} /></label>
        </div>
        {invalidDateRange ? (
          <p role="alert">The start date must not be after the end date.</p>
        ) : loading || error ? (
          <ResourceState isLoading={loading} error={error} onRetry={reload} />
        ) : !data ? (
          <ResourceState isLoading={true} error={null} onRetry={reload} />
        ) : (
          <>
            <div className={styles.tableScroll}>
              <table className={styles.table}>
                <thead><tr><th>Time (UTC)</th><th>Event</th><th>Actor ID</th></tr></thead>
                <tbody>
                  {data.data.map((event) => (
                    <tr key={event.id}><td>{new Date(event.createdAt).toISOString()}</td><td>{event.action.replaceAll("_", " ")}</td><td>{event.actorUserId ?? "System"}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
            {data.data.length === 0 && <p className={styles.empty}>No platform events match this filter.</p>}
            <div className={styles.actions}>
              <button type="button" className={styles.button} disabled={page === 0} onClick={() => {
                setData(null); setLoading(true); setPage((current) => current - 1);
              }}>Previous</button>
              <button type="button" className={styles.button} disabled={!data.nextCursor} onClick={() => {
                if (!data.nextCursor) return;
                setCursors((current) => [...current.slice(0, page + 1), data.nextCursor ?? undefined]);
                setData(null); setLoading(true); setPage((current) => current + 1);
              }}>Next</button>
            </div>
          </>
        )}
      </Panel>
    </div>
  );
}
