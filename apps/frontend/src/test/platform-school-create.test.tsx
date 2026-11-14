import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createSchool: vi.fn(),
  createAdmin: vi.fn(),
  useAuthSession: vi.fn(),
}));
vi.mock("@/hooks/use-auth", () => ({ useAuthSession: mocks.useAuthSession }));
vi.mock("@/services", () => ({
  isApiMode: true,
  schoolService: { createPlatformSchool: mocks.createSchool },
  schoolAdminService: { create: mocks.createAdmin },
}));

import { PlatformSchoolCreate } from "@/components/platform-school-create";

function enterSchool() {
  fireEvent.change(screen.getByLabelText("School name"), { target: { value: " Example School " } });
  fireEvent.change(screen.getByLabelText("School code"), { target: { value: " EXAMPLE " } });
  fireEvent.click(screen.getByRole("button", { name: "Continue to administrator" }));
}

function enterAdmin() {
  fireEvent.change(screen.getByLabelText("First name"), { target: { value: " Synthetic " } });
  fireEvent.change(screen.getByLabelText("Last name (optional)"), { target: { value: " Admin " } });
  fireEvent.change(screen.getByLabelText("Email"), { target: { value: "ADMIN@example.test" } });
}

describe("platform school and administrator creation", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.useAuthSession.mockReturnValue({
      session: {
        scope: "platform",
        user: { id: "operator", role: "super_admin" },
        permissionKeys: ["platform.schools.read", "platform.schools.create", "platform.school-admins.create"],
      },
      isLoading: false,
      error: null,
      refresh: vi.fn(),
    });
    mocks.createSchool.mockResolvedValue({ id: "school-1", name: "Example School" });
    mocks.createAdmin.mockResolvedValue({ schoolId: "school-1", email: "admin@example.test" });
  });

  it("collects both steps before creating the school and its administrator", async () => {
    render(<PlatformSchoolCreate />);
    enterSchool();
    expect(mocks.createSchool).not.toHaveBeenCalled();
    expect(screen.getByRole("list", { name: /creation steps/i })).toHaveTextContent("School administrator");
    enterAdmin();
    fireEvent.click(screen.getByRole("button", { name: "Create school and administrator" }));
    expect(await screen.findByRole("heading", { name: "School and administrator created" })).toBeInTheDocument();
    expect(mocks.createSchool).toHaveBeenCalledWith({ name: "Example School", code: "EXAMPLE" });
    expect(mocks.createAdmin).toHaveBeenCalledWith("school-1", {
      firstName: "Synthetic", lastName: "Admin", email: "admin@example.test",
    });
    expect(mocks.createSchool.mock.invocationCallOrder[0]).toBeLessThan(mocks.createAdmin.mock.invocationCallOrder[0]);
    expect(screen.getByRole("link", { name: /view school/i })).toHaveAttribute("href", "/dashboard/schools/school-1");
    expect(screen.getByText(/no invitation or email was sent/i)).toBeInTheDocument();
  });

  it("shows a school creation failure without attempting the admin request", async () => {
    mocks.createSchool.mockRejectedValue(new Error("School code already exists."));
    render(<PlatformSchoolCreate />);
    enterSchool();
    enterAdmin();
    fireEvent.click(screen.getByRole("button", { name: "Create school and administrator" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("School code already exists.");
    expect(screen.getByRole("alert")).toHaveTextContent("check the Schools directory");
    expect(mocks.createAdmin).not.toHaveBeenCalled();
  });

  it("retains the created school and retries only administrator creation", async () => {
    mocks.createAdmin.mockRejectedValueOnce(new Error("Default password is not configured."));
    render(<PlatformSchoolCreate />);
    enterSchool();
    enterAdmin();
    fireEvent.click(screen.getByRole("button", { name: "Create school and administrator" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("School created, but the administrator request did not complete");
    expect(screen.getByRole("alert")).toHaveTextContent("verify the account before retrying");
    expect(screen.getByRole("link", { name: /view school/i })).toHaveAttribute("href", "/dashboard/schools/school-1");
    expect(screen.queryByRole("button", { name: "Back" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Retry administrator" }));
    await waitFor(() => expect(mocks.createAdmin).toHaveBeenCalledTimes(2));
    expect(mocks.createSchool).toHaveBeenCalledTimes(1);
    expect(await screen.findByRole("heading", { name: "School and administrator created" })).toBeInTheDocument();
  });

  it("validates school details before allowing the second step", () => {
    render(<PlatformSchoolCreate />);
    fireEvent.change(screen.getByLabelText("School name"), { target: { value: "   " } });
    fireEvent.change(screen.getByLabelText("School code"), { target: { value: "EXAMPLE" } });
    fireEvent.click(screen.getByRole("button", { name: "Continue to administrator" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Enter a school name and code.");
    fireEvent.change(screen.getByLabelText("School name"), { target: { value: "Example School" } });
    fireEvent.change(screen.getByLabelText("School code"), { target: { value: "-INVALID" } });
    fireEvent.click(screen.getByRole("button", { name: "Continue to administrator" }));
    expect(screen.getByRole("alert")).toHaveTextContent("School code must be");
    expect(mocks.createSchool).not.toHaveBeenCalled();
  });

  it("preserves school details when going back and rejects blank administrator names", () => {
    render(<PlatformSchoolCreate />);
    enterSchool();
    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    expect(screen.getByLabelText("School name")).toHaveValue(" Example School ");
    fireEvent.click(screen.getByRole("button", { name: "Continue to administrator" }));
    fireEvent.change(screen.getByLabelText("First name"), { target: { value: "   " } });
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "admin@example.test" } });
    fireEvent.click(screen.getByRole("button", { name: "Create school and administrator" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Enter the administrator's first name and email.");
    expect(mocks.createSchool).not.toHaveBeenCalled();
  });

  it.each([
    ["platform.schools.read", "platform.schools.create"],
    ["platform.schools.read", "platform.school-admins.create"],
  ])("requires both creation permissions", (...permissionKeys) => {
    mocks.useAuthSession.mockReturnValue({
      session: { scope: "platform", user: { id: "operator", role: "super_admin" }, permissionKeys },
      isLoading: false, error: null, refresh: vi.fn(),
    });
    render(<PlatformSchoolCreate />);
    expect(screen.getByRole("alert")).toHaveTextContent("require both platform creation permissions");
    expect(screen.queryByRole("button", { name: "Continue to administrator" })).not.toBeInTheDocument();
    expect(mocks.createSchool).not.toHaveBeenCalled();
  });
});
