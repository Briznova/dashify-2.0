"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { useAuthSession } from "@/hooks/use-auth";
import { usePlatformSchools } from "@/hooks/use-school-data";
import { PageHeading } from "@/components/ui/page-heading";
import { Panel } from "@/components/ui/panel";
import { ResourceState } from "@/components/ui/resource-state";
import { PlatformPreview } from "@/components/platform-preview";
import { isApiMode, schoolAdminService } from "@/services";
import styles from "./platform-school-create.module.css";

export function PlatformSchoolAdminCreate({ initialSchoolId }: { initialSchoolId?: string }) {
  const { session, isLoading, error, refresh } = useAuthSession();
  if (!isApiMode) return <PlatformPreview page="create-school-admin" />;
  if (isLoading || error) return <ResourceState isLoading={isLoading} error={error} onRetry={refresh} />;
  if (session?.scope !== "platform" || session.user.role !== "super_admin" ||
    !session.permissionKeys.includes("platform.schools.read") ||
    !session.permissionKeys.includes("platform.school-admins.create")) {
    return <p role="alert">School administrator creation is unavailable for this session.</p>;
  }
  return <CreateForm key={session.user.id} initialSchoolId={initialSchoolId} />;
}

function CreateForm({ initialSchoolId }: { initialSchoolId?: string }) {
  const { data: schools, isLoading, error, refresh } = usePlatformSchools();
  const [schoolId, setSchoolId] = useState(initialSchoolId ?? "");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [pending, setPending] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [created, setCreated] = useState<{ email: string; schoolId: string } | null>(null);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending || !schoolId) return;
    setPending(true);
    setSaveError(null);
    try {
      const result = await schoolAdminService.create(schoolId, {
        firstName: firstName.trim(), ...(lastName.trim() && { lastName: lastName.trim() }), email: email.trim().toLowerCase(),
      });
      setCreated(result);
    } catch (reason) {
      setSaveError(`${reason instanceof Error ? reason.message : "Unable to create the account."} If the request was interrupted, verify the account before retrying.`);
    } finally {
      setPending(false);
    }
  }
  return (
    <div className={styles.page}>
      <PageHeading eyebrow="PLATFORM / SCHOOLS" title="Create school administrator" description="Create an account for the selected school.">
        <Link className={styles.back} href="/dashboard/schools">← Back to schools</Link>
      </PageHeading>
      <p role="note">This creates an active account using the server-configured shared default password. No email is sent, email ownership is not verified, and password change is not enforced.</p>
      {isLoading || error ? <ResourceState isLoading={isLoading} error={error} onRetry={refresh} /> : created ? (
        <Panel title="Administrator created">
          <p>Account created for {created.email}. Use the configured default password to sign in; no invitation was sent.</p>
          <Link className={styles.back} href={`/dashboard/schools/${encodeURIComponent(created.schoolId)}`}>View school</Link>
        </Panel>
      ) : (
        <Panel title="School administrator details" description="Choose an active school and create a new account. Existing identities cannot be linked.">
          <form className={styles.form} onSubmit={submit}>
            <label>School
              <select value={schoolId} onChange={(event) => setSchoolId(event.target.value)} required disabled={pending}>
                <option value="">Select a school</option>
                {schools?.filter((school) => school.isActive).map((school) => <option key={school.id} value={school.id}>{school.name} ({school.code})</option>)}
              </select>
            </label>
            <label>First name<input value={firstName} onChange={(event) => setFirstName(event.target.value)} required maxLength={80} disabled={pending} /></label>
            <label>Last name (optional)<input value={lastName} onChange={(event) => setLastName(event.target.value)} maxLength={80} disabled={pending} /></label>
            <label>Email<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required maxLength={254} disabled={pending} /></label>
            {saveError && <p className={styles.error} role="alert">{saveError}</p>}
            <button type="submit" disabled={pending || !schoolId}>{pending ? "Creating…" : "Create account"}</button>
          </form>
        </Panel>
      )}
    </div>
  );
}
