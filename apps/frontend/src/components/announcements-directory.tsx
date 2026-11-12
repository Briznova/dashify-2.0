"use client";

import { useState, type FormEvent } from "react";
import { useAnnouncementActions, useAnnouncements } from "@/hooks/use-school-data";
import { useAuthSession } from "@/hooks/use-auth";
import { isApiMode } from "@/services";
import { PageHeading } from "@/components/ui/page-heading";
import { Panel } from "@/components/ui/panel";
import { ResourceState } from "@/components/ui/resource-state";
import styles from "./announcements-directory.module.css";

export function AnnouncementsDirectory() {
  const { session, isLoading: isSessionLoading } = useAuthSession();
  const canManage = isApiMode
    ? session?.permissionKeys.includes("announcements.manage") === true
    : session?.user.role === "school_admin";
  const resource = useAnnouncements(canManage);
  const actions = useAnnouncementActions();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const announcement = await actions.create({ title, body });
    if (announcement) {
      setTitle("");
      setBody("");
      resource.refresh();
    }
  }

  async function handlePublish(id: string) {
    if (await actions.publish(id)) resource.refresh();
  }

  return (
    <div className={styles.page}>
      <PageHeading
        eyebrow="SCHOOL WORKSPACE"
        title="Announcements"
        description="Read published updates from your school."
      />

      {canManage && (
        <Panel
          title="Create an announcement"
          description="New announcements remain drafts until you publish them."
          className={styles.panel}
        >
          <form className={styles.form} onSubmit={handleCreate}>
            <label>
              Title
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                maxLength={120}
                required
              />
            </label>
            <label>
              Message
              <textarea
                value={body}
                onChange={(event) => setBody(event.target.value)}
                maxLength={10000}
                rows={5}
                required
              />
            </label>
            {actions.error && <p className={styles.error} role="alert">{actions.error}</p>}
            <button type="submit" disabled={actions.isPending}>
              {actions.isPending ? "Saving…" : "Save draft"}
            </button>
          </form>
        </Panel>
      )}

      <Panel
        title={canManage ? "School announcements" : "Published announcements"}
        description={canManage
          ? "Review drafts and published messages for this school."
          : "Updates published for your school."}
        className={styles.panel}
      >
        {(resource.error || resource.isLoading || (isApiMode && isSessionLoading)) && (
          <ResourceState
            error={resource.error}
            isLoading={resource.isLoading || (isApiMode && isSessionLoading)}
            onRetry={resource.refresh}
          />
        )}
        {!resource.isLoading && !resource.error && resource.data?.length === 0 && (
          <p className={styles.empty}>There are no announcements yet.</p>
        )}
        {resource.data && resource.data.length > 0 && (
          <div className={styles.list}>
            {resource.data.map((announcement) => (
              <article className={styles.item} key={announcement.id}>
                <div className={styles.itemHeader}>
                  <h3>{announcement.title}</h3>
                  {canManage && (
                    <span className={announcement.status === "DRAFT" ? styles.draft : styles.published}>
                      {announcement.status === "DRAFT" ? "Draft" : "Published"}
                    </span>
                  )}
                </div>
                <p className={styles.body}>{announcement.body}</p>
                <div className={styles.itemFooter}>
                  <time dateTime={announcement.publishedAt ?? announcement.createdAt}>
                    {announcement.publishedAt
                      ? `Published ${new Date(announcement.publishedAt).toLocaleString()}`
                      : `Created ${new Date(announcement.createdAt).toLocaleString()}`}
                  </time>
                  {canManage && announcement.status === "DRAFT" && (
                    <button
                      type="button"
                      onClick={() => void handlePublish(announcement.id)}
                      disabled={actions.isPending}
                    >
                      Publish
                    </button>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
        {actions.error && !canManage && <p className={styles.error} role="alert">{actions.error}</p>}
      </Panel>
    </div>
  );
}
