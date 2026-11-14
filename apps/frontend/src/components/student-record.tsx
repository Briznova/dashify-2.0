"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import {
  useAcademicYears,
  useAssignments,
  useClassrooms,
  useFees,
  useSaveStudent,
  useStudent,
} from "@/hooks/use-school-data";
import type { StudentCreateInput, StudentInput } from "@/types/school";
import { PageHeading } from "@/components/ui/page-heading";
import { Icon } from "@/components/ui/icon";
import { Panel } from "@/components/ui/panel";
import { ResourceState } from "@/components/ui/resource-state";
import { StatusBadge } from "@/components/ui/status-badge";
import { isApiMode } from "@/services";
import { StudentAdmissionForm } from "@/components/student-admission-form";
import styles from "./student-record.module.css";

const emptyStudent: StudentInput = {
  name: "",
  studentNumber: "",
  grade: "",
  guardian: "",
};
const blankStudentDraft = (): StudentCreateInput => ({
  admissionNumber: "",
  firstName: "",
  middleName: "",
  lastName: "",
  dateOfBirth: "",
  admissionDate: "",
  academicYearId: "",
  classId: "",
  sectionId: "",
  guardians: [],
});
const genderOptions = ["MALE", "FEMALE", "OTHER", "PREFER_NOT_TO_SAY"] as const;
const guardianRelationshipOptions = ["FATHER", "MOTHER", "GUARDIAN", "GRANDPARENT", "OTHER"] as const;

function initials(name: string) {
  return name.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
}

