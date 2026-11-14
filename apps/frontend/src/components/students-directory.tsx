"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuthSession } from "@/hooks/use-auth";
import { useAcademicYears, useClassrooms, useStudentDirectory } from "@/hooks/use-school-data";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { PageHeading } from "@/components/ui/page-heading";
import { Panel } from "@/components/ui/panel";
import { ResourceState } from "@/components/ui/resource-state";
import { StatusBadge } from "@/components/ui/status-badge";
import type { AuthSession } from "@/types/auth";
import type { Student, StudentDirectorySearch } from "@/types/school";
import styles from "./students-directory.module.css";

export function ApiStudentsDirectory() {
  const { session, isLoading, error, refresh } = useAuthSession();
  if (isLoading || error) {
    return <ResourceState isLoading={isLoading} error={error} onRetry={refresh} />;
  }
  if (!session?.activeSchool) {
    return <p role="alert">Select a school to view its students.</p>;
  }
  return <SchoolStudentsDirectory key={session.activeSchool.id} session={session} />;
}

function SchoolStudentsDirectory({ session }: { session: AuthSession }) {
  const [queryInput, setQueryInput] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [academicYearId, setAcademicYearId] = useState("");
  const [classId, setClassId] = useState("");
  const [sectionId, setSectionId] = useState("");
  const [status, setStatus] = useState<"" | "ACTIVE" | "INACTIVE">("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const canReadStructure = session.permissionKeys.includes("academic_structure.read");
  const canCreate = session.permissionKeys.includes("students.create") && canReadStructure;
  const years = useAcademicYears(canReadStructure);
  const classes = useClassrooms(canReadStructure);
  const waitingForSearch = queryInput.trim() !== query;
  const search: StudentDirectorySearch = {
    page,
    pageSize: 20,
    query: query || undefined,
    academicYearId: academicYearId || undefined,
    classId: classId || undefined,
    sectionId: sectionId || undefined,
    status: status || undefined,
  };
  const students = useStudentDirectory(search, !waitingForSearch);
  const selected = students.data?.data.find((student) => student.id === selectedId);
  const selectedClass = classes.data?.find((item) => item.id === classId);

  useEffect(() => {
    const timer = window.setTimeout(() => setQuery(queryInput.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [queryInput]);

  function resetResults() {
    setPage(1);
    setSelectedId(null);
  }

  function clearFilters() {
    setQueryInput("");
    setQuery("");
    setAcademicYearId("");
    setClassId("");
    setSectionId("");
    setStatus("");
    resetResults();
  }

  const columns: DataTableColumn<Student>[] = [
    {
      heading: "STUDENT",
      render: (student) => (
        <button
          className={styles.selectStudent}
          type="button"
          aria-pressed={selectedId === student.id}
          onClick={() => setSelectedId(student.id)}
        >
          <strong>{student.name}</strong><small>{student.studentNumber}</small>
        </button>
      ),
    },
    { heading: "CLASS & SECTION", render: (student) => [student.className, student.sectionName].filter(Boolean).join(" · ") || "—" },
    { heading: "ACADEMIC YEAR", render: (student) => student.academicYearName ?? "—" },
    { heading: "STATUS", render: (student) => <StatusBadge>{student.status}</StatusBadge> },
  ];

  return (
    <>
      <PageHeading eyebrow="SCHOOL MANAGEMENT" title="Students" description="Search and browse the active school's student directory.">
        {canCreate && <Link className={styles.primaryButton} href="/dashboard/students/new">+ Add student</Link>}
      </PageHeading>
      <section className={styles.filters} aria-label="Student filters">
        <label>Search
          <input type="search" value={queryInput} maxLength={100} placeholder="Name or admission ID" onChange={(event) => { setQueryInput(event.target.value); resetResults(); }} />
        </label>
        {canReadStructure && (
          <>
            <label>Academic year
              <select value={academicYearId} disabled={!years.data} onChange={(event) => { setAcademicYearId(event.target.value); resetResults(); }}>
                <option value="">All years</option>
                {years.data?.map((year) => <option key={year.id} value={year.id}>{year.name}</option>)}
              </select>
            </label>
            <label>Class
              <select value={classId} disabled={!classes.data} onChange={(event) => { setClassId(event.target.value); setSectionId(""); resetResults(); }}>
                <option value="">All classes</option>
                {classes.data?.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
              </select>
            </label>
            <label>Section
              <select value={sectionId} disabled={!selectedClass} onChange={(event) => { setSectionId(event.target.value); resetResults(); }}>
                <option value="">All sections</option>
                {selectedClass?.sections.map((section) => <option key={section.id} value={section.id}>{section.name}</option>)}
              </select>
            </label>
          </>
        )}
        <label>Status
          <select value={status} onChange={(event) => { const value = event.target.value; setStatus(value === "ACTIVE" || value === "INACTIVE" ? value : ""); resetResults(); }}>
            <option value="">All statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
          </select>
        </label>
        <button type="button" onClick={clearFilters}>Clear filters</button>
      </section>
      {canReadStructure && (
        <>
          <ResourceState isLoading={years.isLoading} error={years.error} onRetry={years.refresh} />
          <ResourceState isLoading={classes.isLoading} error={classes.error} onRetry={classes.refresh} />
        </>
      )}
      <div className={styles.layout}>
        <div className={styles.list}>
          <DataTable
            title="Student directory"
            description={students.data ? `${students.data.meta.total} students` : "Search by name or admission ID."}
            rows={students.data?.data ?? null}
            columns={columns}
            isLoading={waitingForSearch || students.isLoading}
            error={students.error}
            onRetry={students.refresh}
            searchText={() => ""}
            searchEnabled={false}
          />
          {students.data && students.data.meta.totalPages > 0 && (
            <nav className={styles.pagination} aria-label="Student pages">
              <span>Page {students.data.meta.page} of {students.data.meta.totalPages}</span>
              <div>
                <button type="button" disabled={page <= 1} onClick={() => { setPage(page - 1); setSelectedId(null); }}>Previous</button>
                <button type="button" disabled={page >= students.data.meta.totalPages} onClick={() => { setPage(page + 1); setSelectedId(null); }}>Next</button>
              </div>
            </nav>
          )}
        </div>
        <aside aria-label="Student preview">
          <Panel title="Student preview" description={selected ? "Selected student" : "Select a student to preview their details."}>
            {selected && (
              <div className={styles.preview}>
                <h3>{selected.name}</h3>
                <dl>
                  <dt>Admission ID</dt><dd>{selected.studentNumber}</dd>
                  <dt>Status</dt><dd>{selected.status}</dd>
                  <dt>Academic year</dt><dd>{selected.academicYearName ?? "—"}</dd>
                  <dt>Class and section</dt><dd>{[selected.className, selected.sectionName].filter(Boolean).join(" · ") || "—"}</dd>
                </dl>
                <p>Placement is shown only when one matching active placement exists.</p>
                <Link className={styles.primaryButton} href={`/dashboard/students/${selected.id}`}>View profile</Link>
              </div>
            )}
          </Panel>
        </aside>
      </div>
    </>
  );
}
