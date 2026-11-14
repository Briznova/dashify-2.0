"use client";

import type { TeacherAcademicYear } from "@/types/school";
import styles from "./teacher-academic-year-selector.module.css";

export function TeacherAcademicYearSelector({
  years,
  selectedYearId,
  onChange,
  disabled = false,
}: {
  years: TeacherAcademicYear[];
  selectedYearId: string;
  onChange: (yearId: string) => void;
  disabled?: boolean;
}) {
  return (
    <label className={styles.selector}>
      <span>Academic year</span>
      <select
        aria-label="Academic year"
        value={selectedYearId}
        disabled={disabled || years.length === 0}
        onChange={(event) => onChange(event.target.value)}
      >
        {years.length === 0 ? (
          <option value="">No academic years configured</option>
        ) : (
          years.map((year) => (
            <option key={year.id} value={year.id}>
              {year.name}
              {year.status === "ACTIVE"
                ? " · Current"
                : ` · ${year.status.toLowerCase()} (read-only)`}
            </option>
          ))
        )}
      </select>
    </label>
  );
}
