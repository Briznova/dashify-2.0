import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiClient } from "@/services/api-client";
import { HttpPlatformAuditService } from "@/services/http/http-platform-audit-service";

describe("platform audit HTTP adapter", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("requests filters and maps only safe event fields", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      data: [{ id: "event-1", createdAt: "2026-01-01T00:00:00Z", actorUserId: null, action: "PLATFORM_AUDIT_READ", summary: "not exposed" }],
      nextCursor: null,
    }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const service = new HttpPlatformAuditService(new ApiClient("https://dashify.test/api/v1"));
    await expect(service.list({ action: "PLATFORM_AUDIT_READ", cursor: "abc", from: "2026-01-01T00:00:00Z" })).resolves.toEqual({
      data: [{ id: "event-1", createdAt: "2026-01-01T00:00:00Z", actorUserId: null, action: "PLATFORM_AUDIT_READ" }],
      nextCursor: null,
    });
    expect(fetchMock.mock.calls[0][0]).toContain("action=PLATFORM_AUDIT_READ");
    expect(fetchMock.mock.calls[0][0]).toContain("cursor=abc");
  });

  it("rejects unrecognized actions rather than exposing unexpected audit data", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({
      data: [{ id: "event-1", createdAt: "2026-01-01T00:00:00Z", actorUserId: null, action: "STUDENT_CREATED" }],
      nextCursor: null,
    }), { status: 200 })));
    const service = new HttpPlatformAuditService(new ApiClient("https://dashify.test/api/v1"));
    await expect(service.list({})).rejects.toThrow("invalid platform audit data");
  });
});
