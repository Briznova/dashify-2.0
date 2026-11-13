import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiClient } from "@/services/api-client";
import { HttpPlatformSupportService } from "@/services/http/http-platform-support-service";

const ticket = {
  id: "ticket-1", schoolId: "school-1", school: { id: "school-1", name: "Example", code: "EX" },
  title: "Synthetic issue", description: "Synthetic details", status: "OPEN", priority: "NORMAL",
  createdById: "operator", assigneeId: null, version: 1, resolvedAt: null,
  createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z",
};

describe("support HTTP adapter", () => {
  afterEach(() => vi.unstubAllGlobals());
  it("sends a versioned action with the existing API client", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify(ticket), { status: 201 }));
    vi.stubGlobal("fetch", fetchMock);
    const service = new HttpPlatformSupportService(new ApiClient("https://dashify.test/api/v1"));
    await expect(service.act("ticket-1", { action: "SET_STATUS", value: "RESOLVED", version: 1 })).resolves.toMatchObject({ id: "ticket-1" });
    expect(fetchMock.mock.calls[0][0]).toBe("https://dashify.test/api/v1/platform/support-tickets/ticket-1/actions");
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ action: "SET_STATUS", value: "RESOLVED", version: 1 });
  });
  it("rejects malformed or inconsistent ticket data", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({
      data: [{ ...ticket, school: { ...ticket.school, id: "other-school" } }], nextCursor: null,
    }), { status: 200 })));
    const service = new HttpPlatformSupportService(new ApiClient("https://dashify.test/api/v1"));
    await expect(service.list({})).rejects.toThrow("invalid support data");
  });
  it("reads a valid unresolved summary and rejects malformed counts", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ unresolved: 3 }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ unresolved: -1 }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const service = new HttpPlatformSupportService(new ApiClient("https://dashify.test/api/v1"));
    await expect(service.summary()).resolves.toEqual({ unresolved: 3 });
    expect(fetchMock.mock.calls[0][0]).toBe("https://dashify.test/api/v1/platform/support-tickets/summary");
    await expect(service.summary()).rejects.toThrow("invalid support data");
  });
});
