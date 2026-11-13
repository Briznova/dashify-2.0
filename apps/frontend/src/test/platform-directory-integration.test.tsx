import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const auth = vi.hoisted(() => ({ session: null as null | { scope: string; user: { role: string; id: string }; permissionKeys: string[] } }));
vi.mock("@/services", async () => {
  const { ApiClient } = await import("@/services/api-client");
  const { HttpSchoolService } = await import("@/services/http/http-school-service");
  const { HttpPlatformSupportService } = await import("@/services/http/http-platform-support-service");
  const { HttpPlatformOnboardingSummaryService } = await import("@/services/http/http-platform-onboarding-summary-service");
  return {
    isApiMode: true,
    schoolService: new HttpSchoolService(new ApiClient("https://dashify.test/api/v1")),
    platformSupportService: new HttpPlatformSupportService(new ApiClient("https://dashify.test/api/v1")),
    platformOnboardingSummaryService: new HttpPlatformOnboardingSummaryService(new ApiClient("https://dashify.test/api/v1")),
  };
});
vi.mock("@/hooks/use-auth", () => ({
  useAuthSession: () => ({ session: auth.session }),
}));

import { PlatformSchoolsDirectory } from "@/components/platform-schools-directory";
import { PlatformSchoolDetail } from "@/components/platform-school-detail";

describe("platform directory integration", () => {
  beforeEach(() => { auth.session = null; });
  afterEach(() => vi.unstubAllGlobals());

  it("loads the unresolved support count only with the support read grant and allows retry", async () => {
    auth.session = { scope: "platform", user: { role: "super_admin", id: "operator" }, permissionKeys: ["platform.support.read"] };
    const fetchMock = vi.fn().mockImplementation((url: string) => {
      if (url.endsWith("/platform/schools")) return Promise.resolve(new Response("[]", { status: 200 }));
      if (fetchMock.mock.calls.filter(([value]) => value.endsWith("/support-tickets/summary")).length === 1) {
        return Promise.resolve(new Response("", { status: 503 }));
      }
      return Promise.resolve(new Response(JSON.stringify({ unresolved: 3 }), { status: 200 }));
    });
    vi.stubGlobal("fetch", fetchMock);
    render(<PlatformSchoolsDirectory overview />);
    expect(await screen.findByText("Support summary unavailable")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Retry support summary" }));
    expect(await screen.findByText("Open and in progress")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(fetchMock.mock.calls.filter(([url]) => url.endsWith("/support-tickets/summary"))).toHaveLength(2);
  });

  it("shows recorded onboarding counts without treating unknown as not started", async () => {
    auth.session = { scope: "platform", user: { role: "super_admin", id: "operator" }, permissionKeys: ["platform.schools.read"] };
    const fetchMock = vi.fn().mockImplementation((url: string) => Promise.resolve(new Response(
      JSON.stringify(url.endsWith("/onboarding-summary") ? { notStarted: 2, completed: 3, unknown: 4 } : []), { status: 200 },
    )));
    vi.stubGlobal("fetch", fetchMock);
    render(<PlatformSchoolsDirectory />);
    expect(await screen.findByText("2 not started · 4 unknown")).toBeInTheDocument();
    expect(screen.getByText("Confirmed onboarding")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it("loads real contract data through the hook and filters the displayed directory", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify([
      { id: "1", name: "Example School", code: "EXAMPLE", isActive: true, createdAt: "2026-01-01T00:00:00.000Z" },
      { id: "2", name: "Other School", code: "OTHER", isActive: false, createdAt: "2026-01-02T00:00:00.000Z" },
    ]), { status: 200, headers: { "Content-Type": "application/json" } }));
    vi.stubGlobal("fetch", fetchMock);
    render(<PlatformSchoolsDirectory overview />);

    expect(await screen.findByText("Example School")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Example School" })).toHaveAttribute("href", "/dashboard/schools/1");
    expect(fetchMock).toHaveBeenCalledWith(
      "https://dashify.test/api/v1/platform/schools",
      expect.objectContaining({ credentials: "include" }),
    );
    expect(screen.queryByText(/dummy data/i)).not.toBeInTheDocument();
    expect(screen.getByText("Support access required")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    fireEvent.change(screen.getByRole("textbox", { name: /search school directory/i }), { target: { value: "OTHER" } });
    expect(screen.queryByText("Example School")).not.toBeInTheDocument();
    expect(screen.getByText("Other School")).toBeInTheDocument();
  });

  it("shows API failures and retries without falling back to demo data", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response("", { status: 403 }))
      .mockResolvedValueOnce(new Response("[]", { status: 200, headers: { "Content-Type": "application/json" } }));
    vi.stubGlobal("fetch", fetchMock);
    render(<PlatformSchoolsDirectory />);

    expect(await screen.findByRole("alert")).toBeInTheDocument();
    expect(screen.queryByText("Example School")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    expect(await screen.findByText("No records match your search.")).toBeInTheDocument();
  });

  it("loads selected-school metadata and onboarding through its platform endpoint", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify(
      { id: "2", name: "Other School", code: "OTHER", isActive: false, createdAt: "2026-01-02T00:00:00.000Z", onboardingState: "NOT_STARTED" },
    ), { status: 200, headers: { "Content-Type": "application/json" } }));
    vi.stubGlobal("fetch", fetchMock);
    render(<PlatformSchoolDetail schoolId="2" />);

    expect(await screen.findByText("Other School")).toBeInTheDocument();
    expect(screen.getByText(/Not started/)).toBeInTheDocument();
    expect(screen.queryByText("Example School")).not.toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://dashify.test/api/v1/platform/schools/2",
      expect.objectContaining({ credentials: "include" }),
    );
  });

  it("does not display the previous school while a new detail request is pending", async () => {
    let resolveNext!: (response: Response) => void;
    const pending = new Promise<Response>((resolve) => { resolveNext = resolve; });
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({
        id: "1", name: "First School", code: "FIRST", isActive: true,
        createdAt: "2026-01-01T00:00:00.000Z", onboardingState: null,
      }), { status: 200 }))
      .mockReturnValueOnce(pending);
    vi.stubGlobal("fetch", fetchMock);
    const { rerender } = render(<PlatformSchoolDetail schoolId="1" />);
    expect(await screen.findByText("First School")).toBeInTheDocument();
    rerender(<PlatformSchoolDetail schoolId="2" />);
    expect(screen.queryByText("First School")).not.toBeInTheDocument();
    resolveNext(new Response(JSON.stringify({
      id: "2", name: "Second School", code: "SECOND", isActive: true,
      createdAt: "2026-01-01T00:00:00.000Z", onboardingState: "NOT_STARTED",
    }), { status: 200 }));
    expect(await screen.findByText("Second School")).toBeInTheDocument();
  });
});
