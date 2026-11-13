import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ list: vi.fn(), session: vi.fn() }));
vi.mock("@/hooks/use-auth", () => ({ useAuthSession: mocks.session }));
vi.mock("@/hooks/use-school-data", () => ({
  usePlatformSchools: () => ({ data: [], isLoading: false, error: null, refresh: vi.fn() }),
}));
vi.mock("@/services", () => ({ isApiMode: true, platformAuditService: { list: mocks.list } }));
import { PlatformSchoolsDirectory } from "@/components/platform-schools-directory";

describe("platform overview activity", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.session.mockReturnValue({
      session: { scope: "platform", user: { id: "operator", role: "super_admin" }, permissionKeys: ["platform.audit.read"] },
      isLoading: false, error: null, refresh: vi.fn(),
    });
  });

  it("uses the authorized audit feed for recent activity", async () => {
    mocks.list.mockResolvedValue({
      data: [{ id: "event-1", action: "PLATFORM_SCHOOL_CREATED", createdAt: "2026-01-02T00:00:00Z", actorUserId: null }],
      nextCursor: null,
    });
    render(<PlatformSchoolsDirectory overview />);
    expect(await screen.findByText("PLATFORM SCHOOL CREATED")).toBeInTheDocument();
    expect(mocks.list).toHaveBeenCalledWith({ pageSize: 3 }, expect.any(AbortSignal));
  });

  it("does not fetch audit data without audit permission", () => {
    mocks.session.mockReturnValue({
      session: { scope: "platform", user: { id: "operator", role: "super_admin" }, permissionKeys: ["platform.schools.read"] },
      isLoading: false, error: null, refresh: vi.fn(),
    });
    render(<PlatformSchoolsDirectory overview />);
    expect(screen.getByText("Platform activity requires audit access.")).toBeInTheDocument();
    expect(mocks.list).not.toHaveBeenCalled();
  });

  it("surfaces and retries audit failures", async () => {
    mocks.list.mockRejectedValueOnce(new Error("Audit unavailable")).mockResolvedValue({ data: [], nextCursor: null });
    render(<PlatformSchoolsDirectory overview />);
    expect(await screen.findByText("Audit unavailable")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByText("No platform activity is available.")).toBeInTheDocument();
  });
});
