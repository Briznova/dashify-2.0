import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  useAcademicYears: vi.fn(),
  useCreateAcademicYear: vi.fn(),
  useAcademicYearLifecycle: vi.fn(),
  useGradeScale: vi.fn(),
  useTeacherActions: vi.fn(),
  activate: vi.fn(),
  complete: vi.fn(),
  refresh: vi.fn(),
}));

vi.mock("@/hooks/use-school-data", () => ({
  useAcademicYears: mocks.useAcademicYears,
  useCreateAcademicYear: mocks.useCreateAcademicYear,
  useAcademicYearLifecycle: mocks.useAcademicYearLifecycle,
  useGradeScale: mocks.useGradeScale,
  useTeacherActions: mocks.useTeacherActions,
  useAssignments: vi.fn(),
  useFees: vi.fn(),
  usePortalOverview: vi.fn(),
}));
vi.mock("@/hooks/use-auth", () => ({
  useAuthSession: () => ({
    session: { permissionKeys: ["academic_structure.manage"] },
  }),
}));
vi.mock("@/services", () => ({ isApiMode: true }));

import { AcademicsDirectory } from "@/components/school-extras";

describe("academic-year lifecycle controls", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  function renderYears(
    years: Array<{
      id: string;
      name: string;
      startDate: string;
      endDate: string;
      status: "DRAFT" | "ACTIVE" | "COMPLETED";
    }>,
  ) {
    mocks.useAcademicYears.mockReturnValue({
      data: years,
      isLoading: false,
      error: null,
      refresh: mocks.refresh,
    });
    mocks.useCreateAcademicYear.mockReturnValue({
      create: vi.fn(),
      isPending: false,
      error: null,
    });
    mocks.useAcademicYearLifecycle.mockReturnValue({
      activate: mocks.activate,
      complete: mocks.complete,
      pendingId: null,
      error: null,
    });
    mocks.useGradeScale.mockReturnValue({
      data: { bands: [] },
      isLoading: false,
      error: null,
      refresh: vi.fn(),
    });
    mocks.useTeacherActions.mockReturnValue({
      saveGradeScale: vi.fn(),
      error: null,
    });
    render(<AcademicsDirectory />);
  }

  it("offers activation for a draft year when no year is active", async () => {
    mocks.activate.mockResolvedValue({
      id: "year-draft",
      status: "ACTIVE",
    });
    vi.spyOn(window, "confirm").mockReturnValue(true);
    renderYears([
      {
        id: "year-draft",
        name: "2026-2027",
        startDate: "2026-04-01",
        endDate: "2027-03-31",
        status: "DRAFT",
      },
    ]);

    fireEvent.click(screen.getByRole("button", { name: "Activate" }));

    await waitFor(() => {
      expect(mocks.activate).toHaveBeenCalledWith("year-draft");
      expect(mocks.refresh).toHaveBeenCalled();
    });
  });

  it("requires the active year to be completed before another can be activated", async () => {
    mocks.complete.mockResolvedValue({
      id: "year-active",
      status: "COMPLETED",
    });
    vi.spyOn(window, "confirm").mockReturnValue(true);
    renderYears([
      {
        id: "year-active",
        name: "2025-2026",
        startDate: "2025-04-01",
        endDate: "2026-03-31",
        status: "ACTIVE",
      },
      {
        id: "year-draft",
        name: "2026-2027",
        startDate: "2026-04-01",
        endDate: "2027-03-31",
        status: "DRAFT",
      },
    ]);

    expect(screen.queryByRole("button", { name: "Activate" })).toBeNull();
    expect(
      screen.getByText(
        "Complete the active academic year after its end date before activating another year.",
      ),
    ).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Complete" }));

    await waitFor(() => {
      expect(mocks.complete).toHaveBeenCalledWith("year-active");
      expect(mocks.refresh).toHaveBeenCalled();
    });
  });
});
