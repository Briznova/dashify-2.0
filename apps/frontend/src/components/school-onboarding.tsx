"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Panel } from "@/components/ui/panel";
import { ResourceState } from "@/components/ui/resource-state";
import { schoolOnboardingService } from "@/services";
import type { SchoolOnboarding as Onboarding } from "@/services/http/http-school-onboarding-service";

export function SchoolOnboarding() {
  const [data, setData] = useState<Onboarding | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [version, setVersion] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    void schoolOnboardingService.get(controller.signal).then(
      (result) => { if (!controller.signal.aborted) { setData(result); setError(null); } },
      (reason: unknown) => {
        if (!controller.signal.aborted) {
          setData(null);
          setError(reason instanceof Error ? reason.message : "Unable to load onboarding.");
        }
      },
    );
    return () => controller.abort();
  }, [version]);

  function reload() { setData(null); setError(null); setVersion((value) => value + 1); }
  async function complete() {
    if (saving) return;
    setSaving(true);
    setError(null);
    try {
      setData(await schoolOnboardingService.complete());
    } catch (reason) {
      setData(null);
      setError(reason instanceof Error ? reason.message : "Unable to confirm onboarding.");
    } finally {
      setSaving(false);
    }
  }
  return (
    <Panel title="School onboarding" description="Confirm setup after the required academic structure is ready.">
      {!data ? <ResourceState isLoading={!error} error={error} onRetry={reload} /> : data.status === "COMPLETED" ? (
        <p>Setup confirmed by a School Admin.</p>
      ) : (
        <>
          <p>{data.status === null ? "No onboarding confirmation has been recorded." : "Setup has not been confirmed."}</p>
          <ul>
            <li>Academic year: {data.prerequisites.academicYear ? "Ready" : "Required"} — <Link href="/dashboard/academics">Manage academic years</Link></li>
            <li>Active class with an active section: {data.prerequisites.classWithSection ? "Ready" : "Required"} — <Link href="/dashboard/classes">Manage classes</Link></li>
          </ul>
          <button type="button" disabled={saving || !data.prerequisites.academicYear || !data.prerequisites.classWithSection} onClick={() => void complete()}>
            {saving ? "Confirming…" : "Confirm school setup"}
          </button>
        </>
      )}
    </Panel>
  );
}
