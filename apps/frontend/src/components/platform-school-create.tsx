"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { useAuthSession } from "@/hooks/use-auth";
import { PageHeading } from "@/components/ui/page-heading";
import { Panel } from "@/components/ui/panel";
import { ResourceState } from "@/components/ui/resource-state";
import { isApiMode, schoolAdminService, schoolService } from "@/services";
import type { CreatedPlatformSchool } from "@/types/school";
import styles from "./platform-school-create.module.css";

export function PlatformSchoolCreate() {
  const { session, isLoading, error, refresh } = useAuthSession();
  const permitted = isApiMode &&
    session?.scope === "platform" &&
    session.user.role === "super_admin" &&
    session.permissionKeys.includes("platform.schools.read") &&
    session.permissionKeys.includes("platform.schools.create") &&
    session.permissionKeys.includes("platform.school-admins.create");

  if (isLoading || error) {
    return <ResourceState isLoading={isLoading} error={error} onRetry={refresh} />;
  }
  if (!permitted || !session) {
    return <p role="alert">School and administrator creation require both platform creation permissions.</p>;
  }
  return <CreateSchoolForm key={session.user.id} />;
}

function CreateSchoolForm() {
  const [step, setStep] = useState<"school" | "admin">("school");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [createdSchool, setCreatedSchool] = useState<CreatedPlatformSchool | null>(null);
  const [createdEmail, setCreatedEmail] = useState<string | null>(null);
  const [pending, setPending] = useState<"school" | "admin" | null>(null);
  const [error, setError] = useState<string | null>(null);

  function next(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedName = name.trim();
    const trimmedCode = code.trim();
    if (!trimmedName || !trimmedCode) {
      setError("Enter a school name and code.");
    } else if (trimmedName.length < 2 || trimmedName.length > 120) {
      setError("School name must be 2–120 characters.");
    } else if (!/^[A-Za-z0-9][A-Za-z0-9-]{1,31}$/.test(trimmedCode)) {
      setError("School code must be 2–32 letters, digits or hyphens and start with a letter or digit.");
    } else {
      setError(null);
      setStep("admin");
    }
  }

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    if (!firstName.trim() || !email.trim()) {
      setError("Enter the administrator's first name and email.");
      return;
    }
    let school = createdSchool;
    setError(null);
    try {
      if (!school) {
        setPending("school");
        school = await schoolService.createPlatformSchool({ name: name.trim(), code: code.trim() });
        setCreatedSchool(school);
      }
      setPending("admin");
      const admin = await schoolAdminService.create(school.id, {
        firstName: firstName.trim(),
        ...(lastName.trim() && { lastName: lastName.trim() }),
        email: email.trim().toLowerCase(),
      });
      setCreatedEmail(admin.email);
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : "The request failed.";
      setError(school
        ? `School created, but the administrator request did not complete: ${message} If the request was interrupted, verify the account before retrying.`
        : `School creation did not complete: ${message} If the request was interrupted, check the Schools directory before retrying.`);
    } finally {
      setPending(null);
    }
  }

  return (
    <div className={styles.page}>
      <PageHeading eyebrow="PLATFORM / SCHOOLS" title="Create school" description="Set up the school and its first administrator.">
        <Link className={styles.back} href="/dashboard/schools">← Back to schools</Link>
      </PageHeading>
      <ol className={styles.progress} aria-label="School creation steps">
        <li aria-current={!createdEmail && step === "school" ? "step" : undefined}>
          <span>1</span><div><strong>School details</strong><small>Name and code</small></div>
        </li>
        <li aria-current={!createdEmail && step === "admin" ? "step" : undefined}>
          <span>2</span><div><strong>School administrator</strong><small>Account details</small></div>
        </li>
      </ol>
      {createdSchool && createdEmail ? (
        <Panel title="School and administrator created">
          <p>{createdSchool.name} and the administrator account for {createdEmail} were created.</p>
          <p>The account uses the configured default password. No invitation or email was sent.</p>
          <Link className={styles.back} href={`/dashboard/schools/${encodeURIComponent(createdSchool.id)}`}>View school →</Link>
        </Panel>
      ) : step === "school" ? (
        <Panel title="School details" description="Enter the school name and a unique code. No records are created until you complete the next step.">
          <form className={styles.form} onSubmit={next}>
            <label>School name<input value={name} onChange={(event) => setName(event.target.value)} required maxLength={120} /></label>
            <label>School code<input value={code} onChange={(event) => setCode(event.target.value)} required maxLength={32} /></label>
            {error && <p className={styles.error} role="alert">{error}</p>}
            <button type="submit">Continue to administrator</button>
          </form>
        </Panel>
      ) : (
        <Panel title="School administrator" description={`Create the first administrator for ${createdSchool?.name ?? name.trim()}. Existing accounts cannot be linked.`}>
          <p className={styles.note}>The account uses the server-configured shared default password. No email is sent, email ownership is not verified, and password change is not enforced.</p>
          {createdSchool && <p role="status">School created. Complete the administrator step or return to its detail page later.</p>}
          <form className={styles.form} onSubmit={create}>
            <label>First name<input value={firstName} onChange={(event) => setFirstName(event.target.value)} required maxLength={80} disabled={pending !== null} /></label>
            <label>Last name (optional)<input value={lastName} onChange={(event) => setLastName(event.target.value)} maxLength={80} disabled={pending !== null} /></label>
            <label>Email<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required maxLength={254} disabled={pending !== null} /></label>
            {error && <p className={styles.error} role="alert">{error}</p>}
            <div className={styles.actions}>
              {!createdSchool && <button className={styles.secondary} type="button" disabled={pending !== null} onClick={() => { setError(null); setStep("school"); }}>Back</button>}
              <button type="submit" disabled={pending !== null}>
                {pending === "school" ? "Creating school…" : pending === "admin" ? "Creating administrator…" : createdSchool ? "Retry administrator" : "Create school and administrator"}
              </button>
            </div>
            {createdSchool && <Link className={styles.back} href={`/dashboard/schools/${encodeURIComponent(createdSchool.id)}`}>View school →</Link>}
          </form>
        </Panel>
      )}
    </div>
  );
}
