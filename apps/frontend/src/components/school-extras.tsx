"use client";

import {
  useAcademicYears,
  useAssignments,
  useCreateAcademicYear,
  useFees,
  usePortalOverview,
  useGradeScale,
  useTeacherActions,
} from "@/hooks/use-school-data";
import { useAuthSession } from "@/hooks/use-auth";
import type {
  AcademicYear,
  Assignment,
  FeeRecord,
  PortalAction,
  PortalRole,
  TeacherGradeBand,
} from "@/types/school";
import { isApiMode } from "@/services";
import { useState, type FormEvent } from "react";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { MetricCard } from "@/components/ui/metric-card";
import { PageHeading } from "@/components/ui/page-heading";
import { Panel } from "@/components/ui/panel";
import { ResourceState } from "@/components/ui/resource-state";
import { StatusBadge } from "@/components/ui/status-badge";
import styles from "./school-extras.module.css";

const portalDescriptions: Record<PortalRole, string> = {
  teacher: "A focused view of your schedule, class registers, and student work.",
  accountant: "Track fee collection, reconcile payments, and follow up on balances.",
  parent: "Stay connected to your child’s classes, progress, and school updates.",
  student: "See what’s next in your day and keep your learning on track.",
};

function ActionList({ items }: { items: PortalAction[] }) {
  return (
    <div className={styles.actionList}>
      {items.map((item) => (
        <article className={styles.actionItem} key={item.id}>
          <div className={styles.actionBody}>
            <strong>{item.title}</strong>
            <p>{item.description}</p>
            <span>{item.meta}</span>
          </div>
          <StatusBadge>{item.status}</StatusBadge>
        </article>
      ))}
    </div>
  );
}

