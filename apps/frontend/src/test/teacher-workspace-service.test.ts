import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiClient, ApiError } from "@/services/api-client";
import { HttpSchoolService } from "@/services/http/http-school-service";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("HttpSchoolService teacher workspace", () => {
  it("maps section, attendance, assessment, and result endpoints", async () => {
    const section = {
      id: "section-1",
      name: "Section A",
      classId: "class-1",
      className: "Grade 8",
      subject: "Mathematics",
      isClassTeacher: true,
      classTeacherName: "Teacher One",
      studentCount: 1,
    };
    const academicYear = {
      id: "year-1",
      name: "2025-26",
      startDate: "2025-04-01T00:00:00.000Z",
      endDate: "2026-03-31T00:00:00.000Z",
      status: "ACTIVE",
    };
    const assessment = {
      id: "assessment-1",
      sectionId: section.id,
      type: "TEST",
      status: "DRAFT",
      title: "Practice",
      description: null,
      dueDate: "2026-04-03",
      startTime: "09:30",
      durationMinutes: 45,
      maxScore: 20,
      passMark: 10,
      academicYearId: academicYear.id,
      publishedAt: null,
      resultsStatus: "DRAFT",
      className: "Grade 8",
      sectionName: "Section A",
      resultCount: 0,
    };
    const responses: unknown[] = [
      { academicYear: { id: academicYear.id, name: academicYear.name, status: "ACTIVE" }, sections: [section] },
      {
        academicYear: { id: academicYear.id, name: academicYear.name, status: "ACTIVE" },
        section: {
          id: section.id,
          name: section.name,
          classId: section.classId,
          className: section.className,
        },
        date: "2026-04-03",
        status: null,
        canEdit: true,
        students: [
          {
            studentId: "student-1",
            rollNumber: "01",
            name: "Learner One",
            status: null,
            remarks: null,
          },
        ],
      },
      {
        sessionId: "attendance-draft-1",
        sectionId: section.id,
        date: "2026-04-03",
        recordCount: 1,
        status: "DRAFT",
      },
      {
        sessionId: "attendance-draft-1",
        sectionId: section.id,
        date: "2026-04-03",
        recordCount: 1,
        status: "SUBMITTED",
      },
      [assessment],
      assessment,
      { ...assessment, status: "PUBLISHED", publishedAt: "2026-04-01T10:00:00.000Z" },
      {
        assessment: {
          id: assessment.id,
          title: assessment.title,
          type: assessment.type,
          dueDate: assessment.dueDate,
          startTime: assessment.startTime,
          durationMinutes: assessment.durationMinutes,
          maxScore: assessment.maxScore,
          passMark: assessment.passMark,
          academicYearId: assessment.academicYearId,
          resultsStatus: "PUBLISHED",
          className: assessment.className,
          sectionName: assessment.sectionName,
          academicYearName: academicYear.name,
          resultsPublishedAt: "2026-04-03T08:00:00.000Z",
          gradesConfigured: false,
        },
        students: [
          {
            studentId: "student-1",
            rollNumber: "01",
            name: "Learner One",
            score: null,
            feedback: null,
            updatedAt: null,
            passed: null,
            grade: null,
          },
        ],
      },
      { assessmentId: assessment.id, savedCount: 1 },
      {
        assessmentId: assessment.id,
        resultsStatus: "PUBLISHED",
        publishedCount: 1,
      },
    ];
    const fetchMock = vi.fn().mockImplementation(async () => {
      const body = responses.shift();
      return new Response(JSON.stringify(body), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      });
    });
    vi.stubGlobal("fetch", fetchMock);
    const service = new HttpSchoolService(
      new ApiClient("https://dashify.test/api/v1"),
    );

    await expect(service.getTeacherSections(academicYear.id)).resolves.toEqual({
      academicYear: { id: academicYear.id, name: academicYear.name, status: "ACTIVE" },
      sections: [section],
    });
    await expect(
      service.getTeacherAttendance(academicYear.id, section.id, "2026-04-03"),
    ).resolves.toMatchObject({
      section: { id: section.id, className: "Grade 8" },
      status: null,
      canEdit: true,
      students: [{ studentId: "student-1", status: null, remarks: null }],
    });
    await expect(
      service.saveTeacherAttendanceDraft({
        academicYearId: academicYear.id,
        sectionId: section.id,
        date: "2026-04-03",
        records: [{ studentId: "student-1", status: "PRESENT", remarks: "On time" }],
      }),
    ).resolves.toMatchObject({ status: "DRAFT", recordCount: 1 });
    await expect(
      service.submitTeacherAttendance({
        academicYearId: academicYear.id,
        sectionId: section.id,
        date: "2026-04-03",
      }),
    ).resolves.toMatchObject({ status: "SUBMITTED", recordCount: 1 });
    await expect(service.getTeacherAssessments(academicYear.id)).resolves.toEqual([assessment]);
    await expect(
      service.createTeacherAssessment({
        academicYearId: academicYear.id,
        sectionId: section.id,
        type: "TEST",
        title: "Unit test",
        dueDate: "2026-04-03",
        startTime: "09:30",
        durationMinutes: 45,
        maxScore: 20,
        passMark: 10,
      }),
    ).resolves.toEqual(assessment);
    await expect(service.publishTeacherAssessment(assessment.id)).resolves.toMatchObject({
      id: assessment.id,
      status: "PUBLISHED",
    });
    await expect(service.getTeacherResults(assessment.id)).resolves.toMatchObject({
      assessment: { id: assessment.id, maxScore: 20 },
      students: [{ studentId: "student-1", score: null, feedback: null }],
    });
    await expect(
      service.saveTeacherResults(assessment.id, {
        records: [
          { studentId: "student-1", score: 18, feedback: "Strong work." },
        ],
      }),
    ).resolves.toEqual({ assessmentId: assessment.id, savedCount: 1 });
    await expect(
      service.publishTeacherResults(assessment.id),
    ).resolves.toEqual({
      assessmentId: assessment.id,
      resultsStatus: "PUBLISHED",
      publishedCount: 1,
    });

    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      `https://dashify.test/api/v1/teacher/attendance?academicYearId=${academicYear.id}&sectionId=section-1&date=2026-04-03`,
      expect.objectContaining({ credentials: "include" }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      3,
      "https://dashify.test/api/v1/teacher/attendance/draft",
      expect.objectContaining({
        method: "PUT",
        body: JSON.stringify({
          academicYearId: academicYear.id,
          sectionId: section.id,
          date: "2026-04-03",
          records: [
            { studentId: "student-1", status: "PRESENT", remarks: "On time" },
          ],
        }),
      }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      6,
      "https://dashify.test/api/v1/teacher/assessments",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          academicYearId: academicYear.id,
          sectionId: section.id,
          type: "TEST",
          title: "Unit test",
          dueDate: "2026-04-03",
          startTime: "09:30",
          durationMinutes: 45,
          maxScore: 20,
          passMark: 10,
        }),
      }),
    );
  });

  it("rejects a result response whose score exceeds the assessment maximum", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            assessment: {
              id: "assessment-1",
              title: "Practice",
              type: "ASSIGNMENT",
              dueDate: "2026-04-03",
              startTime: null,
              durationMinutes: null,
              maxScore: 20,
              resultsStatus: "DRAFT",
              className: "Grade 8",
              sectionName: "Section A",
            },
            students: [
              {
                studentId: "student-1",
                rollNumber: null,
                name: "Learner One",
                score: 21,
                feedback: null,
                updatedAt: "2026-04-03T10:00:00.000Z",
              },
            ],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      ),
    );
    const service = new HttpSchoolService(
      new ApiClient("https://dashify.test/api/v1"),
    );

    await expect(service.getTeacherResults("assessment-1")).rejects.toBeInstanceOf(
      ApiError,
    );
  });
});
