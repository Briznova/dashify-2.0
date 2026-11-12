import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { TeacherDashboardView } from "@/components/teacher-dashboard";

const mocks = vi.hoisted(() => ({
  useTeacherDashboard: vi.fn(),
}));

vi.mock("@/hooks/use-school-data", () => ({
  useTeacherDashboard: mocks.useTeacherDashboard,
}));

describe("TeacherDashboardView", () => {
  beforeEach(() => {
    mocks.useTeacherDashboard.mockReturnValue({
      data: {
        schoolId: "school-1",
        schoolName: "North School",
        localDate: "2026-04-03",
        assignments: [
          {
            id: "class-1-section-1",
            classId: "class-1",
            className: "Grade 8",
            sectionId: "section-1",
            sectionName: "Section A",
            subject: "Mathematics",
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
            sessionStatus: null,
            unmarkedCount: null,
          },
        ],
      },
      isLoading: false,
      error: null,
      refresh: vi.fn(),
    });
  });

  it("shows assigned class session status without inventing attendance for missing sessions", () => {
    render(<TeacherDashboardView userName="Avery Johnson" />);

    expect(screen.getByText("Grade 8 · Section A")).toBeInTheDocument();
    expect(screen.getByText("OPEN")).toBeInTheDocument();
    expect(screen.getByText("3 unmarked")).toBeInTheDocument();
    expect(screen.getByText("Grade 9 · Section B")).toBeInTheDocument();
    expect(screen.getByText("No session")).toBeInTheDocument();
    expect(screen.getByText("—")).toBeInTheDocument();
  });
});
