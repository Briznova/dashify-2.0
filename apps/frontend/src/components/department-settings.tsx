"use client";

import { useState, type FormEvent } from "react";
import { Panel } from "@/components/ui/panel";
import { ResourceState } from "@/components/ui/resource-state";
import { useDepartments } from "@/hooks/use-school-data";
import { schoolService } from "@/services";
import styles from "./school-dashboard.module.css";

export function DepartmentSettings({ schoolId }: { schoolId: string }) {
  const departments = useDepartments(schoolId);
  const [name, setName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setPending(true);
    setError(null);
    try {
      if (editingId) await schoolService.updateDepartment(editingId, { name: name.trim() });
      else await schoolService.createDepartment(name.trim());
      setName("");
      setEditingId(null);
      departments.refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to save the department.");
    } finally {
      setPending(false);
    }
  }

  async function deactivate(id: string) {
    if (pending || !window.confirm("Deactivate this department? Existing staff keep their department.")) return;
    setPending(true);
    setError(null);
    try {
      await schoolService.updateDepartment(id, { isActive: false });
      if (editingId === id) { setEditingId(null); setName(""); }
      departments.refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to deactivate the department.");
    } finally {
      setPending(false);
    }
  }

  return (
    <Panel title="Staff departments" description="Manage departments for teachers in this school.">
      <ResourceState isLoading={departments.isLoading} error={departments.error} onRetry={departments.refresh} />
      {departments.data && (
        <>
          <form className={styles.createStructureForm} onSubmit={save}>
            <label>Department name<input value={name} onChange={(event) => setName(event.target.value)} maxLength={80} required /></label>
            <button type="submit" disabled={pending}>{pending ? "Saving…" : editingId ? "Save department" : "Add department"}</button>
            {editingId && <button type="button" onClick={() => { setEditingId(null); setName(""); }}>Cancel</button>}
          </form>
          {departments.data.length === 0 && <p>No departments have been added.</p>}
          <ul>
            {departments.data.map((department) => (
              <li key={department.id}>
                {department.name}{!department.isActive && " (inactive)"}
                {department.isActive && <>
                  {" "}<button type="button" disabled={pending} onClick={() => { setEditingId(department.id); setName(department.name); }}>Rename</button>
                  {" "}<button type="button" disabled={pending} onClick={() => void deactivate(department.id)}>Deactivate</button>
                </>}
              </li>
            ))}
          </ul>
        </>
      )}
      {error && <p className={styles.structureFormError} role="alert">{error}</p>}
    </Panel>
  );
}
