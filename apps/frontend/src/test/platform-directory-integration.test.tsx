import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/services", async () => {
  const { ApiClient } = await import("@/services/api-client");
  const { HttpSchoolService } = await import("@/services/http/http-school-service");
  return {
    isApiMode: true,
    schoolService: new HttpSchoolService(new ApiClient("https://dashify.test/api/v1")),
  };
});

import { PlatformSchoolsDirectory } from "@/components/platform-schools-directory";

describe("platform directory integration", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("loads real contract data through the hook and filters the displayed directory", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify([
      { id: "1", name: "Example School", code: "EXAMPLE", isActive: true, createdAt: "2026-01-01T00:00:00.000Z" },
      { id: "2", name: "Other School", code: "OTHER", isActive: false, createdAt: "2026-01-02T00:00:00.000Z" },
    ]), { status: 200, headers: { "Content-Type": "application/json" } }));
    vi.stubGlobal("fetch", fetchMock);
    render(<PlatformSchoolsDirectory overview />);

    expect(await screen.findByText("Example School")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      "https://dashify.test/api/v1/platform/schools",
      expect.objectContaining({ credentials: "include" }),
    );
    expect(screen.queryByText(/dummy data/i)).not.toBeInTheDocument();
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
});
