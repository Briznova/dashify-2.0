import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ get: vi.fn(), complete: vi.fn() }));
vi.mock("@/services", () => ({ schoolOnboardingService: mocks }));
import { SchoolOnboarding } from "@/components/school-onboarding";

describe("school onboarding", () => {
  beforeEach(() => vi.clearAllMocks());

  it("shows unmet prerequisites and prevents confirmation", async () => {
    mocks.get.mockResolvedValue({ status: "NOT_STARTED", prerequisites: { academicYear: true, classWithSection: false } });
    render(<SchoolOnboarding />);
    expect(await screen.findByText(/Active class with an active section: Required/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Confirm school setup" })).toBeDisabled();
    expect(mocks.complete).not.toHaveBeenCalled();
  });

  it("confirms when both prerequisites are ready", async () => {
    mocks.get.mockResolvedValue({ status: null, prerequisites: { academicYear: true, classWithSection: true } });
    mocks.complete.mockResolvedValue({ status: "COMPLETED", prerequisites: { academicYear: true, classWithSection: true } });
    render(<SchoolOnboarding />);
    fireEvent.click(await screen.findByRole("button", { name: "Confirm school setup" }));
    expect(await screen.findByText("Setup confirmed by a School Admin.")).toBeInTheDocument();
    expect(mocks.complete).toHaveBeenCalledTimes(1);
  });

  it("surfaces a rejected confirmation and allows a fresh read", async () => {
    mocks.get.mockResolvedValue({ status: "NOT_STARTED", prerequisites: { academicYear: true, classWithSection: true } });
    mocks.complete.mockRejectedValue(new Error("Prerequisites changed"));
    render(<SchoolOnboarding />);
    fireEvent.click(await screen.findByRole("button", { name: "Confirm school setup" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Prerequisites changed");
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByRole("button", { name: "Confirm school setup" })).toBeEnabled();
    expect(mocks.get).toHaveBeenCalledTimes(2);
  });
});
