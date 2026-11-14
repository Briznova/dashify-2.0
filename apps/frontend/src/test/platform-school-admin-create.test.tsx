import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  session: { scope: "platform", user: { id: "operator", role: "super_admin" }, permissionKeys: ["platform.schools.read", "platform.school-admins.create"] },
  schools: [{ id: "school-1", name: "Synthetic School", code: "SYN", isActive: true }],
  create: vi.fn(),
}));
vi.mock("@/hooks/use-auth", () => ({ useAuthSession: () => ({ session: mocks.session }) }));
vi.mock("@/hooks/use-school-data", () => ({ usePlatformSchools: () => ({ data: mocks.schools, isLoading: false, error: null }) }));
vi.mock("@/services", () => ({ isApiMode: true, schoolAdminService: { create: mocks.create } }));
import { PlatformSchoolAdminCreate } from "@/components/platform-school-admin-create";
import { PlatformPreview } from "@/components/platform-preview";

describe("school administrator creation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.session.permissionKeys = ["platform.schools.read", "platform.school-admins.create"];
  });
  it("creates an account for the selected school without collecting a password", async () => {
    mocks.create.mockResolvedValue({ id: "user-1", schoolId: "school-1", email: "admin@example.test" });
    render(<PlatformSchoolAdminCreate initialSchoolId="school-1" />);
    fireEvent.change(screen.getByLabelText("First name"), { target: { value: "  Synthetic  " } });
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "Admin@Example.Test" } });
    fireEvent.click(screen.getByRole("button", { name: "Create account" }));
    expect(await screen.findByText(/Account created for admin@example.test/)).toBeInTheDocument();
    expect(mocks.create).toHaveBeenCalledWith("school-1", { firstName: "Synthetic", email: "admin@example.test" });
    expect(screen.queryByLabelText(/password/i)).not.toBeInTheDocument();
  });
  it("requires the separate creation grant", () => {
    mocks.session.permissionKeys = ["platform.schools.read"];
    render(<PlatformSchoolAdminCreate />);
    expect(screen.getByRole("alert")).toHaveTextContent("unavailable");
    expect(mocks.create).not.toHaveBeenCalled();
  });
  it("shows configuration errors instead of claiming an account was created", async () => {
    mocks.create.mockRejectedValue(new Error("Default password is not configured"));
    render(<PlatformSchoolAdminCreate initialSchoolId="school-1" />);
    fireEvent.change(screen.getByLabelText("First name"), { target: { value: "Synthetic" } });
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "admin@example.test" } });
    fireEvent.click(screen.getByRole("button", { name: "Create account" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Default password is not configured");
    expect(screen.queryByText(/Account created for/)).not.toBeInTheDocument();
  });
  it("links setup to the combined school and admin flow without an import preview", () => {
    render(<PlatformPreview page="school-setup" />);
    expect(screen.getByRole("link", { name: /create a school and administrator/i })).toHaveAttribute("href", "/dashboard/schools/new");
    expect(screen.getByRole("status")).toHaveTextContent("setup steps are illustrative");
    expect(screen.queryByText(/csv|bulk import/i)).not.toBeInTheDocument();
  });
});
