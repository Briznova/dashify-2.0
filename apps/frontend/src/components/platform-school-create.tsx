"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { useAuthSession } from "@/hooks/use-auth";
import { PageHeading } from "@/components/ui/page-heading";
import { Panel } from "@/components/ui/panel";
import { ResourceState } from "@/components/ui/resource-state";
import { isApiMode, schoolService } from "@/services";
import styles from "./platform-school-create.module.css";

export function PlatformSchoolCreate() {
  const router = useRouter();
  const { session, isLoading, error: sessionError, refresh } = useAuthSession();
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const permitted = isApiMode &&
    session?.scope === "platform" &&
    session.user.role === "super_admin" &&
    session.permissionKeys.includes("platform.schools.read") &&
    session.permissionKeys.includes("platform.schools.create");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!permitted || isPending) return;
    const trimmedName = name.trim();
    const trimmedCode = code.trim();
    if (!trimmedName || !trimmedCode) {
      setError("Enter a school name and code.");
      return;
    }
    if (trimmedName.length < 2 || trimmedName.length > 120) {
      setError("School name must be 2–120 characters.");
      return;
    }
    if (!/^[A-Za-z0-9][A-Za-z0-9-]{1,31}$/.test(trimmedCode)) {
      setError("School code must be 2–32 letters, digits or hyphens and start with a letter or digit.");
      return;
    }

    setIsPending(true);
    setError(null);
    try {
      const school = await schoolService.createPlatformSchool({
        name: trimmedName,
        code: trimmedCode,
      });
      router.push(`/dashboard/schools/${encodeURIComponent(school.id)}`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to create the school.");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <div className={styles.page}>
      <PageHeading eyebrow="PLATFORM / SCHOOLS" title="Create school" description="Create a school directory entry to begin onboarding.">
        <Link className={styles.back} href="/dashboard/schools">← Back to schools</Link>
      </PageHeading>
      {isLoading || sessionError ? (
        <ResourceState isLoading={isLoading} error={sessionError} onRetry={refresh} />
      ) : !permitted ? (
        <p role="alert">School creation is unavailable for this session.</p>
      ) : (
        <Panel title="School details" description="An administrator invitation is a separate step and is not sent by this form.">
          <form className={styles.form} onSubmit={handleSubmit}>
            <label>
              School name
              <input value={name} onChange={(event) => setName(event.target.value)} required maxLength={120} disabled={isPending} />
            </label>
            <label>
              School code
              <input value={code} onChange={(event) => setCode(event.target.value)} required maxLength={32} disabled={isPending} />
            </label>
            {error && <p className={styles.error} role="alert">{error}</p>}
            <button type="submit" disabled={isPending}>
              {isPending ? "Creating school…" : "Create school"}
            </button>
          </form>
        </Panel>
      )}
    </div>
  );
}
