import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  create: vi.fn(),
  push: vi.fn(),
  useAuthSession: vi.fn(),
}));
vi.mock("@/hooks/use-auth", () => ({ useAuthSession: mocks.useAuthSession }));
vi.mock("@/services", () => ({ isApiMode: true, schoolService: { createPlatformSchool: mocks.create } }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: mocks.push }) }));

import { PlatformSchoolCreate } from "@/components/platform-school-create";

describe("platform school creation", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.useAuthSession.mockReturnValue({
      session: {
        scope: "platform",
        user: { role: "super_admin" },
        permissionKeys: ["platform.schools.read", "platform.schools.create"],
      },
      isLoading: false,
      error: null,
      refresh: vi.fn(),
    });
  });

  it("submits school identity and opens the returned school detail", async () => {
    mocks.create.mockResolvedValue({ id: "school-1" });
    render(<PlatformSchoolCreate />);
    fireEvent.change(screen.getByLabelText("School name"), { target: { value: " Example School " } });
    fireEvent.change(screen.getByLabelText("School code"), { target: { value: " EXAMPLE " } });
    fireEvent.click(screen.getByRole("button", { name: "Create school" }));
    await waitFor(() => expect(mocks.create).toHaveBeenCalledWith({ name: "Example School", code: "EXAMPLE" }));
    expect(mocks.push).toHaveBeenCalledWith("/dashboard/schools/school-1");
    expect(screen.getByText(/invitation is a separate step/i)).toBeInTheDocument();
  });

  it("shows a server error without navigating", async () => {
    mocks.create.mockRejectedValue(new Error("School code already exists."));
    render(<PlatformSchoolCreate />);
    fireEvent.change(screen.getByLabelText("School name"), { target: { value: "Example School" } });
    fireEvent.change(screen.getByLabelText("School code"), { target: { value: "EXAMPLE" } });
    fireEvent.click(screen.getByRole("button", { name: "Create school" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("School code already exists.");
    expect(mocks.push).not.toHaveBeenCalled();
  });

  it("rejects whitespace-only inputs before calling the service", async () => {
    render(<PlatformSchoolCreate />);
    fireEvent.change(screen.getByLabelText("School name"), { target: { value: "   " } });
    fireEvent.change(screen.getByLabelText("School code"), { target: { value: "EXAMPLE" } });
    fireEvent.click(screen.getByRole("button", { name: "Create school" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Enter a school name and code.");
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it("rejects malformed school codes before calling the service", async () => {
    render(<PlatformSchoolCreate />);
    fireEvent.change(screen.getByLabelText("School name"), { target: { value: "Example School" } });
    fireEvent.change(screen.getByLabelText("School code"), { target: { value: "-INVALID" } });
    fireEvent.click(screen.getByRole("button", { name: "Create school" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("School code must be");
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it("does not display a form without the explicit platform permission", () => {
    mocks.useAuthSession.mockReturnValue({
      session: { scope: "platform", user: { role: "super_admin" }, permissionKeys: ["platform.schools.read"] },
      isLoading: false,
      error: null,
      refresh: vi.fn(),
    });
    render(<PlatformSchoolCreate />);
    expect(screen.getByRole("alert")).toHaveTextContent("unavailable");
    expect(screen.queryByRole("button", { name: "Create school" })).not.toBeInTheDocument();
    expect(mocks.create).not.toHaveBeenCalled();
  });
});
