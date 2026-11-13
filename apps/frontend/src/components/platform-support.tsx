"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { useAuthSession } from "@/hooks/use-auth";
import { PageHeading } from "@/components/ui/page-heading";
import { Panel } from "@/components/ui/panel";
import { ResourceState } from "@/components/ui/resource-state";
import { PlatformPreview } from "@/components/platform-preview";
import { isApiMode, platformSupportService, schoolService } from "@/services";
import type { PlatformSchool } from "@/types/school";
import { supportPriorities, supportStatuses, type SupportAction, type SupportPriority, type SupportStatus, type SupportTicketDetail, type SupportTicketPage } from "@/types/platform-support";
import styles from "./platform-preview.module.css";

function message(error: unknown) {
  return error instanceof Error ? error.message : "Unable to complete this request.";
}
function label(value: string) {
  return value.replaceAll("_", " ").toLowerCase();
}

export function PlatformSupport({ ticketId }: { ticketId?: string }) {
  const { session, isLoading, error, refresh } = useAuthSession();
  if (!isApiMode) return <PlatformPreview page={ticketId === undefined ? "support" : "support-detail"} />;
  if (isLoading || error) return <ResourceState isLoading={isLoading} error={error} onRetry={refresh} />;
  if (session?.scope !== "platform" || session.user.role !== "super_admin" ||
    !session.permissionKeys.includes("platform.support.read")) {
    return <p role="alert">Platform support access is unavailable for this session.</p>;
  }
  const canUpdate = session.permissionKeys.includes("platform.support.update");
  return ticketId === undefined
    ? <SupportQueue key={session.user.id} canUpdate={canUpdate} />
    : <SupportDetail key={`${session.user.id}-${ticketId}`} id={ticketId} actorId={session.user.id} canUpdate={canUpdate} />;
}

function SupportQueue({ canUpdate }: { canUpdate: boolean }) {
  const router = useRouter();
  const [status, setStatus] = useState<SupportStatus | "">("");
  const [cursors, setCursors] = useState<(string | undefined)[]>([undefined]);
  const [page, setPage] = useState(0);
  const [version, setVersion] = useState(0);
  const [data, setData] = useState<SupportTicketPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [schools, setSchools] = useState<PlatformSchool[]>([]);
  const [schoolError, setSchoolError] = useState<string | null>(null);
  const [schoolVersion, setSchoolVersion] = useState(0);
  const [schoolId, setSchoolId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<SupportPriority>("NORMAL");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    void platformSupportService.list({ status: status || undefined, cursor: cursors[page] }, controller.signal)
      .then((result) => { if (!controller.signal.aborted) { setData(result); setError(null); setLoading(false); } },
        (reason: unknown) => { if (!controller.signal.aborted) { setData(null); setError(message(reason)); setLoading(false); } });
    return () => controller.abort();
  }, [status, cursors, page, version]);
  useEffect(() => {
    if (!canUpdate) return;
    const controller = new AbortController();
    void schoolService.getPlatformSchools(controller.signal).then(
      (result) => { if (!controller.signal.aborted) { setSchools(result); setSchoolError(null); } },
      (reason: unknown) => { if (!controller.signal.aborted) { setSchools([]); setSchoolError(message(reason)); } },
    );
    return () => controller.abort();
  }, [canUpdate, schoolVersion]);

  function reload() { setData(null); setLoading(true); setError(null); setVersion((value) => value + 1); }
  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    setSaving(true); setSaveError(null);
    try {
      const ticket = await platformSupportService.create({ schoolId, title, description, priority });
      router.push(`/dashboard/platform/support-detail?id=${encodeURIComponent(ticket.id)}`);
    } catch (reason) {
      setSaveError(`${message(reason)} If the request was interrupted, check the queue before retrying; the ticket may already exist.`);
      setSaving(false);
    }
  }
  return (
    <div className={styles.page}>
      <PageHeading eyebrow="PLATFORM ADMINISTRATION" title="Support" description="Internal tickets for known schools." />
      <p className={styles.note}>Platform-only tickets. Do not include passwords, credentials or unnecessary personal data. Resolved tickets are deleted after 365 days, subject to cleanup and backup operations.</p>
      {canUpdate && <Panel title="Create ticket" description="Create an internal ticket for a school.">
        <form className={styles.form} onSubmit={create}>
          <label className={styles.field}>School
            <select required value={schoolId} onChange={(event) => setSchoolId(event.target.value)}>
              <option value="">Select a school</option>
              {schools.map((school) => <option key={school.id} value={school.id}>{school.name} ({school.code})</option>)}
            </select>
          </label>
          {schoolError && <p role="alert">{schoolError} <button type="button" onClick={() => setSchoolVersion((value) => value + 1)}>Retry schools</button></p>}
          <label className={styles.field}>Title<input required minLength={2} maxLength={120} value={title} onChange={(event) => setTitle(event.target.value)} /></label>
          <label className={styles.field}>Description<textarea required maxLength={4000} rows={4} value={description} onChange={(event) => setDescription(event.target.value)} /></label>
          <label className={styles.field}>Priority<select value={priority} onChange={(event) => {
            const value = supportPriorities.find((item) => item === event.target.value);
            if (value) setPriority(value);
          }}>{supportPriorities.map((value) => <option key={value} value={value}>{label(value)}</option>)}</select></label>
          {saveError && <p role="alert">{saveError}</p>}
          <button className={styles.button} disabled={saving || !schoolId} type="submit">{saving ? "Creating…" : "Create ticket"}</button>
        </form>
      </Panel>}
      <Panel title="Support tickets" description="Newest first.">
        <label className={styles.field}>Status
          <select value={status} onChange={(event) => {
            setStatus(supportStatuses.find((value) => value === event.target.value) ?? "");
            setCursors([undefined]); setPage(0); setData(null); setLoading(true);
          }}><option value="">All statuses</option>{supportStatuses.map((value) => <option key={value} value={value}>{label(value)}</option>)}</select>
        </label>
        {loading || error ? <ResourceState isLoading={loading} error={error} onRetry={reload} /> : data && <>
          {data.data.length === 0 ? <p className={styles.empty}>No support tickets found.</p> : <div className={styles.tableScroll}>
            <table className={styles.table}><thead><tr><th>Title</th><th>School</th><th>Status</th><th>Priority</th><th>Created</th></tr></thead>
              <tbody>{data.data.map((ticket) => <tr key={ticket.id}>
                <td><Link href={`/dashboard/platform/support-detail?id=${encodeURIComponent(ticket.id)}`}>{ticket.title}</Link></td>
                <td>{ticket.school.name}</td><td>{label(ticket.status)}</td><td>{label(ticket.priority)}</td><td>{new Date(ticket.createdAt).toLocaleDateString()}</td>
              </tr>)}</tbody></table>
          </div>}
          <div className={styles.actions}>
            <button type="button" className={styles.button} disabled={page === 0} onClick={() => { setData(null); setLoading(true); setPage((value) => value - 1); }}>Previous</button>
            <button type="button" className={styles.button} disabled={!data.nextCursor} onClick={() => {
              if (!data.nextCursor) return;
              setCursors((value) => [...value.slice(0, page + 1), data.nextCursor ?? undefined]);
              setData(null); setLoading(true); setPage((value) => value + 1);
            }}>Next</button>
          </div>
        </>}
      </Panel>
    </div>
  );
}

