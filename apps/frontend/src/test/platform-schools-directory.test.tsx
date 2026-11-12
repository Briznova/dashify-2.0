import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  refresh: vi.fn(),
  usePlatformSchools: vi.fn(),
}));

vi.mock("@/hooks/use-school-data", () => ({
  usePlatformSchools: mocks.usePlatformSchools,
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

  it("renders metadata-only directory and status counts", () => {
    render(<PlatformSchoolsDirectory />);

    expect(screen.getByText("Example School")).toBeInTheDocument();
    expect(screen.getByText("EXAMPLE")).toBeInTheDocument();
    expect(screen.getAllByText("Inactive")).toHaveLength(2);
    expect(screen.getByText("Total schools")).toBeInTheDocument();
    expect(screen.getAllByText("2")).toHaveLength(1);
    expect(screen.getAllByText("Active")).toHaveLength(2);
    expect(
      screen.getByText(
        "This platform session cannot open school records, switch into a school, or change school settings.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.queryByText(/principal|students|staff/i),
    ).not.toBeInTheDocument();
  });
});
