"use client";

import { useState, type FormEvent } from "react";
import { PageHeading } from "@/components/ui/page-heading";
import { Panel } from "@/components/ui/panel";
import { ResourceState } from "@/components/ui/resource-state";
import { useAuthSession } from "@/hooks/use-auth";
import { isApiMode } from "@/services";
import {
  useTeacherActions,
  useTeacherAssessments,
  useTeacherResults,
  useTeacherYearSelection,
} from "@/hooks/use-school-data";
import styles from "./teacher-workspace.module.css";
import { TeacherAcademicYearSelector } from "./teacher-academic-year-selector";

export function TeacherResultsView() {
  const { session } = useAuthSession();
  const yearSelection = useTeacherYearSelection();
  const yearId = yearSelection.selectedYearId;
  const assessments = useTeacherAssessments(yearId || undefined);
  const [selectedAssessmentId, setSelectedAssessmentId] = useState("");
  const [search, setSearch] = useState("");
  const [scoreEdits, setScoreEdits] = useState<
    Record<string, Record<string, string>>
  >({});
  const [feedbackEdits, setFeedbackEdits] = useState<
    Record<string, Record<string, string>>
  >({});
  const [validationError, setValidationError] = useState<string | null>(null);
  const publishedAssessments =
    assessments.data?.filter((item) => item.status === "PUBLISHED") ?? [];
  const assessmentId = publishedAssessments.some(
    (item) => item.id === selectedAssessmentId,
  )
    ? selectedAssessmentId
    : publishedAssessments[0]?.id ?? "";
  const scores = scoreEdits[assessmentId] ?? {};
  const feedbackValues = feedbackEdits[assessmentId] ?? {};
  const results = useTeacherResults(assessmentId);
  const actions = useTeacherActions();
  const canWrite =
    (!isApiMode ||
      session?.permissionKeys.includes("teacher.results.write") === true) &&
    yearSelection.selectedYear?.status === "ACTIVE";
  const scoreFor = (studentId: string, score: number | null) =>
    scores[studentId] ?? (score === null ? "" : String(score));
  const feedbackFor = (studentId: string, feedback: string | null) =>
    feedbackValues[studentId] ?? feedback ?? "";
  const filteredStudents =
    results.data?.students.filter((student) => {
      const query = search.trim().toLocaleLowerCase();
      return (
        !query ||
        student.name.toLocaleLowerCase().includes(query) ||
        (student.rollNumber ?? "").toLocaleLowerCase().includes(query)
      );
    }) ?? [];
  const enteredCount =
    results.data?.students.filter(
      (student) => scoreFor(student.studentId, student.score).trim() !== "",
    ).length ?? 0;
  const remainingCount =
    (results.data?.students.length ?? 0) - enteredCount;

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canWrite || !results.data) return;
    const records: { studentId: string; score: number }[] = [];
    for (const student of results.data.students) {
      const value = scoreFor(student.studentId, student.score).trim();
      if (!value) continue;
      const score = Number(value);
      if (
        !Number.isSafeInteger(score) ||
        score < 0 ||
        score > results.data.assessment.maxScore
      ) {
        setValidationError(
          `Scores must be whole numbers from 0 to ${results.data.assessment.maxScore}.`,
        );
        return;
      }
      const feedback = feedbackFor(student.studentId, student.feedback).trim();
      records.push({
        studentId: student.studentId,
        score,
        ...(feedback ? { feedback } : {}),
      });
    }
    if (records.length === 0) {
      setValidationError("Enter at least one score before saving.");
      return;
    }
    setValidationError(null);
    if (await actions.saveResults(assessmentId, { records })) {
      setScoreEdits((current) => {
        const next = { ...current };
        delete next[assessmentId];
        return next;
      });
      setFeedbackEdits((current) => {
        const next = { ...current };
        delete next[assessmentId];
        return next;
      });
      results.refresh();
    }
  }

  async function publishResults() {
    if (!canWrite || enteredCount === 0) return;
    if (await actions.publishResults(assessmentId)) results.refresh();
  }

  return (
    <div className={styles.page}>
      <PageHeading
        eyebrow="TEACHING / RESULTS"
        title="Results"
        description="Enter or update scores for your published assignments and exams."
      />
      <Panel
        title="Enter student scores"
        description="Publish a partial gradebook when ready. Results remain editable for the active academic year."
        className={styles.panel}
      >
        <div className={styles.filters}>
          <TeacherAcademicYearSelector
            years={yearSelection.years.data ?? []}
            selectedYearId={yearId}
            onChange={yearSelection.setSelectedYearId}
            disabled={yearSelection.years.isLoading}
          />
        </div>
        <ResourceState
          error={yearSelection.years.error ?? assessments.error}
          isLoading={yearSelection.years.isLoading || assessments.isLoading}
          onRetry={() => {
            yearSelection.years.refresh();
            assessments.refresh();
          }}
        />
        {yearSelection.selectedYear?.status !== "ACTIVE" && (
          <p className={styles.infoNotice}>
            Historical academic years are read-only.
          </p>
        )}
        {assessments.data && publishedAssessments.length === 0 && (
          <p className={styles.empty}>
            Publish an assignment or exam before entering results.
          </p>
        )}
        {publishedAssessments.length > 0 && (
          <>
            <label className={styles.assessmentSelect}>
              Published assessment
              <select
                value={assessmentId}
                onChange={(event) =>
                  setSelectedAssessmentId(event.target.value)
                }
              >
                {publishedAssessments.map((assessment) => (
                  <option key={assessment.id} value={assessment.id}>
                    {assessment.title} · {assessment.className}{" "}
                    {assessment.sectionName}
                  </option>
                ))}
              </select>
            </label>
            <ResourceState
              error={results.error}
              isLoading={results.isLoading}
              onRetry={results.refresh}
            />
            {results.data && (
              <>
                <div className={styles.resultsMeta}>
                  <span>
                    {results.data.assessment.className} ·{" "}
                    {results.data.assessment.sectionName} ·{" "}
                    {results.data.assessment.dueDate} · Maximum{" "}
                    {results.data.assessment.maxScore} · Pass mark{" "}
                    {results.data.assessment.passMark ?? "not configured"}
                  </span>
                  <span className={styles.pendingCount}>
                    {remainingCount} remaining
                  </span>
                </div>
                <p className={styles.infoNotice}>
                  {results.data.assessment.resultsStatus === "PUBLISHED"
                    ? `Results published${results.data.assessment.resultsPublishedAt ? ` on ${new Date(results.data.assessment.resultsPublishedAt).toLocaleDateString()}` : ""}. You can continue to edit scores.`
                    : "Results are a draft and are not visible to students or families."}
                  {!results.data.assessment.gradesConfigured &&
                    " Grade labels are unavailable until the School Admin configures this year's scale."}
                </p>
                {results.data.students.length === 0 ? (
                  <p className={styles.empty}>
                    No active students were enrolled on the assessment date.
                  </p>
                ) : (
                  <form
                    className={styles.scoreForm}
                    onSubmit={(event) => void save(event)}
                  >
                    <div className={styles.tableTools}>
                      <label className={styles.searchField}>
                        <span className={styles.visuallyHidden}>
                          Search students by name or roll number
                        </span>
                        <input
                          type="search"
                          placeholder="Search by name or roll number..."
                          value={search}
                          onChange={(event) => setSearch(event.target.value)}
                        />
                      </label>
                      <span className={styles.entrySummary}>
                        {enteredCount} / {results.data.students.length} scores
                        entered
                      </span>
                    </div>
                    <div className={`${styles.resultsRow} ${styles.tableHeader}`} aria-hidden="true">
                      <span>Roll</span>
                      <span>Student</span>
                      <span>
                        Score / {results.data.assessment.maxScore}
                      </span>
                      <span>Feedback</span>
                      <span>Grade / status</span>
                    </div>
                    <ul className={styles.roster}>
                      {filteredStudents.map((student) => {
                        const score = scoreFor(student.studentId, student.score);
                        return (
                          <li
                            className={styles.resultsRow}
                            key={student.studentId}
                          >
                            <span className={styles.rollNumber}>
                              {student.rollNumber ?? "—"}
                            </span>
                            <span className={styles.studentName}>
                              {student.name}
                            </span>
                            <label className={styles.scoreCell}>
                              <span className={styles.visuallyHidden}>
                                Score for {student.name}
                              </span>
                              <input
                                type="number"
                                min={0}
                                max={results.data?.assessment.maxScore}
                                step={1}
                                disabled={!canWrite}
                                value={score}
                                onChange={(event) => {
                                  setValidationError(null);
                                  setScoreEdits((current) => ({
                                    ...current,
                                    [assessmentId]: {
                                      ...current[assessmentId],
                                      [student.studentId]: event.target.value,
                                    },
                                  }));
                                }}
                                aria-label={`Score for ${student.name}`}
                              />
                            </label>
                            <label className={styles.feedbackCell}>
                              <span className={styles.visuallyHidden}>
                                Feedback for {student.name}
                              </span>
                              <textarea
                                maxLength={2000}
                                rows={1}
                                value={feedbackFor(
                                  student.studentId,
                                  student.feedback,
                                )}
                                disabled={!canWrite || !score.trim()}
                                aria-label={`Feedback for ${student.name}`}
                                onChange={(event) =>
                                  setFeedbackEdits((current) => ({
                                    ...current,
                                    [assessmentId]: {
                                      ...current[assessmentId],
                                      [student.studentId]: event.target.value,
                                    },
                                  }))
                                }
                              />
                            </label>
                            <span
                              className={`${styles.entryStatus} ${score.trim() ? styles.entered : styles.notEntered}`}
                            >
                              {score.trim()
                                ? [
                                    student.grade,
                                    student.passed === null
                                      ? "Entered"
                                      : student.passed
                                        ? "Passed"
                                        : "Below pass",
                                  ]
                                    .filter(Boolean)
                                    .join(" · ")
                                : "Not entered"}
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                    {filteredStudents.length === 0 && (
                      <p className={styles.empty}>
                        No students match your search.
                      </p>
                    )}
                    <p className={styles.tableFootnote}>
                      Showing {filteredStudents.length} of{" "}
                      {results.data.students.length} students
                    </p>
                    {validationError && (
                      <p className={styles.error} role="alert">
                        {validationError}
                      </p>
                    )}
                    {actions.error && (
                      <p className={styles.error} role="alert">
                        {actions.error}
                      </p>
                    )}
                    {canWrite ? (
                      <div className={styles.formActions}>
                        <button
                          className={styles.primaryButton}
                          type="submit"
                          disabled={actions.isPending}
                        >
                          {actions.isPending ? "Saving..." : "Save draft"}
                        </button>
                        {results.data.assessment.resultsStatus === "DRAFT" && (
                          <button
                            className={styles.secondaryButton}
                            type="button"
                            onClick={() => void publishResults()}
                            disabled={actions.isPending || enteredCount === 0}
                          >
                            Publish partial results
                          </button>
                        )}
                        <span className={styles.muted}>
                          Leave a score blank to skip that student.
                        </span>
                      </div>
                    ) : (
                      <p className={styles.infoNotice}>
                        You have read-only access to these results.
                      </p>
                    )}
                  </form>
                )}
              </>
            )}
          </>
        )}
      </Panel>
    </div>
  );
}
