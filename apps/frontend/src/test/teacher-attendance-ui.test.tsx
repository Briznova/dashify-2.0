import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { TeacherAttendanceView } from "@/components/teacher-attendance";

const mocks = vi.hoisted(() => ({
  useAuthSession: vi.fn(),
  useTeacherActions: vi.fn(),
  useTeacherAttendance: vi.fn(),
  useTeacherDashboard: vi.fn(),
  useTeacherSections: vi.fn(),
  useTeacherYearSelection: vi.fn(),
  saveAttendanceDraft: vi.fn(),
}));

vi.mock("@/hooks/use-auth", () => ({
  useAuthSession: mocks.useAuthSession,
}));

vi.mock("@/services", () => ({
  isApiMode: false,
}));

vi.mock("@/hooks/use-school-data", () => ({
  useTeacherActions: mocks.useTeacherActions,
  useTeacherAttendance: mocks.useTeacherAttendance,
  useTeacherDashboard: mocks.useTeacherDashboard,
  useTeacherSections: mocks.useTeacherSections,
  useTeacherYearSelection: mocks.useTeacherYearSelection,
}));

describe("TeacherAttendanceView", () => {
  beforeEach(() => {
    const activeYear = {
      id: "year-1",
      name: "2025-26",
      status: "ACTIVE",
      startDate: "2026-01-01",
      endDate: "2026-12-31",
    };
    mocks.useTeacherYearSelection.mockReturnValue({
      years: {
        data: [activeYear],
        isLoading: false,
        error: null,
        refresh: vi.fn(),
      },
      selectedYear: activeYear,
      selectedYearId: activeYear.id,
      setSelectedYearId: vi.fn(),
      isReadOnly: false,
    });
    mocks.useAuthSession.mockReturnValue({ session: null });
    mocks.useTeacherDashboard.mockReturnValue({
      data: { localDate: "2026-04-03" },
      isLoading: false,
      error: null,
      refresh: vi.fn(),
    });
    mocks.useTeacherSections.mockReturnValue({
      data: {
        academicYearId: "year-1",
        academicYearName: "2025-26",
        sections: [
          {
            id: "section-1",
            name: "Section A",
            classId: "class-1",
            className: "Grade 8",
            subject: "Mathematics",
          },
        ],
      },
      isLoading: false,
      error: null,
      refresh: vi.fn(),
    });
    mocks.useTeacherAttendance.mockReturnValue({
      data: {
        section: {
          id: "section-1",
          name: "Section A",
          classId: "class-1",
          className: "Grade 8",
        },
        date: "2026-04-03",
        status: null,
        canEdit: true,
        students: [
          {
            studentId: "student-1",
            rollNumber: "01",
            name: "Sample Student One",
            status: null,
            remarks: null,
          },
          {
            studentId: "student-2",
            rollNumber: "02",
            name: "Sample Student Two",
            status: null,
            remarks: null,
          },
        ],
      },
      isLoading: false,
      error: null,
      refresh: vi.fn(),
    });
    mocks.saveAttendanceDraft.mockResolvedValue(true);
    mocks.useTeacherActions.mockReturnValue({
      isPending: false,
      error: null,
      saveAttendanceDraft: mocks.saveAttendanceDraft,
    });
  });

  it("saves a partial attendance draft with a per-student remark", async () => {
    render(<TeacherAttendanceView />);

    expect(
      screen.getByRole("button", {
        name: "Mark Sample Student One present",
      }),
    ).toHaveAttribute("aria-pressed", "false");
    fireEvent.click(
      screen.getByRole("button", { name: "Mark Sample Student One present" }),
    );
    fireEvent.change(
      screen.getByLabelText("Optional remark for Sample Student One"),
      { target: { value: "Arrived on time" } },
    );
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));

    await waitFor(() => {
      expect(mocks.saveAttendanceDraft).toHaveBeenCalledWith({
        academicYearId: "year-1",
        sectionId: "section-1",
        date: "2026-04-03",
        records: [{ studentId: "student-1", status: "PRESENT", remarks: "Arrived on time" }],
      });
    });
  });
});
