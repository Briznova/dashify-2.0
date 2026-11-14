"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { useAuthSession } from "@/hooks/use-auth";
import { useAcademicYears, useClassrooms } from "@/hooks/use-school-data";
import { PageHeading } from "@/components/ui/page-heading";
import { Panel } from "@/components/ui/panel";
import { ResourceState } from "@/components/ui/resource-state";
import { schoolService } from "@/services";
import type { StudentAdmissionInput, StudentGuardianInput } from "@/types/school";
import styles from "./student-record.module.css";

const blankGuardian = (isPrimary: boolean): StudentGuardianInput => ({
  firstName: "", relationship: "GUARDIAN", phone: "", isPrimary,
});
const relationships = ["FATHER", "MOTHER", "GUARDIAN", "GRANDPARENT", "OTHER"] as const;
const genders = ["MALE", "FEMALE", "OTHER", "PREFER_NOT_TO_SAY"] as const;

export function StudentAdmissionForm() {
  const { session, isLoading, error, refresh } = useAuthSession();
  if (isLoading || error) return <ResourceState isLoading={isLoading} error={error} onRetry={refresh} />;
  if (!session?.activeSchool || !session.permissionKeys.includes("students.create") || !session.permissionKeys.includes("academic_structure.read")) {
    return <p role="alert">Student creation and academic structure permissions are required.</p>;
  }
  return <AdmissionForm key={session.activeSchool.id} />;
}

