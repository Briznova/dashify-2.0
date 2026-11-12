import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  refresh: vi.fn(),
  save: vi.fn(),
  deactivate: vi.fn(),
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
  schoolService: {},
}));

vi.mock("@/hooks/use-auth", () => ({
  useAuthSession: () => ({
    session: { permissionKeys: ["staff.manage"] },
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
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("creates a staff profile and links only an existing Teacher account email", async () => {
    render(<StaffDirectory />);

    fireEvent.change(screen.getByLabelText("Employee code"), {
      target: { value: "T-1" },
    });
    fireEvent.change(screen.getByLabelText("First name"), {
      target: { value: "Taylor" },
    });
    fireEvent.change(
      screen.getByLabelText("Existing teacher login email (optional)"),
      { target: { value: "taylor@example.test" } },
    );
    fireEvent.change(screen.getByLabelText("Designation"), {
      target: { value: "Teacher" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Add staff" }));

    await waitFor(() => {
      expect(mocks.save).toHaveBeenCalledWith(
        null,
        expect.objectContaining({
          employeeCode: "T-1",
          firstName: "Taylor",
          accountEmail: "taylor@example.test",
          designation: "Teacher",
        }),
      );
    });
    expect(mocks.refresh).toHaveBeenCalled();
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
