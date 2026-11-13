import { ApiError, type ApiClient } from "@/services/api-client";
import { platformAuditActions, type PlatformAuditAction, type PlatformAuditPageData } from "@/types/platform-audit";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export class HttpPlatformAuditService {
  constructor(private readonly api: ApiClient) {}

  async list(input: { action?: PlatformAuditAction; cursor?: string; from?: string; to?: string; pageSize?: number }, signal?: AbortSignal): Promise<PlatformAuditPageData> {
    const query = new URLSearchParams({ pageSize: String(input.pageSize ?? 25) });
    if (input.action) query.set("action", input.action);
    if (input.cursor) query.set("cursor", input.cursor);
    if (input.from) query.set("from", input.from);
    if (input.to) query.set("to", input.to);
    const response = await this.api.request<unknown>(`/platform/audit-events?${query}`, {}, signal);
    if (!isRecord(response) || !Array.isArray(response.data) ||
      !(response.nextCursor === null || typeof response.nextCursor === "string")) {
      throw new ApiError("The Dashify service returned invalid platform audit data.", 502);
    }
    const data = response.data.map((event: unknown) => {
      if (!isRecord(event) || typeof event.id !== "string" || !event.id ||
        typeof event.createdAt !== "string" || !Number.isFinite(Date.parse(event.createdAt)) ||
        !(event.actorUserId === null || typeof event.actorUserId === "string") ||
        typeof event.action !== "string") {
        throw new ApiError("The Dashify service returned invalid platform audit data.", 502);
      }
      const action = platformAuditActions.find((item) => item === event.action);
      if (!action) throw new ApiError("The Dashify service returned invalid platform audit data.", 502);
      return { id: event.id, createdAt: event.createdAt, actorUserId: event.actorUserId, action };
    });
    return { data, nextCursor: response.nextCursor };
  }
}
