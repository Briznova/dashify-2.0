import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { TeacherDashboardView } from "@/components/teacher-dashboard";

const mocks = vi.hoisted(() => ({
  useTeacherDashboard: vi.fn(),
  useTeacherYearSelection: vi.fn(),
  useAnnouncements: vi.fn(),
  useAuthSession: vi.fn(),
}));

vi.mock("@/hooks/use-school-data", () => ({
  useTeacherDashboard: mocks.useTeacherDashboard,
  useTeacherYearSelection: mocks.useTeacherYearSelection,
  useAnnouncements: mocks.useAnnouncements,
}));

vi.mock("@/hooks/use-auth", () => ({
  useAuthSession: mocks.useAuthSession,
}));

describe("TeacherDashboardView", () => {
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
    mocks.useAuthSession.mockReturnValue({
      session: { user: { name: "Avery Johnson" } },
    });
    mocks.useTeacherDashboard.mockReturnValue({
      data: {
        schoolId: "school-1",
        schoolName: "North School",
        localDate: "2026-04-03",
        academicYearName: "2025-26",
        assignments: [
          {
            id: "class-1-section-1",
            classId: "class-1",
            className: "Grade 8",
            sectionId: "section-1",
            sectionName: "Section A",
            subject: "Mathematics",
            isClassTeacher: true,
            classTeacherName: "Avery Johnson",
            studentCount: 12,
            sessionStatus: "OPEN",
            unmarkedCount: 3,
          },
          {
            id: "class-2-section-2",
            classId: "class-2",
            className: "Grade 9",
            sectionId: "section-2",
            sectionName: "Section B",
            subject: null,
            isClassTeacher: false,
            classTeacherName: null,
            studentCount: 0,
            sessionStatus: null,
            unmarkedCount: null,
          },
        ],
      },
      isLoading: false,
      error: null,
      refresh: vi.fn(),
    });
    mocks.useAnnouncements.mockReturnValue({
      data: [
        {
          id: "notice-1",
          title: "Term begins Monday",
          body: "Please review the updated schedule.",
          status: "PUBLISHED",
          publishedAt: "2026-04-03T08:00:00.000Z",
          createdAt: "2026-04-03T07:45:00.000Z",
        },
      ],
      isLoading: false,
      error: null,
      refresh: vi.fn(),
    });
  });

  it("shows assigned classes and the design's four teacher task links", () => {
    render(<TeacherDashboardView userName="Avery Johnson" />);

    expect(
      screen.getByRole("heading", { name: "Good morning, Avery" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Working class" })).toHaveValue(
      "class-1-section-1",
    );
    expect(
      screen.getByRole("option", { name: "Grade 9 · Section B" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Mathematics · Attendance open")).toBeInTheDocument();
    expect(screen.getByText("12")).toBeInTheDocument();
    expect(screen.getByText("students enrolled")).toBeInTheDocument();
    expect(screen.getByText("Term begins Monday")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "What would you like to do?" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /Take attendance/ }),
    ).toHaveAttribute("href", "/dashboard/teacher/attendance");
    expect(
      screen.getByRole("link", { name: /Create assignment/ }),
    ).toHaveAttribute("href", "/dashboard/teacher/assessments");
    expect(
      screen.getByRole("link", { name: /Create exam or test/ }),
    ).toHaveAttribute("href", "/dashboard/teacher/assessments");
    expect(
      screen.getByRole("link", { name: /Update student scores/ }),
    ).toHaveAttribute("href", "/dashboard/teacher/results");
  });

  it("switches the working class and shows its real enrollment count", () => {
    render(<TeacherDashboardView userName="Avery Johnson" />);

    fireEvent.change(screen.getByRole("combobox", { name: "Working class" }), {
      target: { value: "class-2-section-2" },
    });

    expect(screen.getByRole("combobox", { name: "Working class" })).toHaveValue(
      "class-2-section-2",
    );
    expect(screen.getByText("0")).toBeInTheDocument();
    expect(screen.getByText("students enrolled")).toBeInTheDocument();
  });

  it("labels an unavailable enrollment count instead of showing zero", () => {
    mocks.useTeacherDashboard.mockReturnValue({
      data: {
        schoolId: "school-1",
        schoolName: "North School",
        localDate: "2026-04-03",
        academicYearName: null,
        assignments: [
          {
            id: "class-1-section-1",
            classId: "class-1",
            className: "Grade 8",
            sectionId: "section-1",
            sectionName: "Section A",
            subject: "Mathematics",
            isClassTeacher: false,
            classTeacherName: null,
            studentCount: null,
            sessionStatus: null,
            unmarkedCount: null,
          },
        ],
      },
      isLoading: false,
      error: null,
      refresh: vi.fn(),
    });

    render(<TeacherDashboardView />);

    expect(screen.getByText("—")).toBeInTheDocument();
    expect(screen.getByText("enrollment count unavailable")).toBeInTheDocument();
  });
});