export function StudentProfile({ studentId }: { studentId: string }) {
  const studentResource = useStudent(studentId);
  const fees = useFees(!isApiMode);
  const assignments = useAssignments(!isApiMode);
  const [activeTab, setActiveTab] = useState<"overview" | "academics" | "attendance" | "documents">("overview");
  const student = studentResource.data;
  const studentFees = fees.data?.filter((fee) => fee.studentNumber === student?.studentNumber) ?? [];
  const tabs = isApiMode ? (["overview"] as const) : (["overview", "academics", "attendance", "documents"] as const);

  return (
    <>
      <PageHeading
        eyebrow="STUDENT DIRECTORY"
        title={student?.name ?? "Student profile"}
        description={isApiMode ? "Student identity, guardian contacts, and available placement information." : "A complete view of a student’s school journey and key information."}
      >
        {student && !isApiMode && (
          <Link className={styles.primaryLink} href={`/dashboard/students/${student.id}/edit`}>
            Edit profile <Icon name="arrowUpRight" size={14} />
          </Link>
        )}
      </PageHeading>
      <ResourceState
        error={studentResource.error}
        isLoading={studentResource.isLoading}
        onRetry={studentResource.refresh}
      />
      {student && (
        <>
          <section className={styles.profileHero}>
            <span className={styles.avatar}>{initials(student.name)}</span>
            <div className={styles.profileIdentity}>
              <div><h2>{student.name}</h2><StatusBadge>{student.status}</StatusBadge></div>
              <p>{student.studentNumber} <span aria-hidden="true">·</span> {[student.className ?? student.grade, student.sectionName].filter(Boolean).join(" · ")}</p>
            </div>
            {!isApiMode && <>
              <div className={styles.profileStat}><span>Attendance</span><strong>{student.attendance}</strong></div>
              <div className={styles.profileStat}><span>Fee balance</span><strong>{studentFees.filter((fee) => fee.status !== "Paid").reduce((sum, fee) => sum + fee.amount, 0).toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 })}</strong></div>
            </>}
          </section>
          <nav className={styles.tabs} aria-label="Student profile sections">
            {tabs.map((tab) => (
              <button
                type="button"
                key={tab}
                aria-current={activeTab === tab ? "page" : undefined}
                className={activeTab === tab ? styles.tabActive : ""}
                onClick={() => setActiveTab(tab)}
              >
                {tab === "attendance" ? "Attendance & fees" : tab[0].toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </nav>
          {activeTab === "overview" && (
            <div className={styles.profileGrid}>
              <Panel title="Student information" description="Personal and enrollment details.">
                <dl className={styles.detailList}>
                  <div><dt>Student name</dt><dd>{student.name}</dd></div>
                  <div><dt>Student ID</dt><dd>{student.studentNumber}</dd></div>
                  <div><dt>Class & section</dt><dd>{isApiMode ? [student.className, student.sectionName].filter(Boolean).join(" · ") || "Unavailable" : [student.className ?? student.grade, student.sectionName].filter(Boolean).join(" · ") || "—"}</dd></div>
                  {(isApiMode || student.academicYearName) && <div><dt>Academic year</dt><dd>{student.academicYearName ?? "Unavailable"}</dd></div>}
                  {student.rollNumber && <div><dt>Roll number</dt><dd>{student.rollNumber}</dd></div>}
                  {student.dateOfBirth && <div><dt>Date of birth</dt><dd>{student.dateOfBirth.slice(0, 10)}</dd></div>}
                  <div><dt>Admission date</dt><dd>{student.admissionDate?.slice(0, 10) ?? "—"}</dd></div>
                  <div><dt>Record status</dt><dd><StatusBadge>{student.status}</StatusBadge></dd></div>
                  {student.address && <div><dt>Address</dt><dd>{[student.address.line1, student.address.city, student.address.state, student.address.postalCode].filter(Boolean).join(", ") || "Not provided"}</dd></div>}
                </dl>
                {isApiMode && <p className={styles.empty}>Placement is shown only when exactly one enrolment is marked active. Dates are not considered.</p>}
              </Panel>
              <Panel title="Parent / guardian" description="Primary family contact for this student.">
                {(student.guardians?.length ?? 0) > 0
                  ? student.guardians?.map((guardian) => (
                    <div className={styles.guardianCard} key={guardian.id}>
                      <span className={styles.guardianAvatar}>{initials(guardian.name)}</span>
                      <div><strong>{guardian.name}</strong><p>{guardian.relationship}{guardian.isPrimary ? " · Primary" : ""} · {guardian.phone}{guardian.email ? ` · ${guardian.email}` : ""}</p></div>
                    </div>
                  ))
                  : student.guardian
                    ? <div className={styles.guardianCard}><span className={styles.guardianAvatar}>{initials(student.guardian)}</span><div><strong>{student.guardian}</strong><p>Primary guardian</p></div></div>
                    : <p className={styles.empty}>No guardian details are on file.</p>}
                {student.emergencyContact && (
                  <div className={styles.guardianCard}>
                    <div><strong>Emergency contact</strong><p>{student.emergencyContact.kind === "OTHER"
                      ? `${student.emergencyContact.name} · ${student.emergencyContact.phone}`
                      : (() => {
                          const primary = student.guardians?.find((guardian) => guardian.isPrimary);
                          return primary ? `${primary.name} · ${primary.phone} (primary guardian)` : "Primary guardian unavailable";
                        })()}</p></div>
                  </div>
                )}
              </Panel>
            </div>
          )}
          {isApiMode && <p className={styles.unavailable}>Academic records, attendance, fees, and documents are not available in this profile yet.</p>}
          {activeTab === "academics" && (
            <Panel title="Academic history" description="Recent coursework and learning progress.">
              <div className={styles.recordList}>
                {(assignments.data ?? []).slice(0, 3).map((assignment) => (
                  <div className={styles.recordRow} key={assignment.id}>
                    <span className={styles.recordIcon}><Icon name="file" size={17} /></span>
                    <div><strong>{assignment.title}</strong><span>{assignment.subject} · {assignment.className}</span></div>
                    <StatusBadge>{assignment.status}</StatusBadge>
                  </div>
                ))}
                {!assignments.data?.length && <p className={styles.empty}>Academic records will appear here.</p>}
              </div>
            </Panel>
          )}
          {activeTab === "attendance" && (
            <Panel title="Attendance & fees" description="At-a-glance school engagement and account standing.">
              <div className={styles.recordList}>
                <div className={styles.recordRow}><span className={styles.recordIcon}><Icon name="calendarCheck" size={17} /></span><div><strong>Attendance this term</strong><span>Present on {student.attendance ?? "—"} of school days.</span></div><StatusBadge variant="success">{student.attendance ?? "—"}</StatusBadge></div>
                {studentFees.map((fee) => (
                  <div className={styles.recordRow} key={fee.id}>
                    <span className={styles.recordIcon}><Icon name="wallet" size={17} /></span>
                    <div><strong>{fee.invoiceNumber}</strong><span>{fee.dueDate} · ${fee.amount.toLocaleString()}</span></div>
                    <StatusBadge>{fee.status}</StatusBadge>
                  </div>
                ))}
                {!studentFees.length && <p className={styles.empty}>There are no fee records for this student.</p>}
              </div>
            </Panel>
          )}
          {activeTab === "documents" && (
            <Panel title="Student documents" description="Keep enrollment forms and school documents together.">
              <div className={styles.emptyDocument}>
                <span><Icon name="file" size={20} /></span>
                <strong>No documents added yet</strong>
                <p>Student files and consent forms will be available here.</p>
              </div>
            </Panel>
          )}
        </>
      )}
    </>
  );
}

export function StudentForm({ studentId }: { studentId?: string }) {
  if (isApiMode && !studentId) {
    return <StudentAdmissionForm />;
  }
  return <LegacyStudentForm studentId={studentId} />;
}

function LegacyStudentForm({ studentId }: { studentId?: string }) {
  const router = useRouter();
  const studentResource = useStudent(studentId ?? "");
  const mutation = useSaveStudent();
  const years = useAcademicYears();
  const classrooms = useClassrooms();
  const existing = studentId ? studentResource.data : undefined;
  const [draft, setDraft] = useState<StudentCreateInput>(blankStudentDraft());

  useEffect(() => {
    if (!existing) return;
    setDraft({
      admissionNumber: existing.studentNumber,
      firstName: existing.firstName ?? "",
      middleName: existing.middleName ?? "",
      lastName: existing.lastName ?? "",
      dateOfBirth: existing.dateOfBirth ?? "",
      gender: (existing.gender as StudentCreateInput["gender"]) ?? undefined,
      admissionDate: existing.admissionDate ?? "",
      academicYearId: existing.academicYearId ?? "",
      classId: existing.classId ?? "",
      sectionId: existing.sectionId ?? "",
      guardians: (existing.guardians ?? []).map((guardian) => ({
        id: guardian.id,
        firstName: guardian.name.split(" ").slice(0, -1).join(" ") || guardian.name,
        lastName: guardian.name.split(" ").slice(-1)[0] || undefined,
        relationship: (guardian.relationship as "FATHER" | "MOTHER" | "GUARDIAN" | "GRANDPARENT" | "OTHER") ?? "MOTHER",
        phone: guardian.phone,
        email: guardian.email ?? undefined,
        isPrimary: guardian.isPrimary,
      })),
    });
  }, [existing]);

  const selectedClass = classrooms.data?.find((room) => room.id === draft.classId);
  const selectedSections = selectedClass?.sections.filter((section) => section.isActive) ?? [];
  const hasActiveClasses = classrooms.data?.some(
    (room) => room.isActive && room.sections.some((section) => section.isActive),
  ) ?? false;
  const isEditing = Boolean(studentId);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const persistedStudent = isEditing ? existing : null;
    const persistedGender = genderOptions.find(
      (option) => option === persistedStudent?.gender,
    );
    const normalizedDraft = {
      ...draft,
      admissionNumber: draft.admissionNumber.trim(),
      firstName: draft.firstName.trim(),
      middleName: draft.middleName?.trim() || undefined,
      lastName: draft.lastName.trim(),
      dateOfBirth: draft.dateOfBirth || persistedStudent?.dateOfBirth || undefined,
      admissionDate: draft.admissionDate || persistedStudent?.admissionDate || undefined,
      academicYearId: draft.academicYearId || persistedStudent?.academicYearId || undefined,
      classId: draft.classId || persistedStudent?.classId || undefined,
      sectionId: draft.sectionId || persistedStudent?.sectionId || undefined,
      gender: draft.gender ?? persistedGender,
      guardians: draft.guardians.map((item) => ({
        ...item,
        id: item.id,
        firstName: item.firstName.trim(),
        lastName: item.lastName?.trim() || undefined,
        phone: item.phone.trim(),
        email: item.email?.trim() || undefined,
      })),
    };

    const savedStudent = await mutation.save(studentId ?? null, normalizedDraft);
    if (savedStudent) {
      router.push(`/dashboard/students/${savedStudent.id}`);
      router.refresh();
    }
  }

  return (
    <>
      <PageHeading
        eyebrow="STUDENT DIRECTORY"
        title={isEditing ? "Edit student" : "Add a student"}
        description={isEditing ? "Keep this student’s school record up to date." : "Create a student profile, enrol them in an academic class, and optionally add a guardian."}
      />
      {isEditing && (
        <ResourceState
          error={studentResource.error}
          isLoading={studentResource.isLoading}
          onRetry={studentResource.refresh}
        />
      )}
      {(!isEditing || existing) && (
        <form className={styles.formCard} onSubmit={handleSubmit}>
          <Panel title="Student details" description="Add the information needed to set up this student’s record.">
            <div className={styles.formGrid}>
              <label>Admission number<input value={draft.admissionNumber} onChange={(event) => setDraft({ ...draft, admissionNumber: event.target.value })} maxLength={40} required /></label>
              <label>First name<input value={draft.firstName} onChange={(event) => setDraft({ ...draft, firstName: event.target.value })} maxLength={80} autoComplete="given-name" required /></label>
              <label>Middle name<input value={draft.middleName ?? ""} onChange={(event) => setDraft({ ...draft, middleName: event.target.value })} maxLength={80} autoComplete="additional-name" /></label>
              <label>Last name<input value={draft.lastName} onChange={(event) => setDraft({ ...draft, lastName: event.target.value })} maxLength={80} autoComplete="family-name" required /></label>
              <label>Date of birth<input type="date" value={draft.dateOfBirth ?? ""} onChange={(event) => setDraft({ ...draft, dateOfBirth: event.target.value })} /></label>
              <label>Gender<select value={draft.gender ?? ""} onChange={(event) => setDraft({ ...draft, gender: genderOptions.find((option) => option === event.target.value) })}><option value="">Not specified</option>{genderOptions.map((option) => <option key={option} value={option}>{option.replaceAll("_", " ").toLowerCase()}</option>)}</select></label>
            </div>
            <Panel title="Enrollment details" description="Choose the academic year, class, and active section for this student.">
              <div className={styles.formGrid}>
                <label>Admission date<input type="date" value={draft.admissionDate} onChange={(event) => setDraft({ ...draft, admissionDate: event.target.value })} required={!isEditing} /></label>
                <label>Academic year<select value={draft.academicYearId} onChange={(event) => setDraft({ ...draft, academicYearId: event.target.value })} required={!isEditing}><option value="">Select an academic year</option>{years.data?.map((year) => <option key={year.id} value={year.id}>{year.name}</option>)}</select></label>
                <label>Class<select value={draft.classId} onChange={(event) => {
                  const classId = event.target.value;
                  setDraft((current) => ({ ...current, classId, sectionId: "" }));
                }} required={!isEditing}><option value="">Select a class</option>{classrooms.data?.filter((room) => room.isActive).map((room) => <option key={room.id} value={room.id}>{room.name} ({room.code})</option>)}</select></label>
                <label>Section<select value={draft.sectionId} onChange={(event) => {
                  const sectionId = event.target.value;
                  setDraft((current) => ({ ...current, sectionId }));
                }} required={!isEditing} disabled={!draft.classId}><option value="">Select a section</option>{selectedSections.map((section) => <option key={section.id} value={section.id}>{section.name} ({section.code})</option>)}</select></label>
              </div>
              {years.error && <p className={styles.formError} role="alert">{years.error}</p>}
              {classrooms.error && <p className={styles.formError} role="alert">{classrooms.error}</p>}
              {years.data?.length === 0 && <p className={styles.empty}>Create an academic year before enrolling students.</p>}
              {classrooms.data && !hasActiveClasses && <p className={styles.empty}>Create a class with an active section before enrolling students.</p>}
              {selectedClass && selectedSections.length === 0 && <p className={styles.empty}>This class has no active sections.</p>}
            </Panel>
            <Panel title="Guardian (optional)" description="Add a guardian contact as part of this student’s record.">
              {draft.guardians.map((item, index) => (
                <div className={styles.formGrid} key={index}>
                  <label>Guardian {index + 1} first name<input value={item.firstName} onChange={(event) => setDraft({ ...draft, guardians: draft.guardians.map((guardianItem, guardianIndex) => guardianIndex === index ? { ...guardianItem, firstName: event.target.value } : guardianItem) })} maxLength={80} required /></label>
                  <label>Guardian {index + 1} last name<input value={item.lastName ?? ""} onChange={(event) => setDraft({ ...draft, guardians: draft.guardians.map((guardianItem, guardianIndex) => guardianIndex === index ? { ...guardianItem, lastName: event.target.value } : guardianItem) })} maxLength={80} /></label>
                  <label>Guardian {index + 1} relationship<select value={item.relationship} onChange={(event) => {
                    const relationship = guardianRelationshipOptions.find((option) => option === event.target.value);
                    if (relationship) setDraft({ ...draft, guardians: draft.guardians.map((guardianItem, guardianIndex) => guardianIndex === index ? { ...guardianItem, relationship } : guardianItem) });
                  }}>{guardianRelationshipOptions.map((option) => <option key={option} value={option}>{option.toLowerCase()}</option>)}</select></label>
                  <label>Guardian {index + 1} phone<input type="tel" value={item.phone} onChange={(event) => setDraft({ ...draft, guardians: draft.guardians.map((guardianItem, guardianIndex) => guardianIndex === index ? { ...guardianItem, phone: event.target.value } : guardianItem) })} placeholder="+15551234567" required /></label>
                  <label>Guardian {index + 1} email<input type="email" value={item.email ?? ""} onChange={(event) => setDraft({ ...draft, guardians: draft.guardians.map((guardianItem, guardianIndex) => guardianIndex === index ? { ...guardianItem, email: event.target.value } : guardianItem) })} /></label>
                  <label><input type="checkbox" checked={item.isPrimary} onChange={() => setDraft({ ...draft, guardians: draft.guardians.map((guardianItem, guardianIndex) => ({ ...guardianItem, isPrimary: guardianIndex === index })) })} /> Primary guardian</label>
                  <button type="button" onClick={() => setDraft({ ...draft, guardians: draft.guardians.filter((_, guardianIndex) => guardianIndex !== index) })}>Remove guardian</button>
                </div>
              ))}
              {draft.guardians.length < 5 && <button type="button" onClick={() => setDraft({ ...draft, guardians: [...draft.guardians, { firstName: "", relationship: "MOTHER", phone: "", isPrimary: draft.guardians.length === 0 }] })}>Add guardian</button>}
            </Panel>
            {mutation.error && <p className={styles.formError} role="alert">{mutation.error}</p>}
            <div className={styles.formActions}>
              <Link href="/dashboard/students">Cancel</Link>
              <button type="submit" disabled={mutation.isPending || (!isEditing && (years.isLoading || classrooms.isLoading || !years.data?.length || !hasActiveClasses))}>{mutation.isPending ? "Saving…" : isEditing ? "Save changes" : "Create student"}</button>
            </div>
          </Panel>
        </form>
      )}
      {isEditing && studentResource.data && !existing && (
        <div className={styles.notFound} role="status">
          This student could not be found.
          <Link href="/dashboard/students">Return to students</Link>
        </div>
      )}
    </>
  );
}
