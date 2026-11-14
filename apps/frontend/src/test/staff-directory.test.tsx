import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  refresh: vi.fn(),
  save: vi.fn(),
  deactivate: vi.fn(),
  createTeacherAccount: vi.fn(),
  staff: [] as {
    id: string;
    name: string;
    email: string;
    position: string;
    department: string;
    status: "Active" | "Inactive" | "On leave";
    employeeCode?: string | null;
    firstName?: string;
    lastName?: string | null;
  }[],
}));

vi.mock("@/services", () => ({
  isApiMode: true,
  schoolService: { createTeacherAccount: mocks.createTeacherAccount },
}));

vi.mock("@/hooks/use-auth", () => ({
  useAuthSession: () => ({
    session: { scope: "school", activeWorkspaceRole: "school_admin", activeSchool: { id: "school-a" }, permissionKeys: ["staff.manage"] },
  }),
}));

vi.mock("@/hooks/use-school-data", () => ({
  useStaff: () => ({
    data: mocks.staff,
    isLoading: false,
    error: null,
    refresh: mocks.refresh,
  }),
  useSaveStaff: () => ({
    save: mocks.save,
    isPending: false,
    error: null,
  }),
  useDeactivateStaff: () => ({
    deactivate: mocks.deactivate,
    isPending: false,
    error: null,
  }),
  useDepartments: () => ({
    data: [{ id: "department-a", name: "Synthetic Department", isActive: true }],
    isLoading: false, error: null, refresh: vi.fn(),
  }),
}));

import { StaffDirectory } from "@/components/school-dashboard";

describe("StaffDirectory", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.staff = [];
    mocks.save.mockResolvedValue({
      id: "staff-1",
      name: "Taylor Teacher",
      email: "taylor@example.test",
      position: "Teacher",
      department: "Math",
      status: "Active",
    });
    mocks.deactivate.mockResolvedValue(true);
    mocks.createTeacherAccount.mockResolvedValue({ id: "staff-1" });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("creates a linked Teacher login and profile with the selected department", async () => {
    render(<StaffDirectory />);

    fireEvent.change(screen.getByLabelText("Employee code"), {
      target: { value: "T-1" },
    });
    fireEvent.change(screen.getByLabelText("First name"), {
      target: { value: "Taylor" },
    });
    fireEvent.change(
      screen.getByLabelText("Login email"),
      { target: { value: "taylor@example.test" } },
    );
    fireEvent.change(screen.getByLabelText("Initial password"), {
      target: { value: "Synthetic-password-123" },
    });
    fireEvent.change(screen.getByLabelText("Confirm password"), {
      target: { value: "Synthetic-password-123" },
    });
    fireEvent.change(screen.getByLabelText("Department (optional)"), {
      target: { value: "department-a" },
    });
    expect(screen.getByLabelText("Designation")).toHaveValue("Teacher");
    expect(screen.getAllByRole("option", { name: "Teacher" })).toHaveLength(1);
    fireEvent.click(screen.getByRole("button", { name: "Create Teacher account" }));

    await waitFor(() => {
      expect(mocks.createTeacherAccount).toHaveBeenCalledWith(
        expect.objectContaining({
          employeeCode: "T-1",
          firstName: "Taylor",
          email: "taylor@example.test",
          password: "Synthetic-password-123",
          departmentId: "department-a",
        }),
      );
    });
    expect(mocks.refresh).toHaveBeenCalled();
    expect(screen.getByLabelText("Initial password")).toHaveValue("");
    expect(screen.getByLabelText("Confirm password")).toHaveValue("");
    expect(screen.getByRole("status")).toHaveTextContent("Teacher account created");
  });

  it("does not create an account when the passwords differ", async () => {
    render(<StaffDirectory />);
    fireEvent.change(screen.getByLabelText("Employee code"), { target: { value: "T-1" } });
    fireEvent.change(screen.getByLabelText("First name"), { target: { value: "Synthetic" } });
    fireEvent.change(screen.getByLabelText("Login email"), { target: { value: "synthetic@example.test" } });
    fireEvent.change(screen.getByLabelText("Initial password"), { target: { value: "Synthetic-password-123" } });
    fireEvent.change(screen.getByLabelText("Confirm password"), { target: { value: "Different-password-123" } });
    fireEvent.click(screen.getByRole("button", { name: "Create Teacher account" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("passwords do not match");
    expect(mocks.createTeacherAccount).not.toHaveBeenCalled();
  });

  it("requires confirmation before deactivating a staff profile", async () => {
    mocks.staff = [
      {
        id: "staff-1",
        name: "Taylor Teacher",
        email: "taylor@example.test",
        position: "Teacher",
        department: "Math",
        status: "Active",
        employeeCode: "T-1",
      },
    ];
    vi.spyOn(window, "confirm").mockReturnValue(true);
    render(<StaffDirectory />);

    fireEvent.click(
      screen.getByRole("button", { name: "Deactivate" }),
    );

    await waitFor(() => {
      expect(window.confirm).toHaveBeenCalledWith(
        "Deactivate Taylor Teacher? Their Teacher access in this school will be revoked.",
      );
      expect(mocks.deactivate).toHaveBeenCalledWith("staff-1");
    });
    expect(mocks.refresh).toHaveBeenCalled();
  });
});
