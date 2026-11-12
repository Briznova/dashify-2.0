import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiClient } from "@/services/api-client";
import { HttpSchoolService } from "@/services/http/http-school-service";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("HttpSchoolService announcements", () => {
  it("uses the school-wide announcement routes and validates responses", async () => {
    const draft = {
      id: "announcement-1",
      title: "Term notice",
      body: "Classes begin Monday.",
      status: "DRAFT",
      publishedAt: null,
      createdAt: "2026-04-03T07:45:00.000Z",
    };
    const published = {
      ...draft,
      status: "PUBLISHED",
      publishedAt: "2026-04-03T08:00:00.000Z",
    };
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify([published]), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }))
      .mockResolvedValueOnce(new Response(JSON.stringify([draft]), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }))
      .mockResolvedValueOnce(new Response(JSON.stringify(draft), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      }))
      .mockResolvedValueOnce(new Response(JSON.stringify(published), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      }));
    vi.stubGlobal("fetch", fetchMock);
    const service = new HttpSchoolService(
      new ApiClient("https://dashify.test/api/v1"),
    );

    await expect(service.getAnnouncements()).resolves.toEqual([published]);
    await expect(service.getAnnouncements(true)).resolves.toEqual([draft]);
    await service.createAnnouncement({
      title: "Term notice",
      body: "Classes begin Monday.",
    });
    await service.publishAnnouncement("announcement-1");

    expect(fetchMock.mock.calls.map(([url, init]) => [url, init?.method])).toEqual([
      ["https://dashify.test/api/v1/announcements", undefined],
      ["https://dashify.test/api/v1/announcements/manage", undefined],
      ["https://dashify.test/api/v1/announcements", "POST"],
      ["https://dashify.test/api/v1/announcements/announcement-1/publish", "POST"],
    ]);
    expect(JSON.parse(fetchMock.mock.calls[2][1].body as string)).toEqual({
      title: "Term notice",
      body: "Classes begin Monday.",
    });
  });
});
