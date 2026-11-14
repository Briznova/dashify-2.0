import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { TeacherAssessmentsView } from "@/components/teacher-assessments";
import { TeacherResultsView } from "@/components/teacher-results";

const mocks = vi.hoisted(() => ({
  useAuthSession: vi.fn(),
  useTeacherActions: vi.fn(),
  useTeacherAssessments: vi.fn(),
  useTeacherDashboard: vi.fn(),
  useTeacherResults: vi.fn(),
  useTeacherSections: vi.fn(),
  useTeacherYearSelection: vi.fn(),
  createAssessment: vi.fn(),
  saveResults: vi.fn(),
  refresh: vi.fn(),
}));

vi.mock("@/hooks/use-auth", () => ({
  useAuthSession: mocks.useAuthSession,
}));

vi.mock("@/services", () => ({ isApiMode: false }));

vi.mock("@/hooks/use-school-data", () => ({
  useTeacherActions: mocks.useTeacherActions,
  useTeacherAssessments: mocks.useTeacherAssessments,
  useTeacherDashboard: mocks.useTeacherDashboard,
  useTeacherResults: mocks.useTeacherResults,
  useTeacherSections: mocks.useTeacherSections,
  useTeacherYearSelection: mocks.useTeacherYearSelection,
}));

describe("Teacher assessment and result drafts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
      refresh: mocks.refresh,
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
      refresh: mocks.refresh,
    });
    mocks.useTeacherAssessments.mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
      refresh: mocks.refresh,
    });
    mocks.useTeacherResults.mockReturnValue({
      data: null,
      isLoading: false,
      error: null,
      refresh: mocks.refresh,
    });
    mocks.createAssessment.mockResolvedValue({ id: "assessment-1" });
    mocks.saveResults.mockResolvedValue(true);
    mocks.useTeacherActions.mockReturnValue({
      createAssessment: mocks.createAssessment,
      saveResults: mocks.saveResults,
      publishAssessment: vi.fn(),
      isPending: false,
      error: null,
    });
  });

  it("creates a TEST draft with its scheduled start and duration", async () => {
    render(<TeacherAssessmentsView />);

    fireEvent.click(screen.getByRole("button", { name: /^Test$/ }));
    fireEvent.change(screen.getByLabelText("Test title"), {
      target: { value: "Unit test" },
    });
    fireEvent.change(screen.getByLabelText("Start time"), {
      target: { value: "10:00" },
    });
    fireEvent.change(screen.getByLabelText("Duration (minutes)"), {
      target: { value: "30" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save draft" }));

    await waitFor(() => {
      expect(mocks.createAssessment).toHaveBeenCalledWith(
        expect.objectContaining({
          sectionId: "section-1",
          type: "TEST",
          title: "Unit test",
          dueDate: "2026-04-03",
          startTime: "10:00",
          durationMinutes: 30,
          maxScore: 100,
        }),
      );
    });
  });

  it("saves numeric scores and feedback as an unpublished draft", async () => {
    mocks.useTeacherAssessments.mockReturnValue({
      data: [
        {
          id: "assessment-1",
          sectionId: "section-1",
          academicYearId: "year-1",
          type: "TEST",
          status: "PUBLISHED",
          title: "Unit test",
          description: null,
          dueDate: "2026-04-03",
          startTime: "10:00",
          durationMinutes: 30,
          maxScore: 20,
          passMark: 10,
          publishedAt: "2026-04-03T08:00:00.000Z",
          resultsStatus: "DRAFT",
          className: "Grade 8",
          sectionName: "Section A",
          resultCount: 0,
        },
      ],
      isLoading: false,
      error: null,
      refresh: mocks.refresh,
    });
    mocks.useTeacherResults.mockReturnValue({
      data: {
        assessment: {
          id: "assessment-1",
          title: "Unit test",
          type: "TEST",
          dueDate: "2026-04-03",
          startTime: "10:00",
          durationMinutes: 30,
          maxScore: 20,
          resultsStatus: "DRAFT",
          className: "Grade 8",
          sectionName: "Section A",
        },
        students: [
          {
            studentId: "student-1",
            rollNumber: "01",
            name: "Learner One",
            score: null,
            feedback: null,
            updatedAt: null,
          },
        ],
      },
      isLoading: false,
      error: null,
      refresh: mocks.refresh,
    });

    render(<TeacherResultsView />);

    fireEvent.change(screen.getByLabelText("Score for Learner One"), {
      target: { value: "18" },
    });
    fireEvent.change(screen.getByLabelText("Feedback for Learner One"), {
      target: { value: "Clear explanation." },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save draft" }));

    await waitFor(() => {
      expect(mocks.saveResults).toHaveBeenCalledWith("assessment-1", {
        records: [
          {
            studentId: "student-1",
            score: 18,
            feedback: "Clear explanation.",
          },
        ],
      });
    });
    expect(screen.queryByRole("button", { name: "Publish results" })).toBeNull();
  });
});
