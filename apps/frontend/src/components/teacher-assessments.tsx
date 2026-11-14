"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { PageHeading } from "@/components/ui/page-heading";
import { Panel } from "@/components/ui/panel";
import { ResourceState } from "@/components/ui/resource-state";
import { useAuthSession } from "@/hooks/use-auth";
import { isApiMode } from "@/services";
import {
  useTeacherActions,
  useTeacherAssessments,
  useTeacherDashboard,
  useTeacherSections,
  useTeacherYearSelection,
} from "@/hooks/use-school-data";
import type { TeacherAssessmentType } from "@/types/school";
import styles from "./teacher-workspace.module.css";
import { TeacherAcademicYearSelector } from "./teacher-academic-year-selector";

type AssessmentFilter = "ALL" | TeacherAssessmentType;

const filters: { value: AssessmentFilter; label: string }[] = [
  { value: "ALL", label: "All" },
  { value: "ASSIGNMENT", label: "Assignments" },
  { value: "EXAM", label: "Exams" },
  { value: "TEST", label: "Tests" },
];

export function TeacherAssessmentsView() {
  const { session } = useAuthSession();
  const yearSelection = useTeacherYearSelection();
  const yearId = yearSelection.selectedYearId;
  const dashboard = useTeacherDashboard(yearId || undefined);
  const sections = useTeacherSections(yearId || undefined);
  const assignedSections = sections.data?.sections ?? [];
  const academicYear = yearSelection.selectedYear;
  const [filterSectionId, setFilterSectionId] = useState("");
  const [formSectionId, setFormSectionId] = useState("");
  const [filterType, setFilterType] = useState<AssessmentFilter>("ALL");
  const [type, setType] = useState<TeacherAssessmentType>("ASSIGNMENT");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [durationMinutes, setDurationMinutes] = useState("45");
  const [maxScore, setMaxScore] = useState("100");
  const [passMark, setPassMark] = useState("50");
  const selectedFormSectionId =
    formSectionId || assignedSections[0]?.id || "";
  const dateIsInYear = (value: string) =>
    Boolean(
      academicYear &&
        value >= academicYear.startDate.slice(0, 10) &&
        value <= academicYear.endDate.slice(0, 10),
    );
  const assessmentDueDate =
    (dateIsInYear(dueDate) && dueDate) ||
    (academicYear?.status === "ACTIVE" &&
    dashboard.data?.localDate &&
    dateIsInYear(dashboard.data.localDate)
      ? dashboard.data.localDate
      : "");
  const selectedFormSection = assignedSections.find(
    (section) => section.id === selectedFormSectionId,
  );
  const assessments = useTeacherAssessments(
    yearId || undefined,
    filterSectionId || undefined,
  );
  const actions = useTeacherActions();
  const canManage =
    ( !isApiMode ||
      session?.permissionKeys.includes("teacher.assessments.manage") === true) &&
    academicYear?.status === "ACTIVE";
  const visibleAssessments =
    assessments.data?.filter(
      (assessment) =>
        filterType === "ALL" || assessment.type === filterType,
    ) ?? [];

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canManage || !selectedFormSectionId) return;
    const created = await actions.createAssessment({
      sectionId: selectedFormSectionId,
      academicYearId: yearId,
      type,
      title: title.trim(),
      description: description.trim() || undefined,
      dueDate: assessmentDueDate,
      ...(type === "TEST"
        ? {
            startTime,
            durationMinutes: Number(durationMinutes),
          }
        : {}),
      maxScore: Number(maxScore),
      passMark: Number(passMark),
    });
    if (created) {
      setTitle("");
      setDescription("");
      assessments.refresh();
    }
  }

  async function publish(id: string) {
    if (!canManage) return;
    if (await actions.publishAssessment(id)) assessments.refresh();
  }

  return (
    <div className={styles.page}>
      <PageHeading
        eyebrow="TEACHING / ASSIGNMENTS & EXAMS"
        title="Assignments, exams & tests"
        description="Create classwork and assessments for your assigned sections."
      />
      <ResourceState
        error={yearSelection.years.error ?? sections.error ?? dashboard.error}
        isLoading={
          yearSelection.years.isLoading ||
          sections.isLoading ||
          dashboard.isLoading
        }
        onRetry={() => {
          yearSelection.years.refresh();
          sections.refresh();
          dashboard.refresh();
        }}
      />
      <div className={styles.filters}>
        <TeacherAcademicYearSelector
          years={yearSelection.years.data ?? []}
          selectedYearId={yearId}
          onChange={yearSelection.setSelectedYearId}
          disabled={yearSelection.years.isLoading}
        />
      </div>
      <div className={styles.assessmentLayout}>
        <Panel
          title="Classwork & assessments"
          description="Create work on the right, or manage an existing item."
          className={styles.panel}
        >
          <div className={styles.filterTabs} aria-label="Filter assessments">
            {filters.map((filter) => (
              <button
                type="button"
                key={filter.value}
                className={`${styles.filterTab} ${filterType === filter.value ? styles.filterTabActive : ""}`}
                aria-pressed={filterType === filter.value}
                onClick={() => setFilterType(filter.value)}
              >
                {filter.label}
              </button>
            ))}
          </div>
          <label className={styles.sectionFilter}>
            Filter by section
            <select
              value={filterSectionId}
              onChange={(event) => setFilterSectionId(event.target.value)}
            >
              <option value="">All assigned sections</option>
              {assignedSections.map((section) => (
                <option key={section.id} value={section.id}>
                  {section.className} · {section.name}
                </option>
              ))}
            </select>
          </label>
          <ResourceState
            error={assessments.error}
            isLoading={assessments.isLoading}
            onRetry={assessments.refresh}
          />
          {assessments.data?.length === 0 && !assessments.isLoading && (
            <p className={styles.empty}>
              No assignments, exams, or tests have been created yet.
            </p>
          )}
          {assessments.data && assessments.data.length > 0 && (
            <>
              {visibleAssessments.length === 0 ? (
                <p className={styles.empty}>
                  No{" "}
                  {filterType === "ALL"
                    ? "assignments or exams"
                    : filterType === "EXAM"
                      ? "exams"
                      : filterType === "TEST"
                        ? "tests"
                      : "assignments"}{" "}
                  match this filter.
                </p>
              ) : (
                <ul className={styles.assessmentList}>
                  {visibleAssessments.map((assessment) => (
                    <li
                      className={styles.assessmentItem}
                      key={assessment.id}
                    >
                      <div className={styles.assessmentDetails}>
                        <span className={styles.assessmentType}>
                          {assessment.type === "EXAM"
                            ? "Exam"
                            : assessment.type === "TEST"
                              ? "Test"
                              : "Assignment"}
                        </span>
                        <strong>{assessment.title}</strong>
                        <span>
                          {assessment.type === "EXAM"
                            ? "Exam date"
                            : assessment.type === "TEST"
                              ? "Test date"
                              : "Due"}{" "}
                          {assessment.dueDate}
                          {assessment.startTime &&
                            ` · ${assessment.startTime}`}
                          {assessment.durationMinutes &&
                            ` · ${assessment.durationMinutes} min`}
                          {" · "}{assessment.className}{" "}
                          {assessment.sectionName} · {assessment.maxScore} marks
                        </span>
                        <span>
                          {assessment.resultCount} result
                          {assessment.resultCount === 1 ? "" : "s"} entered
                        </span>
                      </div>
                      <div className={styles.assessmentActions}>
                        <span
                          className={`${styles.status} ${assessment.status === "PUBLISHED" ? styles.published : ""}`}
                        >
                          {assessment.status === "PUBLISHED"
                            ? "Published"
                            : "Draft"}
                        </span>
                        {assessment.status === "DRAFT" ? (
                          canManage ? (
                            <button
                              className={styles.secondaryButton}
                              type="button"
                              onClick={() => void publish(assessment.id)}
                              disabled={actions.isPending}
                            >
                              Publish
                            </button>
                          ) : null
                        ) : (
                          <Link
                            className={styles.textLink}
                            href="/dashboard/teacher/results"
                          >
                            Enter results
                          </Link>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
              <p className={styles.tableFootnote}>
                {visibleAssessments.length} item
                {visibleAssessments.length === 1 ? "" : "s"}
                {filterSectionId ? " · Selected section" : " · All assigned sections"}
              </p>
            </>
          )}
        </Panel>

        <Panel
          title="Create new"
          description="Choose the type of work to set for your class."
          className={styles.panel}
        >
          {!canManage ? (
            <p className={styles.infoNotice}>
              You have read-only access to assignments and exams.
            </p>
          ) : assignedSections.length === 0 && !sections.isLoading ? (
            <p className={styles.empty}>
              No active sections are assigned to your account.
            </p>
          ) : assignedSections.length > 0 ? (
            <form className={styles.createForm} onSubmit={(event) => void create(event)}>
              <div className={styles.typePicker} aria-label="Assessment type">
                {(["ASSIGNMENT", "EXAM", "TEST"] as const).map((value) => (
                  <button
                    type="button"
                    key={value}
                    className={`${styles.typeOption} ${type === value ? styles.typeOptionActive : ""}`}
                    aria-pressed={type === value}
                    onClick={() => setType(value)}
                  >
                    {value === "EXAM"
                      ? "Exam"
                      : value === "TEST"
                        ? "Test"
                        : "Assignment"}
                  </button>
                ))}
              </div>
              <div className={styles.formGrid}>
                <label>
                  Class and section
                  <select
                    value={selectedFormSectionId}
                    onChange={(event) => setFormSectionId(event.target.value)}
                    required
                  >
                    {assignedSections.map((section) => (
                      <option key={section.id} value={section.id}>
                        {section.className} · {section.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Subject
                  <input
                    value={selectedFormSection?.subject ?? "Not specified"}
                    readOnly
                  />
                </label>
                <label className={styles.fullWidth}>
                  {type === "EXAM"
                    ? "Exam title"
                    : type === "TEST"
                      ? "Test title"
                      : "Assignment title"}
                  <input
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    maxLength={150}
                    required
                  />
                </label>
                <label>
                  {type === "TEST"
                    ? "Test date"
                    : type === "EXAM"
                      ? "Exam date"
                      : "Due date"}
                  <input
                    type="date"
                    value={assessmentDueDate}
                    min={dashboard.data?.localDate}
                    onChange={(event) => setDueDate(event.target.value)}
                    required
                  />
                </label>
                {type === "TEST" && (
                  <>
                    <label>
                      Start time
                      <input
                        type="time"
                        value={startTime}
                        onChange={(event) => setStartTime(event.target.value)}
                        required
                      />
                    </label>
                    <label>
                      Duration (minutes)
                      <input
                        type="number"
                        min={1}
                        max={1440}
                        step={1}
                        value={durationMinutes}
                        onChange={(event) =>
                          setDurationMinutes(event.target.value)
                        }
                        required
                      />
                    </label>
                  </>
                )}
                <label>
                  Maximum marks
                  <input
                    type="number"
                    min={1}
                    step={1}
                    value={maxScore}
                    onChange={(event) => setMaxScore(event.target.value)}
                    required
                  />
                </label>
                <label>
                  Pass mark
                  <input
                    type="number"
                    min={0}
                    max={maxScore || undefined}
                    step={1}
                    value={passMark}
                    onChange={(event) => setPassMark(event.target.value)}
                    required
                  />
                </label>
                <label className={styles.fullWidth}>
                  Instructions (optional)
                  <textarea
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                    maxLength={5000}
                  />
                </label>
              </div>
              {actions.error && (
                <p className={styles.error} role="alert">
                  {actions.error}
                </p>
              )}
              <div className={styles.formActions}>
                <button
                  className={styles.primaryButton}
                  type="submit"
                  disabled={actions.isPending || !selectedFormSectionId}
                >
                  {actions.isPending ? "Saving..." : "Save draft"}
                </button>
              </div>
            </form>
          ) : null}
        </Panel>
      </div>
    </div>
  );
}