function AdmissionForm() {
  const router = useRouter();
  const years = useAcademicYears();
  const classrooms = useClassrooms();
  const [draft, setDraft] = useState<StudentAdmissionInput>({
    firstName: "", lastName: "", dateOfBirth: "", admissionDate: "",
    academicYearId: "", classId: "", sectionId: "",
    guardians: [blankGuardian(true)], emergencyContact: { kind: "PRIMARY_GUARDIAN" },
  });
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const selectedClass = classrooms.data?.find((item) => item.id === draft.classId);
  const sections = selectedClass?.sections.filter((item) => item.isActive) ?? [];
  const primaryCount = draft.guardians.filter((guardian) => guardian.isPrimary).length;

  function changeGuardian(index: number, patch: Partial<StudentGuardianInput>) {
    setDraft((current) => ({ ...current, guardians: current.guardians.map((guardian, i) => i === index ? { ...guardian, ...patch } : guardian) }));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    if (primaryCount !== 1) {
      setError("Choose exactly one primary guardian.");
      return;
    }
    if (draft.dateOfBirth > draft.admissionDate) {
      setError("Date of birth cannot be after admission date.");
      return;
    }
    setError(null);
    setPending(true);
    try {
      const student = await schoolService.admitStudent({
        ...draft,
        firstName: draft.firstName.trim(),
        middleName: draft.middleName?.trim() || undefined,
        lastName: draft.lastName.trim(),
        rollNumber: draft.rollNumber?.trim() || undefined,
        guardians: draft.guardians.map((guardian) => ({
          ...guardian, firstName: guardian.firstName.trim(),
          lastName: guardian.lastName?.trim() || undefined,
          phone: guardian.phone.trim(), email: guardian.email?.trim() || undefined,
        })),
      });
      router.push(`/dashboard/students/${student.id}`);
      router.refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to create the student.");
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <PageHeading eyebrow="STUDENT DIRECTORY" title="Add a student" description="Create a student, guardian contact, and initial placement." />
      <form className={styles.formCard} onSubmit={submit}>
        <Panel title="Student details" description="The admission ID is generated when the student is saved.">
          <div className={styles.formGrid}>
            <label>First name<input value={draft.firstName} onChange={(e) => setDraft({ ...draft, firstName: e.target.value })} maxLength={80} required /></label>
            <label>Middle name<input value={draft.middleName ?? ""} onChange={(e) => setDraft({ ...draft, middleName: e.target.value })} maxLength={80} /></label>
            <label>Last name<input value={draft.lastName} onChange={(e) => setDraft({ ...draft, lastName: e.target.value })} maxLength={80} required /></label>
            <label>Date of birth<input type="date" value={draft.dateOfBirth} onChange={(e) => setDraft({ ...draft, dateOfBirth: e.target.value })} required /></label>
            <label>Gender<select value={draft.gender ?? ""} onChange={(e) => setDraft({ ...draft, gender: genders.find((value) => value === e.target.value) })}><option value="">Not specified</option>{genders.map((value) => <option key={value} value={value}>{value.replaceAll("_", " ").toLowerCase()}</option>)}</select></label>
          </div>
          <Panel title="Initial placement" description="The selected section must have available capacity.">
            <div className={styles.formGrid}>
              <label>Admission date<input type="date" value={draft.admissionDate} onChange={(e) => setDraft({ ...draft, admissionDate: e.target.value })} required /></label>
              <label>Academic year<select value={draft.academicYearId} onChange={(e) => setDraft({ ...draft, academicYearId: e.target.value })} required><option value="">Select an academic year</option>{years.data?.map((year) => <option key={year.id} value={year.id}>{year.name}</option>)}</select></label>
              <label>Class<select value={draft.classId} onChange={(e) => setDraft({ ...draft, classId: e.target.value, sectionId: "" })} required><option value="">Select a class</option>{classrooms.data?.filter((item) => item.isActive).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
              <label>Section<select value={draft.sectionId} onChange={(e) => setDraft({ ...draft, sectionId: e.target.value })} required disabled={!draft.classId}><option value="">Select a section</option>{sections.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
              <label>Roll number (optional)<input value={draft.rollNumber ?? ""} onChange={(e) => setDraft({ ...draft, rollNumber: e.target.value })} maxLength={40} /></label>
            </div>
            <ResourceState isLoading={years.isLoading} error={years.error} onRetry={years.refresh} />
            <ResourceState isLoading={classrooms.isLoading} error={classrooms.error} onRetry={classrooms.refresh} />
            {years.data?.length === 0 && <p className={styles.empty}>Create an academic year before adding students.</p>}
            {classrooms.data && !classrooms.data.some((item) => item.isActive && item.sections.some((section) => section.isActive)) && <p className={styles.empty}>Create an active class and section before adding students.</p>}
            {selectedClass && sections.length === 0 && <p className={styles.empty}>This class has no active sections.</p>}
          </Panel>
          <Panel title="Guardians" description="At least one guardian and exactly one primary guardian are required.">
            {draft.guardians.map((guardian, index) => (
              <div className={styles.formGrid} key={index}>
                <label>Guardian {index + 1} first name<input value={guardian.firstName} onChange={(e) => changeGuardian(index, { firstName: e.target.value })} maxLength={80} required /></label>
                <label>Guardian {index + 1} last name<input value={guardian.lastName ?? ""} onChange={(e) => changeGuardian(index, { lastName: e.target.value })} maxLength={80} /></label>
                <label>Guardian {index + 1} relationship<select value={guardian.relationship} onChange={(e) => { const relationship = relationships.find((value) => value === e.target.value); if (relationship) changeGuardian(index, { relationship }); }}>{relationships.map((value) => <option key={value} value={value}>{value.toLowerCase()}</option>)}</select></label>
                <label>Guardian {index + 1} phone<input type="tel" value={guardian.phone} onChange={(e) => changeGuardian(index, { phone: e.target.value })} placeholder="International format" required /></label>
                <label>Guardian {index + 1} email<input type="email" value={guardian.email ?? ""} onChange={(e) => changeGuardian(index, { email: e.target.value })} /></label>
                <label><input type="radio" name="primaryGuardian" checked={guardian.isPrimary} onChange={() => setDraft({ ...draft, guardians: draft.guardians.map((item, i) => ({ ...item, isPrimary: i === index })) })} /> Primary guardian</label>
                {draft.guardians.length > 1 && <button type="button" onClick={() => setDraft({ ...draft, guardians: draft.guardians.filter((_, i) => i !== index) })}>Remove guardian</button>}
              </div>
            ))}
            {draft.guardians.length < 5 && <button type="button" onClick={() => setDraft({ ...draft, guardians: [...draft.guardians, blankGuardian(false)] })}>Add guardian</button>}
          </Panel>
          <Panel title="Emergency contact">
            <div className={styles.formGrid}>
              <label>Contact<select value={draft.emergencyContact.kind} onChange={(e) => setDraft({ ...draft, emergencyContact: e.target.value === "OTHER" ? { kind: "OTHER", name: "", phone: "" } : { kind: "PRIMARY_GUARDIAN" } })}><option value="PRIMARY_GUARDIAN">Use primary guardian</option><option value="OTHER">Separate contact</option></select></label>
              {draft.emergencyContact.kind === "OTHER" && <>
                <label>Emergency contact name<input value={draft.emergencyContact.name} onChange={(e) => setDraft({ ...draft, emergencyContact: { ...draft.emergencyContact, kind: "OTHER", name: e.target.value, phone: draft.emergencyContact.kind === "OTHER" ? draft.emergencyContact.phone : "" } })} maxLength={160} required /></label>
                <label>Emergency contact phone<input type="tel" value={draft.emergencyContact.phone} onChange={(e) => setDraft({ ...draft, emergencyContact: { ...draft.emergencyContact, kind: "OTHER", name: draft.emergencyContact.kind === "OTHER" ? draft.emergencyContact.name : "", phone: e.target.value } })} placeholder="International format" required /></label>
              </>}
            </div>
          </Panel>
          <Panel title="Address (optional)">
            <div className={styles.formGrid}>
              {([["line1", "Address line", 160], ["city", "City", 80], ["state", "State", 80], ["postalCode", "Postal code", 20]] as const).map(([field, label, max]) => (
                <label key={field}>{label}<input maxLength={max} value={draft.address?.[field] ?? ""} onChange={(e) => setDraft({ ...draft, address: { ...draft.address, [field]: e.target.value } })} /></label>
              ))}
            </div>
          </Panel>
          {error && <p className={styles.formError} role="alert">{error}</p>}
          <div className={styles.formActions}><Link href="/dashboard/students">Cancel</Link><button type="submit" disabled={pending || !years.data?.length || !classrooms.data || Boolean(years.error || classrooms.error)}>{pending ? "Creating…" : "Create student"}</button></div>
        </Panel>
      </form>
    </>
  );
}