function SupportDetail({ id, actorId, canUpdate }: { id: string; actorId: string; canUpdate: boolean }) {
  const [data, setData] = useState<SupportTicketDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [version, setVersion] = useState(0);
  useEffect(() => {
    if (!id) return;
    const controller = new AbortController();
    void platformSupportService.detail(id, controller.signal).then(
      (result) => { if (!controller.signal.aborted) { setData(result); setError(null); setLoading(false); } },
      (reason: unknown) => { if (!controller.signal.aborted) { setData(null); setError(message(reason)); setLoading(false); } },
    );
    return () => controller.abort();
  }, [id, version]);
  function reload() { setData(null); setLoading(true); setError(null); setActionError(null); setVersion((value) => value + 1); }
  async function act(action: SupportAction, value?: string) {
    if (!data || saving) return;
    setSaving(true); setActionError(null);
    try {
      await platformSupportService.act(id, { action, version: data.version, ...(value && { value }) });
      reload();
    } catch (reason) { setActionError(message(reason)); }
    finally { setSaving(false); }
  }
  const availableStatuses: Record<SupportStatus, SupportStatus[]> = {
    OPEN: ["IN_PROGRESS", "RESOLVED"], IN_PROGRESS: ["OPEN", "RESOLVED"], RESOLVED: ["OPEN"],
  };
  return <div className={styles.page}>
    <PageHeading eyebrow="PLATFORM ADMINISTRATION" title="Support ticket detail" description="Internal ticket and recent activity." />
    <Link href="/dashboard/platform/support">Back to support</Link>
    {!id ? <p role="alert">Select a support ticket from the queue.</p> :
      loading || error ? <ResourceState isLoading={loading} error={error} onRetry={reload} /> : data && <>
        <Panel title={data.title} description={`${data.school.name} (${data.school.code})`}>
          <dl className={styles.details}>
            <dt>Status</dt><dd>{label(data.status)}</dd><dt>Priority</dt><dd>{label(data.priority)}</dd>
            <dt>Assignee</dt><dd>{data.assigneeId === actorId ? "You" : data.assigneeId ?? "Unassigned"}</dd>
            <dt>Created</dt><dd>{new Date(data.createdAt).toLocaleString()}</dd>
          </dl>
          <p className={styles.supportDescription}>{data.description}</p>
          {canUpdate && <>
            <div className={styles.actions}>
              {availableStatuses[data.status].map((status) => <button key={status} type="button" className={styles.button} disabled={saving} onClick={() => void act("SET_STATUS", status)}>{status === "RESOLVED" ? "Resolve" : status === "OPEN" && data.status === "RESOLVED" ? "Reopen" : `Move to ${label(status)}`}</button>)}
              {!data.assigneeId && <button type="button" className={styles.button} disabled={saving} onClick={() => void act("CLAIM")}>Claim ticket</button>}
              {data.assigneeId === actorId && <button type="button" className={styles.button} disabled={saving} onClick={() => void act("RELEASE")}>Release ticket</button>}
            </div>
            <label className={styles.field}>Change priority
              <select value={data.priority} disabled={saving} onChange={(event) => { if (event.target.value !== data.priority) void act("SET_PRIORITY", event.target.value); }}>
                {supportPriorities.map((value) => <option key={value} value={value}>{label(value)}</option>)}
              </select>
            </label>
          </>}
          {actionError && <p role="alert">{actionError} <button type="button" onClick={reload}>Reload ticket</button></p>}
        </Panel>
        <Panel title="Recent history" description="Latest 100 changes, newest first.">
          {data.events.length === 0 ? <p className={styles.empty}>No activity recorded.</p> : <ul className={styles.steps}>
            {data.events.map((event) => <li key={event.id}><span>{label(event.action)} {event.fromValue ? `from ${label(event.fromValue)}` : ""} {event.toValue ? `to ${label(event.toValue)}` : ""}</span><small>{new Date(event.createdAt).toLocaleString()} · {event.actorUserId}</small></li>)}
          </ul>}
        </Panel>
      </>}
  </div>;
}
