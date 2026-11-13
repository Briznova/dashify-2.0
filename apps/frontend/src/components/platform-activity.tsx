"use client";

import { useEffect, useState } from "react";
import { ResourceState } from "@/components/ui/resource-state";
import { platformAuditService } from "@/services";
import type { PlatformAuditEvent } from "@/types/platform-audit";
import styles from "./platform-schools-directory.module.css";

export function PlatformActivity() {
  const [events, setEvents] = useState<PlatformAuditEvent[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    void platformAuditService.list({ pageSize: 3 }, controller.signal).then(
      (result) => { if (!controller.signal.aborted) { setEvents(result.data); setError(null); } },
      (reason: unknown) => {
        if (!controller.signal.aborted) {
          setEvents(null);
          setError(reason instanceof Error ? reason.message : "Unable to load platform activity.");
        }
      },
    );
    return () => controller.abort();
  }, [version]);

  if (!events) {
    return <ResourceState isLoading={!error} error={error} onRetry={() => {
      setError(null); setVersion((current) => current + 1);
    }} />;
  }
  if (events.length === 0) return <p className={styles.previewText}>No platform activity is available.</p>;
  return (
    <ul className={styles.activityList}>
      {events.map((event) => (
        <li key={event.id}>
          <span>{event.action.replaceAll("_", " ")}</span>
          <time dateTime={event.createdAt}>{new Date(event.createdAt).toISOString()}</time>
        </li>
      ))}
    </ul>
  );
}
