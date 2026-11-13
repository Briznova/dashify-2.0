"use client";

import { useEffect, useState } from "react";
import { useAuthSession } from "@/hooks/use-auth";
import { PageHeading } from "@/components/ui/page-heading";
import { Panel } from "@/components/ui/panel";
import { ResourceState } from "@/components/ui/resource-state";
import { PlatformPreview } from "@/components/platform-preview";
import { isApiMode, platformSettingsService } from "@/services";
import type { PlatformSettings as PlatformSettingsData } from "@/services/http/http-platform-settings-service";
import styles from "./platform-preview.module.css";

export function PlatformSettings() {
  const { session, isLoading, error, refresh } = useAuthSession();
  if (!isApiMode) return <PlatformPreview page="settings" />;
  if (isLoading || error) return <ResourceState isLoading={isLoading} error={error} onRetry={refresh} />;
  if (session?.scope !== "platform" || session.user.role !== "super_admin" ||
    !session.permissionKeys.includes("platform.settings.read")) {
    return <p role="alert">Platform settings access is unavailable for this session.</p>;
  }
  return <SettingsContents key={session.user.id} />;
}

function SettingsContents() {
  const [data, setData] = useState<PlatformSettingsData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    void platformSettingsService.read(controller.signal).then(
      (settings) => { if (!controller.signal.aborted) { setData(settings); setError(null); } },
      (reason: unknown) => {
        if (!controller.signal.aborted) {
          setData(null);
          setError(reason instanceof Error ? reason.message : "Unable to load platform settings.");
        }
      },
    );
    return () => controller.abort();
  }, [version]);

  return (
    <div className={styles.page}>
      <PageHeading eyebrow="PLATFORM ADMINISTRATION" title="Platform settings" description="Read-only effective session configuration." />
      <p className={styles.note}>These values are configured on the backend and apply to newly issued session credentials. Editing, MFA, lockout and retention controls are not available here.</p>
      <Panel title="Session token lifetimes" description="Current backend configuration">
        {!data ? (
          <ResourceState isLoading={!error} error={error} onRetry={() => { setError(null); setVersion((value) => value + 1); }} />
        ) : (
          <dl className={styles.details}>
            <dt>Access token lifetime</dt><dd>{data.accessTokenTtlSeconds.toLocaleString()} seconds</dd>
            <dt>Refresh token lifetime</dt><dd>{data.refreshTokenTtlSeconds.toLocaleString()} seconds</dd>
          </dl>
        )}
      </Panel>
    </div>
  );
}
