import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from "@nestjs/common";
import { TeacherAssessmentType } from "@prisma/client";
import { PrismaService } from "../../infrastructure/database/prisma.service";
import { TeacherWorkspaceService } from "./teacher-workspace.service";

describe("TeacherWorkspaceService", () => {
  const schoolId = "school-1";
  const userId = "teacher-user-1";
  const staffId = "teacher-profile-1";
  const sectionId = "section-1";
  const studentId = "student-1";
  const academicYearId = "year-1";
  const academicYear = {
    id: academicYearId,
    name: "2025-26",
    startDate: new Date("2025-04-01T00:00:00.000Z"),
    endDate: new Date("2027-03-31T00:00:00.000Z"),
    status: "ACTIVE",
  };

  const section = {
    id: sectionId,
    name: "Section A",
    classId: "class-1",
    class: { name: "Grade 8" },
  };
  const roster = [
    {
      studentId,
      rollNumber: "01",
      student: { firstName: "Learner", lastName: "One" },
    },
    {
      studentId: "student-2",
      rollNumber: "02",
      student: { firstName: "Learner", lastName: "Two" },
    },
  ];

  let service: TeacherWorkspaceService;
  let tx: {
    school: { findFirst: jest.Mock };
    academicYear: { findMany: jest.Mock; findFirst: jest.Mock };
    staffProfile: { findMany: jest.Mock };
    teacherAssignment: { findMany: jest.Mock };
    section: { findMany: jest.Mock };
    studentEnrolment: { findMany: jest.Mock; groupBy: jest.Mock };
    attendanceSession: {
      findUnique: jest.Mock;
      create: jest.Mock;
      updateMany: jest.Mock;
    };
    attendanceRecord: {
      findMany: jest.Mock;
      count: jest.Mock;
      upsert: jest.Mock;
    };
    teacherAssessment: {
      findMany: jest.Mock;
      findFirst: jest.Mock;
      findFirstOrThrow: jest.Mock;
      create: jest.Mock;
      updateMany: jest.Mock;
    };
    teacherResult: {
      findMany: jest.Mock;
      count: jest.Mock;
      upsert: jest.Mock;
    };
    gradeScale: { findFirst: jest.Mock };
    auditLog: { create: jest.Mock };
  };
  let withTenant: jest.Mock;

  beforeEach(() => {
    tx = {
      school: {
        findFirst: jest.fn().mockResolvedValue({ timezone: "Asia/Kolkata" }),
      },
      academicYear: {
        findMany: jest.fn().mockResolvedValue([academicYear]),
        findFirst: jest.fn().mockResolvedValue(academicYear),
      },
      staffProfile: {
        findMany: jest.fn().mockResolvedValue([{ id: staffId }]),
      },
      teacherAssignment: {
        findMany: jest.fn().mockImplementation(({ where }) =>
          Promise.resolve(
            where.staffId
              ? [
                  {
                    classId: section.classId,
                    sectionId,
                    subject: "Math",
                    isClassTeacher: false,
                  },
                ]
              : [],
          ),
        ),
      },
      section: { findMany: jest.fn().mockResolvedValue([section]) },
      studentEnrolment: {
        findMany: jest.fn().mockResolvedValue(roster),
        groupBy: jest.fn().mockResolvedValue([]),
      },
      attendanceSession: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({ id: "session-1" }),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      attendanceRecord: {
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(1),
        upsert: jest.fn().mockResolvedValue({}),
      },
      teacherAssessment: {
        findMany: jest.fn().mockResolvedValue([]),
        findFirst: jest.fn(),
        findFirstOrThrow: jest.fn(),
        create: jest.fn(),
        updateMany: jest.fn(),
      },
      teacherResult: {
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(1),
        upsert: jest.fn().mockResolvedValue({}),
      },
      gradeScale: { findFirst: jest.fn().mockResolvedValue(null) },
      auditLog: { create: jest.fn().mockResolvedValue({}) },
    };
    withTenant = jest.fn(
      (_id: string, work: (transaction: typeof tx) => Promise<unknown>) =>
        work(tx),
    );
    service = new TeacherWorkspaceService({
      withTenant,
    } as unknown as PrismaService);
  });

  it("lists only active assigned sections using the authenticated teacher profile", async () => {
    await expect(service.listSections(schoolId, userId)).resolves.toEqual({
      academicYear: {
        id: academicYearId,
        name: academicYear.name,
        status: academicYear.status,
      },
      sections: [
        {
          id: section.id,
          name: section.name,
          classId: section.classId,
          className: section.class.name,
          subject: "Math",
          isClassTeacher: false,
          classTeacherName: null,
          studentCount: 0,
        },
      ],
    });

    expect(withTenant).toHaveBeenCalledWith(schoolId, expect.any(Function));
    expect(tx.staffProfile.findMany).toHaveBeenCalledWith({
      where: { schoolId, userId, isActive: true },
      select: { id: true },
      take: 2,
    });
    expect(tx.teacherAssignment.findMany).toHaveBeenCalledWith({
      where: { schoolId, staffId, isActive: true },
      select: {
        classId: true,
        sectionId: true,
        subject: true,
        isClassTeacher: true,
      },
    });
    expect(tx.section.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          schoolId,
          isActive: true,
          OR: [{ id: sectionId, classId: section.classId }],
        }),
      }),
    );
  });

  it("saves a partial current-day attendance draft with remarks and audits only the record count", async () => {
    jest.useFakeTimers().setSystemTime(new Date("2026-04-03T08:30:00.000Z"));
    try {
      await expect(
        service.saveAttendanceDraft(schoolId, userId, {
          academicYearId,
          sectionId,
          date: "2026-04-03",
          records: [{ studentId, status: "ABSENT", remarks: "Late arrival" }],
        }),
      ).resolves.toEqual({
        sessionId: "session-1",
        sectionId,
        date: "2026-04-03",
        recordCount: 1,
        status: "DRAFT",
      });

      expect(tx.attendanceSession.create).toHaveBeenCalledWith({
        data: {
          schoolId,
          classId: section.classId,
          sectionId,
          date: new Date("2026-04-03T00:00:00.000Z"),
          status: "DRAFT",
          createdBy: userId,
        },
        select: { id: true },
      });
      expect(tx.attendanceRecord.upsert).toHaveBeenCalledWith({
        where: {
          sessionId_studentId: { sessionId: "session-1", studentId },
        },
        create: {
          schoolId,
          sessionId: "session-1",
          studentId,
          status: "ABSENT",
          remarks: "Late arrival",
          markedBy: userId,
        },
        update: expect.objectContaining({
          status: "ABSENT",
          remarks: "Late arrival",
          markedBy: userId,
        }),
      });
      expect(tx.auditLog.create).toHaveBeenCalledWith({
        data: {
          schoolId,
          actorUserId: userId,
          action: "TEACHER_ATTENDANCE_DRAFT_SAVED",
          resource: "attendance_session",
          resourceId: "session-1",
          summary: { recordCount: 1 },
        },
      });
      expect(JSON.stringify(tx.auditLog.create.mock.calls[0][0])).not.toContain(
        "Learner",
      );
    } finally {
      jest.useRealTimers();
    }
  });

  it("rejects attendance records outside the roster before creating a draft", async () => {
    jest.useFakeTimers().setSystemTime(new Date("2026-04-03T08:30:00.000Z"));
    try {
      await expect(
        service.saveAttendanceDraft(schoolId, userId, {
          academicYearId,
          sectionId,
          date: "2026-04-03",
          records: [{ studentId: "not-enrolled", status: "PRESENT" }],
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(tx.attendanceSession.create).not.toHaveBeenCalled();
      expect(tx.attendanceRecord.upsert).not.toHaveBeenCalled();
      expect(tx.auditLog.create).not.toHaveBeenCalled();
    } finally {
      jest.useRealTimers();
    }
  });

  it("rejects attendance for a date outside the school's current local day", async () => {
    jest.useFakeTimers().setSystemTime(new Date("2026-04-03T08:30:00.000Z"));
    try {
      await expect(
        service.saveAttendanceDraft(schoolId, userId, {
          academicYearId,
          sectionId,
          date: "2026-04-02",
          records: [
            { studentId, status: "PRESENT" },
            { studentId: "student-2", status: "PRESENT" },
          ],
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(tx.attendanceSession.create).not.toHaveBeenCalled();
    } finally {
      jest.useRealTimers();
    }
  });

  it("updates only the authenticated Teacher's attendance draft", async () => {
    jest.useFakeTimers().setSystemTime(new Date("2026-04-03T08:30:00.000Z"));
    tx.attendanceSession.findUnique.mockResolvedValue({
      id: "session-1",
      status: "DRAFT",
      createdBy: userId,
    });
    try {
      await expect(
        service.saveAttendanceDraft(schoolId, userId, {
          academicYearId,
          sectionId,
          date: "2026-04-03",
          records: [{ studentId, status: "LATE" }],
        }),
      ).resolves.toMatchObject({ sessionId: "session-1", status: "DRAFT" });
      expect(tx.attendanceSession.create).not.toHaveBeenCalled();
      expect(tx.attendanceRecord.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            sessionId_studentId: { sessionId: "session-1", studentId },
          },
        }),
      );
    } finally {
      jest.useRealTimers();
    }
  });

  it("rejects edits to another Teacher's attendance draft", async () => {
    jest.useFakeTimers().setSystemTime(new Date("2026-04-03T08:30:00.000Z"));
    tx.attendanceSession.findUnique.mockResolvedValue({
      id: "session-1",
      status: "DRAFT",
      createdBy: "another-teacher",
    });
    try {
      await expect(
        service.saveAttendanceDraft(schoolId, userId, {
          academicYearId,
          sectionId,
          date: "2026-04-03",
          records: [{ studentId, status: "PRESENT" }],
        }),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(tx.attendanceRecord.upsert).not.toHaveBeenCalled();
    } finally {
      jest.useRealTimers();
    }
  });

  it("does not disclose a section that is not actively assigned", async () => {
    tx.teacherAssignment.findMany.mockResolvedValue([]);

    await expect(
      service.getAttendance(schoolId, userId, {
        academicYearId,
        sectionId: "foreign-section",
        date: "2026-04-03",
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(tx.studentEnrolment.findMany).not.toHaveBeenCalled();
  });

  it("requires a valid time and duration when creating a test", async () => {
    jest.useFakeTimers().setSystemTime(new Date("2026-04-03T08:30:00.000Z"));
    try {
      await expect(
        service.createAssessment(schoolId, userId, {
          academicYearId,
          sectionId,
          type: TeacherAssessmentType.TEST,
          title: "Unit test",
          dueDate: "2026-04-03",
          maxScore: 20,
          passMark: 10,
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(tx.teacherAssessment.create).not.toHaveBeenCalled();
    } finally {
      jest.useRealTimers();
    }
  });

  it("rejects result scores over the assessment maximum before any upsert", async () => {
    tx.teacherAssessment.findFirst.mockResolvedValue({
      id: "assessment-1",
      status: "PUBLISHED",
      dueDate: new Date("2026-04-03T00:00:00.000Z"),
      startTime: null,
      durationMinutes: null,
      resultsPublishedAt: null,
      maxScore: 20,
      sectionId,
      class: { name: "Grade 8" },
      section: { name: "Section A" },
    });

    await expect(
      service.saveResults(schoolId, userId, "assessment-1", {
        records: [{ studentId, score: 21 }],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(tx.teacherResult.upsert).not.toHaveBeenCalled();
    expect(tx.auditLog.create).not.toHaveBeenCalled();
  });

  it("saves scores with a redacted audit summary", async () => {
    tx.teacherAssessment.findFirst.mockResolvedValue({
      id: "assessment-1",
      status: "PUBLISHED",
      dueDate: new Date("2026-04-03T00:00:00.000Z"),
      startTime: null,
      durationMinutes: null,
      resultsPublishedAt: null,
      maxScore: 20,
      sectionId,
      class: { name: "Grade 8" },
      section: { name: "Section A" },
    });

    await expect(
      service.saveResults(schoolId, userId, "assessment-1", {
        records: [{ studentId, score: 18 }],
      }),
    ).resolves.toEqual({ assessmentId: "assessment-1", savedCount: 1 });
    expect(tx.teacherResult.upsert).toHaveBeenCalledWith({
      where: {
        assessmentId_studentId: {
          assessmentId: "assessment-1",
          studentId,
        },
      },
      create: {
        schoolId,
        assessmentId: "assessment-1",
        studentId,
        score: 18,
        feedback: null,
        updatedBy: userId,
      },
      update: {
        score: 18,
        feedback: null,
        updatedBy: userId,
      },
    });
    expect(tx.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        summary: { recordCount: 1 },
      }),
    });
    expect(JSON.stringify(tx.auditLog.create.mock.calls[0][0])).not.toContain(
      studentId,
    );
    expect(JSON.stringify(tx.auditLog.create.mock.calls[0][0])).not.toContain(
      "18",
    );
  });

  it("saves optional result feedback without exposing it in audit summaries", async () => {
    tx.teacherAssessment.findFirst.mockResolvedValue({
      id: "assessment-1",
      status: "PUBLISHED",
      dueDate: new Date("2026-04-03T00:00:00.000Z"),
      startTime: null,
      durationMinutes: null,
      resultsPublishedAt: null,
      maxScore: 20,
      sectionId,
      class: { name: "Grade 8" },
      section: { name: "Section A" },
    });

    await service.saveResults(schoolId, userId, "assessment-1", {
      records: [{ studentId, score: 18, feedback: "Clear explanation." }],
    });

    expect(tx.teacherResult.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          score: 18,
          feedback: "Clear explanation.",
        }),
      }),
    );
    expect(JSON.stringify(tx.auditLog.create.mock.calls[0][0])).not.toContain(
      "Clear explanation",
    );
  });

});
