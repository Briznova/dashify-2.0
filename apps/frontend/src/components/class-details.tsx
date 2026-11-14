"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { useAuthSession } from "@/hooks/use-auth";
import { useClassrooms, useCreateAcademicSection } from "@/hooks/use-school-data";
import { PageHeading } from "@/components/ui/page-heading";
import { Panel } from "@/components/ui/panel";
import { ResourceState } from "@/components/ui/resource-state";
import { isApiMode, schoolService } from "@/services";
import type { AcademicSection, Classroom } from "@/types/school";
import styles from "./school-dashboard.module.css";

export function ClassDetails({ classId }: { classId: string }) {
  const resource = useClassrooms();
  const { session } = useAuthSession();
  const classroom = resource.data?.find((item) => item.id === classId);
  const canManage = isApiMode && Boolean(classroom?.isActive && session?.permissionKeys.includes("academic_structure.manage"));

  return (
    <>
      <PageHeading eyebrow="SCHOOL MANAGEMENT" title={classroom?.name ?? "Class details"} description="View the class and its sections.">
        <Link href="/dashboard/classes">Back to classes</Link>
      </PageHeading>
      <ResourceState isLoading={resource.isLoading} error={resource.error} onRetry={resource.refresh} />
      {resource.data && !classroom && <p role="alert">Class not found in the active school.</p>}
      {classroom && (
        <>
          <div className={styles.classCreateCard}>
            <Panel title="Class details" description={`Code: ${classroom.code} · Sort order: ${classroom.sortOrder}`}>
              {canManage && <ClassEditForm key={classroom.id} classroom={classroom} onSaved={resource.refresh} />}
            </Panel>
          </div>
          <div className={styles.classCreateCard}>
            <Panel title="Sections" description="Sections configured for this class.">
              {classroom.sections.length === 0 && <p>No sections have been added.</p>}
              {classroom.sections.map((section) => (
                <section key={section.id} className={styles.classSection}>
                  <h3>{section.name} ({section.code}){section.isActive ? "" : " · Inactive"}</h3>
                  <p>Capacity: {section.capacity ?? "No limit"}</p>
                  {canManage && section.isActive && <SectionEditForm classId={classId} section={section} onSaved={resource.refresh} />}
                </section>
              ))}
            </Panel>
          </div>
          {canManage && <AddSectionForm classId={classId} onSaved={resource.refresh} />}
        </>
      )}
    </>
  );
}

function ClassEditForm({ classroom, onSaved }: { classroom: Classroom; onSaved: () => void }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setPending(true);
    setError(null);
    setSaved(false);
    try {
      await schoolService.updateClassroom(classroom.id, {
        name: String(form.get("name") ?? "").trim(),
        code: String(form.get("code") ?? "").trim(),
        sortOrder: Number(form.get("sortOrder")),
      });
      setSaved(true);
      onSaved();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to update the class.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form className={styles.createStructureForm} onSubmit={submit}>
      <label>Class name<input name="name" defaultValue={classroom.name} maxLength={80} required /></label>
      <label>Class code<input name="code" defaultValue={classroom.code} maxLength={20} required /></label>
      <label>Sort order<input name="sortOrder" type="number" min="0" step="1" defaultValue={classroom.sortOrder} required /></label>
      <button type="submit" disabled={pending}>{pending ? "Saving…" : "Save class"}</button>
      {error && <p className={styles.structureFormError} role="alert">{error}</p>}
      {saved && <p role="status">Class updated.</p>}
    </form>
  );
}

function SectionEditForm({ classId, section, onSaved }: { classId: string; section: AcademicSection; onSaved: () => void }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const capacity = String(form.get("capacity") ?? "");
    setPending(true);
    setError(null);
    setSaved(false);
    try {
      await schoolService.updateAcademicSection(classId, section.id, {
        name: String(form.get("name") ?? "").trim(),
        code: String(form.get("code") ?? "").trim(),
        capacity: capacity ? Number(capacity) : null,
      });
      setSaved(true);
      onSaved();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to update the section.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form className={styles.createStructureForm} onSubmit={submit} aria-label={`Edit ${section.name}`}>
      <label>Section name<input name="name" defaultValue={section.name} maxLength={40} required /></label>
      <label>Section code<input name="code" defaultValue={section.code} maxLength={20} required /></label>
      <label>Capacity<input name="capacity" type="number" min="1" step="1" defaultValue={section.capacity ?? ""} /></label>
      <button type="submit" disabled={pending}>{pending ? "Saving…" : "Save section"}</button>
      {error && <p className={styles.structureFormError} role="alert">{error}</p>}
      {saved && <p role="status">Section updated.</p>}
    </form>
  );
}

function AddSectionForm({ classId, onSaved }: { classId: string; onSaved: () => void }) {
  const create = useCreateAcademicSection();
  const [saved, setSaved] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const element = event.currentTarget;
    const form = new FormData(element);
    const capacity = String(form.get("capacity") ?? "");
    setSaved(false);
    const section = await create.create({
      classId,
      name: String(form.get("name") ?? "").trim(),
      code: String(form.get("code") ?? "").trim(),
      capacity: capacity ? Number(capacity) : undefined,
    });
    if (section) {
      element.reset();
      setSaved(true);
      onSaved();
    }
  }

  return (
    <Panel title="Add section" description="Section codes must be unique within this class.">
      <form className={styles.createStructureForm} onSubmit={submit}>
        <label>New section name<input name="name" maxLength={40} required /></label>
        <label>New section code<input name="code" maxLength={20} required /></label>
        <label>New section capacity<input name="capacity" type="number" min="1" step="1" /></label>
        <button type="submit" disabled={create.isPending}>{create.isPending ? "Creating…" : "Add section"}</button>
      </form>
      {create.error && <p className={styles.structureFormError} role="alert">{create.error}</p>}
      {saved && <p role="status">Section added.</p>}
    </Panel>
  );
}
