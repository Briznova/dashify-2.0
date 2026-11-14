import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  refresh: vi.fn(),
  usePlatformSchools: vi.fn(),
  download: vi.fn(),
}));

vi.mock("@/hooks/use-school-data", () => ({
  usePlatformSchools: mocks.usePlatformSchools,
}));
vi.mock("@/lib/platform-schools-csv", () => ({
  downloadPlatformSchoolsCsv: mocks.download,
}));
vi.mock("@/hooks/use-auth", () => ({
  useAuthSession: () => ({ session: null }),
}));

import { PlatformSchoolsDirectory } from "@/components/platform-schools-directory";

describe("PlatformSchoolsDirectory", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.usePlatformSchools.mockReturnValue({
      data: [
        {
          id: "school-1",
          name: "Example School",
          code: "EXAMPLE",
          isActive: true,
          createdAt: "2026-04-03T08:00:00.000Z",
        },
        {
          id: "school-2",
          name: "Inactive School",
          code: "INACTIVE",
          isActive: false,
          createdAt: "2025-01-03T08:00:00.000Z",
        },
      ],
      isLoading: false,
      error: null,
      refresh: mocks.refresh,
    });
  });

  it("renders the school directory layout with real status and unsupported school metrics", () => {
    render(<PlatformSchoolsDirectory />);

    expect(screen.getByText("Example School")).toBeInTheDocument();
    expect(screen.getByText("EXAMPLE")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "All schools" })).toBeInTheDocument();
    expect(screen.getByText("Confirmed onboarding")).toBeInTheDocument();
    expect(screen.getByText("Pending invitations")).toBeInTheDocument();
    expect(screen.queryByText("Monthly recurring revenue")).not.toBeInTheDocument();
    expect(screen.getByText("2 total · 1 inactive")).toBeInTheDocument();
    expect(screen.getAllByText("Dummy preview · not connected")).toHaveLength(2);
    expect(screen.getByText("Inactive schools")).toBeInTheDocument();
    expect(screen.getByText("Directory status, not suspension")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Export filtered schools" })).toBeEnabled();
    expect(screen.getByRole("link", { name: /view school setup preview/i })).toHaveAttribute("href", "/dashboard/platform/school-setup");
    expect(screen.queryByRole("link", { name: /school detail preview/i })).not.toBeInTheDocument();
    expect(
      screen.getByText(
        "This platform session cannot open school records, switch into a school, or change school settings.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.queryByText(/principal|students|staff/i),
    ).not.toBeInTheDocument();
  });

  it("renders a distinct overview with a limited directory and preview panels", () => {
    mocks.usePlatformSchools.mockReturnValue({
      data: Array.from({ length: 7 }, (_, index) => ({
        id: `school-${index}`,
        name: `Example School ${index}`,
        code: `EXAMPLE-${index}`,
        isActive: true,
        createdAt: "2026-04-03T08:00:00.000Z",
      })),
      isLoading: false,
      error: null,
      refresh: mocks.refresh,
    });
    render(<PlatformSchoolsDirectory overview />);

    expect(screen.getByRole("heading", { name: "School tenants" })).toBeInTheDocument();
    expect(screen.getByText("Monthly recurring revenue")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Platform activity" })).toBeInTheDocument();
    expect(screen.queryByText("Pending invitations")).not.toBeInTheDocument();
    expect(screen.getByText("Example School 4")).toBeInTheDocument();
    expect(screen.queryByText("Example School 5")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /view all schools/i })).toHaveAttribute("href", "/dashboard/schools");
    expect(screen.getByRole("button", { name: "Export report" })).toBeDisabled();
  });

  it("filters and paginates locally without changing the directory totals", () => {
    mocks.usePlatformSchools.mockReturnValue({
      data: Array.from({ length: 8 }, (_, index) => ({
        id: `school-${index}`,
        name: `Example School ${index}`,
        code: `EXAMPLE-${index}`,
        isActive: index !== 7,
        createdAt: "2026-04-03T08:00:00.000Z",
      })),
      isLoading: false,
      error: null,
      refresh: mocks.refresh,
    });
    render(<PlatformSchoolsDirectory />);
    expect(screen.queryByText("Example School 7")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.getByText("Example School 7")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Export filtered schools" }));
    expect(mocks.download.mock.calls[0][0]).toHaveLength(8);
    fireEvent.change(screen.getByRole("combobox", { name: /school status/i }), { target: { value: "inactive" } });
    expect(screen.getByText("Example School 7")).toBeInTheDocument();
    expect(screen.queryByText("Example School 0")).not.toBeInTheDocument();
    expect(within(screen.getByRole("region", { name: "School directory summary" })).getByText("8 total · 1 inactive")).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: /subscription/i })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Export filtered schools" }));
    expect(mocks.download).toHaveBeenCalledWith([
      expect.objectContaining({ id: "school-7" }),
    ]);
  });

  it("does not display stale school data while retrying", () => {
    mocks.usePlatformSchools.mockReturnValue({
      data: [{
        id: "school-1",
        name: "Example School",
        code: "EXAMPLE",
        isActive: true,
        createdAt: "2026-04-03T08:00:00.000Z",
      }],
      isLoading: true,
      error: null,
      refresh: mocks.refresh,
    });

    render(<PlatformSchoolsDirectory />);
    expect(screen.queryByText("Example School")).not.toBeInTheDocument();
    expect(screen.queryByText("1 total · 0 inactive")).not.toBeInTheDocument();
    expect(screen.getAllByText("Loading directory")).toHaveLength(2);
    expect(screen.getByRole("button", { name: "Export filtered schools" })).toBeDisabled();
  });

  it("reports download errors and disables export when no schools match", () => {
    mocks.download.mockImplementationOnce(() => { throw new Error("Download failed"); });
    render(<PlatformSchoolsDirectory />);
    fireEvent.click(screen.getByRole("button", { name: "Export filtered schools" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Unable to download the school directory");
    fireEvent.change(screen.getByRole("textbox", { name: /search school directory/i }), { target: { value: "no match" } });
    expect(screen.getByRole("button", { name: "Export filtered schools" })).toBeDisabled();
  });
});
