"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Panel } from "@/components/ui/panel";
import { ResourceState } from "@/components/ui/resource-state";
import { schoolService } from "@/services";
import styles from "./student-record.module.css";

export function AdmissionSettings() {
  const [prefix, setPrefix] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    schoolService.getAdmissionSettings(controller.signal).then(
      (settings) => { if (!controller.signal.aborted) { setPrefix(settings.prefix); setError(null); setLoading(false); } },
      (reason: unknown) => { if (!controller.signal.aborted) { setError(reason instanceof Error ? reason.message : "Unable to load admission settings."); setLoading(false); } },
    );
    return () => controller.abort();
  }, [version]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (prefix === null || pending) return;
    setPending(true);
    setError(null);
    setSaved(false);
    try {
      const settings = await schoolService.updateAdmissionSettings(prefix);
      setPrefix(settings.prefix);
      setSaved(true);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to save admission settings.");
    } finally {
      setPending(false);
    }
  }

  return (
    <Panel title="Admission IDs" description="New IDs use this prefix, the admission year, and an annual sequence. Existing IDs do not change.">
      {prefix === null ? (
        <ResourceState isLoading={loading} error={error} onRetry={() => { setLoading(true); setVersion((value) => value + 1); }} />
      ) : (
        <form onSubmit={submit}>
          <div className={styles.formGrid}>
            <label>Admission ID prefix<input value={prefix} onChange={(event) => { setPrefix(event.target.value); setSaved(false); }} minLength={2} maxLength={32} pattern="[A-Za-z0-9][A-Za-z0-9-]*" required /></label>
          </div>
          {error && <p className={styles.formError} role="alert">{error}</p>}
          {saved && <p role="status">Admission prefix saved.</p>}
          <div className={styles.formActions}><button type="submit" disabled={pending}>{pending ? "Saving…" : "Save prefix"}</button></div>
        </form>
      )}
    </Panel>
  );
}
