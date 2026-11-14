import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  create: vi.fn(), update: vi.fn(), refresh: vi.fn(),
}));
vi.mock("@/services", () => ({
  schoolService: { createDepartment: mocks.create, updateDepartment: mocks.update },
}));
vi.mock("@/hooks/use-school-data", () => ({
  useDepartments: () => ({
    data: [{ id: "dept-1", name: "Synthetic Department", isActive: true }],
    isLoading: false, error: null, refresh: mocks.refresh,
  }),
}));

import { DepartmentSettings } from "@/components/department-settings";

describe("department settings", () => {
  it("adds, renames and deactivates school departments", async () => {
    mocks.create.mockResolvedValue({});
    mocks.update.mockResolvedValue({});
    vi.spyOn(window, "confirm").mockReturnValue(true);
    render(<DepartmentSettings schoolId="school-a" />);
    fireEvent.change(screen.getByLabelText("Department name"), { target: { value: "New Department" } });
    fireEvent.click(screen.getByRole("button", { name: "Add department" }));
    await waitFor(() => expect(mocks.create).toHaveBeenCalledWith("New Department"));
    fireEvent.click(screen.getByRole("button", { name: "Rename" }));
    fireEvent.change(screen.getByLabelText("Department name"), { target: { value: "Renamed" } });
    fireEvent.click(screen.getByRole("button", { name: "Save department" }));
    await waitFor(() => expect(mocks.update).toHaveBeenCalledWith("dept-1", { name: "Renamed" }));
    fireEvent.click(screen.getByRole("button", { name: "Deactivate" }));
    await waitFor(() => expect(mocks.update).toHaveBeenCalledWith("dept-1", { isActive: false }));
    expect(mocks.refresh).toHaveBeenCalledTimes(3);
    vi.restoreAllMocks();
  });
});