export function PortalDashboard({ role }: { role: PortalRole }) {
  const resource = usePortalOverview(role);
  const data = resource.data;

  return (
    <>
      <PageHeading
        eyebrow={`${data?.schoolName ?? "NORTHSTAR ACADEMY"} · ${role.toUpperCase()} PORTAL`}
        title={data?.greeting ?? "Your school workspace"}
        description={portalDescriptions[role]}
      />
      <ResourceState
        error={resource.error}
        isLoading={resource.isLoading}
        onRetry={resource.refresh}
      />
      {data && (
        <>
          <section className={styles.metrics} aria-label={`${role} summary`}>
            {data.metrics.map((metric) => (
              <MetricCard
                key={metric.label}
                label={metric.label}
                value={metric.value}
                detail={metric.change}
                icon={metric.icon}
                tone={metric.tone}
                trend={metric.positive ? "positive" : "negative"}
              />
            ))}
          </section>
          <div className={styles.portalGrid}>
            <Panel title={data.primaryTitle} description={data.primaryDescription}>
              <ActionList items={data.primaryItems} />
            </Panel>
            <Panel title={data.secondaryTitle} description="Stay on top of important updates.">
              <ActionList items={data.secondaryItems} />
            </Panel>
          </div>
          <div className={styles.portalHint}>
            <span aria-hidden="true">✦</span>
            <p>
              <strong>One school, one shared workspace.</strong> Your portal keeps
              the information most useful to you together in one place.
            </p>
          </div>
        </>
      )}
    </>
  );
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function FeesDirectory() {
  const resource = useFees();
  const fees = resource.data ?? [];
  const paidTotal = fees
    .filter((fee) => fee.status === "Paid")
    .reduce((sum, fee) => sum + fee.amount, 0);
  const outstandingTotal = fees
    .filter((fee) => fee.status !== "Paid")
    .reduce((sum, fee) => sum + fee.amount, 0);
  const columns: DataTableColumn<FeeRecord>[] = [
    {
      heading: "STUDENT",
      render: (row) => (
        <span className={styles.personCell}>
          <strong>{row.studentName}</strong>
          <small>{row.studentNumber} · {row.grade}</small>
        </span>
      ),
    },
    { heading: "INVOICE", render: (row) => row.invoiceNumber },
    { heading: "DUE DATE", render: (row) => row.dueDate },
    { heading: "AMOUNT", render: (row) => <strong className={styles.amount}>{formatCurrency(row.amount)}</strong> },
    { heading: "STATUS", render: (row) => <StatusBadge>{row.status}</StatusBadge> },
  ];

  return (
    <>
      <PageHeading
        eyebrow="SCHOOL FINANCE"
        title="Fees & payments"
        description="Review fee collection, outstanding balances, and recent payments."
      />
      <ResourceState error={resource.error} isLoading={resource.isLoading} onRetry={resource.refresh} />
      {resource.data && (
        <>
          <section className={styles.metrics} aria-label="Fee collection summary">
            <MetricCard label="Collected" value={formatCurrency(paidTotal)} detail="Paid invoices in this view" icon="wallet" tone="green" />
            <MetricCard label="Outstanding" value={formatCurrency(outstandingTotal)} detail="Pending and overdue" icon="clock" tone="orange" />
            <MetricCard label="Paid invoices" value={String(fees.filter((fee) => fee.status === "Paid").length)} detail="Receipt available" icon="check" tone="blue" />
            <MetricCard label="Needs follow-up" value={String(fees.filter((fee) => fee.status === "Overdue").length)} detail="Overdue invoices" icon="alert" tone="violet" />
          </section>
          <DataTable
            title="Recent invoices"
            description="A clear view of family balances and payment status."
            rows={resource.data}
            columns={columns}
            isLoading={resource.isLoading}
            error={resource.error}
            onRetry={resource.refresh}
            searchText={(row) => `${row.studentName} ${row.studentNumber} ${row.grade} ${row.invoiceNumber} ${row.status}`}
          />
        </>
      )}
    </>
  );
}

function MockAcademicsDirectory() {
  const resource = useAssignments();
  const assignments = resource.data ?? [];
  const columns: DataTableColumn<Assignment>[] = [
    {
      heading: "ASSIGNMENT",
      render: (row) => (
        <span className={styles.personCell}>
          <strong>{row.title}</strong>
          <small>{row.subject}</small>
        </span>
      ),
    },
    { heading: "CLASS", render: (row) => row.className },
    { heading: "DUE DATE", render: (row) => row.dueDate },
    { heading: "SUBMISSIONS", render: (row) => row.submissions },
    { heading: "STATUS", render: (row) => <StatusBadge>{row.status}</StatusBadge> },
  ];

  return (
    <>
      <PageHeading
        eyebrow="TEACHING & LEARNING"
        title="Academics & assignments"
        description="Publish classwork, track submissions, and celebrate student progress."
      />
      <ResourceState error={resource.error} isLoading={resource.isLoading} onRetry={resource.refresh} />
      {resource.data && (
        <>
          <section className={styles.metrics} aria-label="Academic activity summary">
            <MetricCard label="Assignments" value={String(assignments.length)} detail="Across active classes" icon="file" tone="blue" />
            <MetricCard label="Awaiting review" value="18" detail="Student submissions" icon="clock" tone="orange" />
            <MetricCard label="Published" value={String(assignments.filter((item) => item.status === "Published" || item.status === "Due soon").length)} detail="Visible to students" icon="check" tone="green" />
            <MetricCard label="Classes" value="3" detail="With active coursework" icon="book" tone="violet" />
          </section>
          <DataTable
            title="Class assignments"
            description="Manage due dates and see how students are progressing."
            rows={resource.data}
            columns={columns}
            isLoading={resource.isLoading}
            error={resource.error}
            onRetry={resource.refresh}
            searchText={(row) => `${row.title} ${row.subject} ${row.className} ${row.status}`}
          />
        </>
      )}
    </>
  );
}

function ApiAcademicYears() {
  const resource = useAcademicYears();
  const { session } = useAuthSession();
  const { create, isPending, error } = useCreateAcademicYear();
  const gradeScaleActions = useTeacherActions();
  const [name, setName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [scaleYearId, setScaleYearId] = useState("");
  const [bandsByYear, setBandsByYear] = useState<
    Record<string, TeacherGradeBand[]>
  >({});
  const canCreate = Boolean(session?.permissionKeys.includes("academic_structure.manage"));
  const activeScaleYearId =
    scaleYearId ||
    resource.data?.find((year) => year.status === "ACTIVE")?.id ||
    "";
  const gradeScale = useGradeScale(activeScaleYearId);
  const bands =
    bandsByYear[activeScaleYearId] ??
    gradeScale.data?.bands.map((band) => ({ ...band })) ??
    [];

  function updateBands(
    update: (current: TeacherGradeBand[]) => TeacherGradeBand[],
  ) {
    if (!activeScaleYearId) return;
    setBandsByYear((current) => ({
      ...current,
      [activeScaleYearId]: update(
        current[activeScaleYearId] ??
          gradeScale.data?.bands.map((band) => ({ ...band })) ??
          [],
      ),
    }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const year = await create({ name: name.trim(), startDate, endDate });
    if (year) {
      setName("");
      setStartDate("");
      setEndDate("");
      resource.refresh();
    }
  }

  function addGradeBand() {
    updateBands((current) => {
      if (current.length === 0) {
        return [{ label: "", minPercent: 0, maxPercent: 100 }];
      }
      const last = current.at(-1);
      if (!last || last.maxPercent <= last.minPercent) return current;
      const split = Math.floor((last.minPercent + last.maxPercent) / 2);
      return [
        ...current.slice(0, -1),
        { ...last, maxPercent: split },
        { label: "", minPercent: split + 1, maxPercent: last.maxPercent },
      ];
    });
  }

  async function saveScale(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!activeScaleYearId || !canCreate) return;
    const saved = await gradeScaleActions.saveGradeScale(
      activeScaleYearId,
      bands,
    );
    if (saved) gradeScale.refresh();
  }

  const columns: DataTableColumn<AcademicYear>[] = [
    { heading: "ACADEMIC YEAR", render: (row) => <strong>{row.name}</strong> },
    { heading: "START DATE", render: (row) => row.startDate.slice(0, 10) },
    { heading: "END DATE", render: (row) => row.endDate.slice(0, 10) },
    { heading: "STATUS", render: (row) => <StatusBadge>{row.status}</StatusBadge> },
  ];

  return (
    <>
      <PageHeading eyebrow="SCHOOL ACADEMICS" title="Academic years" description="Review school years and add future academic periods." />
      {canCreate && (
        <Panel title="Create academic year" description="The year name and calendar dates must be unique and valid for this school.">
          <form className={styles.createYearForm} onSubmit={handleSubmit}>
            <label>Year name<input value={name} onChange={(event) => setName(event.target.value)} required maxLength={100} /></label>
            <label>Start date<input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} required /></label>
            <label>End date<input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} min={startDate || undefined} required /></label>
            <button type="submit" disabled={isPending}>{isPending ? "Creating..." : "Create year"}</button>
          </form>
          {error && <p role="alert">{error}</p>}
        </Panel>
      )}
      {!canCreate && <p className={styles.portalHint}>You have read-only access to academic years.</p>}
      <Panel
        title="Grading scale"
        description="Configure percentage bands for an academic year. Bands must cover 0-100 without gaps or overlaps."
      >
        {resource.data && resource.data.length > 0 && (
          <label className={styles.gradeScaleYear}>
            Academic year
            <select
              value={activeScaleYearId}
              onChange={(event) => setScaleYearId(event.target.value)}
            >
              {resource.data.map((year) => (
                <option key={year.id} value={year.id}>
                  {year.name} · {year.status}
                </option>
              ))}
            </select>
          </label>
        )}
        {!resource.data?.length && !resource.isLoading && (
          <p className={styles.emptyState}>
            Create an academic year before setting its grade scale.
          </p>
        )}
        {activeScaleYearId && (
          <>
            <ResourceState
              error={gradeScale.error}
              isLoading={gradeScale.isLoading}
              onRetry={gradeScale.refresh}
            />
            {gradeScale.data && (
              <>
                {gradeScale.data.bands.length === 0 && (
                  <p className={styles.emptyState}>
                    No grading scale is configured for this year.
                  </p>
                )}
                <form className={styles.gradeScaleForm} onSubmit={saveScale}>
                  <div className={styles.gradeScaleRows}>
                    {bands.map((band, index) => (
                      <div className={styles.gradeBandRow} key={band.id ?? index}>
                        <label>
                          Grade label
                          <input
                            value={band.label}
                            maxLength={20}
                            disabled={!canCreate}
                            onChange={(event) =>
                              updateBands((current) =>
                                current.map((item, itemIndex) =>
                                  itemIndex === index
                                    ? { ...item, label: event.target.value }
                                    : item,
                                ),
                              )
                            }
                            required
                          />
                        </label>
                        <label>
                          Minimum %
                          <input
                            type="number"
                            min={0}
                            max={100}
                            value={band.minPercent}
                            disabled={!canCreate}
                            onChange={(event) =>
                              updateBands((current) =>
                                current.map((item, itemIndex) =>
                                  itemIndex === index
                                    ? { ...item, minPercent: Number(event.target.value) }
                                    : item,
                                ),
                              )
                            }
                            required
                          />
                        </label>
                        <label>
                          Maximum %
                          <input
                            type="number"
                            min={0}
                            max={100}
                            value={band.maxPercent}
                            disabled={!canCreate}
                            onChange={(event) =>
                              updateBands((current) =>
                                current.map((item, itemIndex) =>
                                  itemIndex === index
                                    ? { ...item, maxPercent: Number(event.target.value) }
                                    : item,
                                ),
                              )
                            }
                            required
                          />
                        </label>
                        <button
                          type="button"
                          className={styles.removeGradeBand}
                          disabled={!canCreate}
                          onClick={() =>
                            updateBands((current) =>
                              current.filter((_, itemIndex) => itemIndex !== index),
                            )
                          }
                          aria-label={`Remove grade band ${band.label || index + 1}`}
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                  {canCreate && (
                    <div className={styles.gradeScaleActions}>
                      <button
                        type="button"
                        className={styles.addGradeBand}
                        onClick={addGradeBand}
                      >
                        Add grade band
                      </button>
                      <button
                        type="submit"
                        disabled={
                          gradeScaleActions.isPending || bands.length === 0
                        }
                      >
                        {gradeScaleActions.isPending
                          ? "Saving..."
                          : "Save grading scale"}
                      </button>
                    </div>
                  )}
                  {gradeScaleActions.error && (
                    <p className={styles.gradeScaleError} role="alert">
                      {gradeScaleActions.error}
                    </p>
                  )}
                </form>
              </>
            )}
          </>
        )}
      </Panel>
      <DataTable
        title="Academic years"
        description="Academic periods configured for the active school."
        rows={resource.data ?? []}
        columns={columns}
        isLoading={resource.isLoading}
        error={resource.error}
        onRetry={resource.refresh}
        searchText={(row) => `${row.name} ${row.status} ${row.startDate} ${row.endDate}`}
      />
    </>
  );
}

export function AcademicsDirectory() {
  return isApiMode ? <ApiAcademicYears /> : <MockAcademicsDirectory />;
}
