import { ApiError, type ApiClient } from "@/services/api-client";
import { supportPriorities, supportStatuses, type SupportAction, type SupportPriority, type SupportStatus, type SupportTicket, type SupportTicketDetail, type SupportTicketPage } from "@/types/platform-support";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function isDate(value: unknown): value is string {
  return typeof value === "string" && Number.isFinite(Date.parse(value));
}
function invalid(): never {
  throw new ApiError("The Dashify service returned invalid support data.", 502);
}
function parseTicket(value: unknown): SupportTicket {
  if (!isRecord(value) || !isRecord(value.school) ||
    typeof value.id !== "string" || typeof value.schoolId !== "string" ||
    typeof value.school.id !== "string" || typeof value.school.name !== "string" ||
    typeof value.school.code !== "string" || value.school.id !== value.schoolId ||
    typeof value.title !== "string" || typeof value.description !== "string" ||
    typeof value.createdById !== "string" ||
    !(value.assigneeId === null || typeof value.assigneeId === "string") ||
    !(value.resolvedAt === null || isDate(value.resolvedAt)) ||
    !isDate(value.createdAt) || !isDate(value.updatedAt) ||
    typeof value.version !== "number" || !Number.isInteger(value.version) || value.version < 1) return invalid();
  const status = supportStatuses.find((item) => item === value.status);
  const priority = supportPriorities.find((item) => item === value.priority);
  if (!status || !priority) return invalid();
  return {
    id: value.id, schoolId: value.schoolId,
    school: { id: value.school.id, name: value.school.name, code: value.school.code },
    title: value.title, description: value.description, status, priority,
    createdById: value.createdById, assigneeId: value.assigneeId, version: value.version,
    resolvedAt: value.resolvedAt, createdAt: value.createdAt, updatedAt: value.updatedAt,
  };
}

export class HttpPlatformSupportService {
  constructor(private readonly api: ApiClient) {}

  async summary(signal?: AbortSignal): Promise<{ unresolved: number }> {
    const response = await this.api.request<unknown>("/platform/support-tickets/summary", {}, signal);
    if (!isRecord(response) || typeof response.unresolved !== "number" ||
      !Number.isSafeInteger(response.unresolved) || response.unresolved < 0) return invalid();
    return { unresolved: response.unresolved };
  }

  async list(input: { status?: SupportStatus; cursor?: string; pageSize?: number }, signal?: AbortSignal): Promise<SupportTicketPage> {
    const query = new URLSearchParams({ pageSize: String(input.pageSize ?? 25) });
    if (input.status) query.set("status", input.status);
    if (input.cursor) query.set("cursor", input.cursor);
    const response = await this.api.request<unknown>(`/platform/support-tickets?${query}`, {}, signal);
    if (!isRecord(response) || !Array.isArray(response.data) ||
      !(response.nextCursor === null || typeof response.nextCursor === "string")) return invalid();
    return { data: response.data.map(parseTicket), nextCursor: response.nextCursor };
  }

  async detail(id: string, signal?: AbortSignal): Promise<SupportTicketDetail> {
    const response = await this.api.request<unknown>(`/platform/support-tickets/${encodeURIComponent(id)}`, {}, signal);
    if (!isRecord(response) || !Array.isArray(response.events)) return invalid();
    const ticket = parseTicket(response);
    const events = response.events.map((event: unknown) => {
      if (!isRecord(event) || typeof event.id !== "string" || typeof event.actorUserId !== "string" ||
        typeof event.action !== "string" || !isDate(event.createdAt) ||
        !(event.fromValue === null || typeof event.fromValue === "string") ||
        !(event.toValue === null || typeof event.toValue === "string")) return invalid();
      return { id: event.id, actorUserId: event.actorUserId, action: event.action, fromValue: event.fromValue, toValue: event.toValue, createdAt: event.createdAt };
    });
    return { ...ticket, events };
  }

  async create(input: { schoolId: string; title: string; description: string; priority: SupportPriority }): Promise<SupportTicket> {
    const response = await this.api.request<unknown>("/platform/support-tickets", { method: "POST", body: JSON.stringify(input) });
    return parseTicket(response);
  }

  async act(id: string, input: { action: SupportAction; version: number; value?: string }): Promise<SupportTicket> {
    const response = await this.api.request<unknown>(`/platform/support-tickets/${encodeURIComponent(id)}/actions`, { method: "POST", body: JSON.stringify(input) });
    return parseTicket(response);
  }
}
