import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ isApiMode: true }));

vi.mock("@/services", () => ({
  get isApiMode() {
    return mocks.isApiMode;
  },
}));

vi.mock("@/components/school-dashboard", () => ({
  SchoolsDirectory: () => <div data-testid="mock-school-directory" />,
}));

vi.mock("@/components/platform-schools-directory", () => ({
  PlatformSchoolsDirectory: () => (
    <div data-testid="platform-school-directory" />
  ),
}));

import SchoolsPage from "@/app/dashboard/schools/page";

describe("SchoolsPage", () => {
  beforeEach(() => {
    mocks.isApiMode = true;
  });

  it("uses the metadata-only directory in API mode", () => {
    render(<SchoolsPage />);

    expect(screen.getByTestId("platform-school-directory")).toBeInTheDocument();
    expect(
      screen.queryByTestId("mock-school-directory"),
    ).not.toBeInTheDocument();
  });

  it("uses the same directory layout in mock mode", () => {
    mocks.isApiMode = false;

    render(<SchoolsPage />);

    expect(screen.getByTestId("platform-school-directory")).toBeInTheDocument();
    expect(screen.queryByTestId("mock-school-directory")).not.toBeInTheDocument();
  });
});
