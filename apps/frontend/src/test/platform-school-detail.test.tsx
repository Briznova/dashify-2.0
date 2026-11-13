import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { isDashboardRouteAllowed } from "@/lib/access-policy";

const mocks = vi.hoisted(() => ({ usePlatformSchool: vi.fn(), refresh: vi.fn() }));
vi.mock("@/hooks/use-school-data", () => ({
  usePlatformSchool: mocks.usePlatformSchool,
}));
vi.mock("@/services", () => ({ isApiMode: true }));
vi.mock("@/hooks/use-auth", () => ({ useAuthSession: () => ({ session: null }) }));

import { PlatformSchoolDetail } from "@/components/platform-school-detail";

describe("platform school directory detail", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.usePlatformSchool.mockReturnValue({
      data: { id: "school-2", name: "Other School", code: "OTHER", isActive: false, createdAt: "2026-01-02T00:00:00.000Z", onboardingState: "NOT_STARTED" },
      isLoading: false,
      error: null,
      refresh: mocks.refresh,
    });
  });

  it("shows the recorded onboarding state independently of active status", () => {
    render(<PlatformSchoolDetail schoolId="school-2" />);
    expect(screen.getByText("Other School")).toBeInTheDocument();
    expect(screen.getByText("OTHER")).toBeInTheDocument();
    expect(screen.getByText("Inactive")).toBeInTheDocument();
    expect(screen.queryByText("Example School")).not.toBeInTheDocument();
    expect(screen.getByText(/Not started/)).toBeInTheDocument();
    expect(mocks.usePlatformSchool).toHaveBeenCalledWith("school-2");
  });

  it("reports missing schools and does not substitute other records", () => {
    mocks.usePlatformSchool.mockReturnValue({ data: null, isLoading: false, error: null, refresh: mocks.refresh });
    render(<PlatformSchoolDetail schoolId="missing" />);
    expect(screen.getByRole("heading", { name: "School not found" })).toBeInTheDocument();
    expect(screen.queryByText("Example School")).not.toBeInTheDocument();
  });

  it("does not infer onboarding state for existing schools without a recorded state", () => {
    mocks.usePlatformSchool.mockReturnValue({
      data: { id: "school-2", name: "Other School", code: "OTHER", isActive: true, createdAt: "2026-01-02T00:00:00.000Z", onboardingState: null },
      isLoading: false, error: null, refresh: mocks.refresh,
    });
    render(<PlatformSchoolDetail schoolId="school-2" />);
    expect(screen.getByText(/onboarding state is not recorded/i)).toBeInTheDocument();
    expect(screen.queryByText(/Not started/)).not.toBeInTheDocument();
  });

  it("shows failures and retries without showing stale school data", () => {
    mocks.usePlatformSchool.mockReturnValue({
      data: { id: "school-1", name: "Example School" },
      isLoading: false,
      error: "Directory unavailable",
      refresh: mocks.refresh,
    });
    render(<PlatformSchoolDetail schoolId="school-1" />);
    expect(screen.getByRole("alert")).toHaveTextContent("Directory unavailable");
    expect(screen.queryByText("Example School")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(mocks.refresh).toHaveBeenCalledOnce();
  });

  it("requires the platform directory permission in API-mode route UX", () => {
    expect(isDashboardRouteAllowed("/dashboard/schools/school-1", "super_admin", ["platform.schools.read"])).toBe(true);
    expect(isDashboardRouteAllowed("/dashboard/schools/school-1", "super_admin", [])).toBe(false);
    expect(isDashboardRouteAllowed("/dashboard/schools/school-1", "school_admin", ["platform.schools.read"])).toBe(false);
  });
});
