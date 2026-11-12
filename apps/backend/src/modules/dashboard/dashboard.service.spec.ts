import { Prisma } from "@prisma/client";
import { ForbiddenException, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../infrastructure/database/prisma.service";
import { DashboardService } from "./dashboard.service";

describe("DashboardService school-admin dashboard", () => {
  const schoolId = "school-1";
  const transaction = {
    school: { findFirst: jest.fn() },
    student: { count: jest.fn() },
    staffProfile: { count: jest.fn(), findMany: jest.fn() },
    schoolClass: { count: jest.fn() },
    section: { count: jest.fn() },
    $queryRaw: jest.fn(),
  };
  const withTenant = jest.fn(
    (_schoolId: string, work: (tx: typeof transaction) => Promise<unknown>) =>
      work(transaction),
  );
  const service = new DashboardService({
    withTenant,
  } as unknown as PrismaService);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns current counts scoped to the active school", async () => {
    transaction.school.findFirst.mockResolvedValue({
      id: schoolId,
      name: "Synthetic School",
    });
    transaction.student.count.mockResolvedValue(24);
    transaction.staffProfile.count.mockResolvedValue(5);
    transaction.schoolClass.count.mockResolvedValue(4);
    transaction.section.count.mockResolvedValue(8);

    await expect(service.getSchoolAdminDashboard(schoolId)).resolves.toEqual({
      schoolId,
      schoolName: "Synthetic School",
      activeStudentCount: 24,
      activeStaffCount: 5,
      activeClassCount: 4,
      activeSectionCount: 8,
    });

    expect(withTenant).toHaveBeenCalledWith(schoolId, expect.any(Function));
    expect(transaction.school.findFirst).toHaveBeenCalledWith({
      where: { id: schoolId, isActive: true },
      select: { id: true, name: true },
    });
    expect(transaction.student.count).toHaveBeenCalledWith({
      where: { schoolId, status: "ACTIVE" },
    });
    expect(transaction.staffProfile.count).toHaveBeenCalledWith({
      where: { schoolId, isActive: true },
    });
    expect(transaction.schoolClass.count).toHaveBeenCalledWith({
      where: { schoolId, isActive: true },
    });
    expect(transaction.section.count).toHaveBeenCalledWith({
      where: {
        schoolId,
        isActive: true,
        class: { is: { schoolId, isActive: true } },
      },
    });
  });

  it("does not return dashboard counts for an inactive or missing school", async () => {
    transaction.school.findFirst.mockResolvedValue(null);

    await expect(
      service.getSchoolAdminDashboard(schoolId),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(transaction.student.count).not.toHaveBeenCalled();
  });

  it("returns school-local daily attendance totals and counts only unmarked session rosters", async () => {
    jest.useFakeTimers().setSystemTime(new Date("2026-04-02T18:45:00.000Z"));
    transaction.school.findFirst.mockResolvedValue({
      id: schoolId,
      name: "Synthetic School",
      timezone: "Asia/Kolkata",
    });
    transaction.$queryRaw.mockResolvedValue([
      {
        presentCount: 12,
        absentCount: 2,
        lateCount: 1,
        excusedCount: 1,
        unmarkedCount: 3,
      },
    ]);

    try {
      await expect(
        service.getPrincipalDashboard(schoolId),
      ).resolves.toEqual({
        schoolId,
        schoolName: "Synthetic School",
        localDate: "2026-04-03",
        presentCount: 12,
        absentCount: 2,
        lateCount: 1,
        excusedCount: 1,
        unmarkedCount: 3,
      });
      expect(withTenant).toHaveBeenCalledWith(schoolId, expect.any(Function));
      expect(transaction.school.findFirst).toHaveBeenCalledWith({
        where: { id: schoolId, isActive: true },
        select: { id: true, name: true, timezone: true },
      });
      const [query] = transaction.$queryRaw.mock.calls[0] as [Prisma.Sql];
      expect(query.values).toEqual([schoolId, "2026-04-03", schoolId]);
      expect(query.text).toContain("eligible_session_roster");
      expect(query.text).toContain('record."id" IS NULL');
    } finally {
      jest.useRealTimers();
    }
  });

  it("does not return principal attendance totals for an inactive or missing school", async () => {
    transaction.school.findFirst.mockResolvedValue(null);

    await expect(
      service.getPrincipalDashboard(schoolId),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(transaction.$queryRaw).not.toHaveBeenCalled();
  });

  it("returns only the authenticated teacher's active assignment summaries", async () => {
    jest.useFakeTimers().setSystemTime(new Date("2026-04-02T18:45:00.000Z"));
    transaction.school.findFirst.mockResolvedValue({
      id: schoolId,
      name: "Synthetic School",
      timezone: "Asia/Kolkata",
    });
    transaction.staffProfile.findMany.mockResolvedValue([{ id: "staff-1" }]);
    transaction.$queryRaw.mockResolvedValue([
      {
        classId: "class-1",
        className: "Grade 8",
        sectionId: "section-1",
        sectionName: "Section A",
        subject: "Mathematics",
        sessionStatus: "OPEN",
        unmarkedCount: 3,
      },
      {
        classId: "class-2",
        className: "Grade 9",
        sectionId: "section-2",
        sectionName: "Section B",
        subject: null,
        sessionStatus: null,
        unmarkedCount: null,
      },
    ]);

    try {
      await expect(
        service.getTeacherDashboard(schoolId, "user-1"),
      ).resolves.toEqual({
        schoolId,
        schoolName: "Synthetic School",
        localDate: "2026-04-03",
        assignments: [
          {
            classId: "class-1",
            className: "Grade 8",
            sectionId: "section-1",
            sectionName: "Section A",
            subject: "Mathematics",
            sessionStatus: "OPEN",
            unmarkedCount: 3,
          },
          {
            classId: "class-2",
            className: "Grade 9",
            sectionId: "section-2",
            sectionName: "Section B",
            subject: null,
            sessionStatus: null,
            unmarkedCount: null,
          },
        ],
      });

      expect(withTenant).toHaveBeenCalledWith(
        schoolId,
        expect.any(Function),
      );
      expect(transaction.staffProfile.findMany).toHaveBeenCalledWith({
        where: { schoolId, userId: "user-1", isActive: true },
        select: { id: true },
      });
      const [query] = transaction.$queryRaw.mock.calls[0] as [Prisma.Sql];
      expect(query.text).toContain('"teacher_assignments"');
      expect(query.text).toContain('assignment."staff_id"');
      expect(query.text).toContain('assignment."is_active" = TRUE');
      expect(query.text).toContain('session."date" =');
      expect(query.text).toContain('WHEN session."id" IS NULL THEN NULL');
      expect(query.text).toContain('COUNT(DISTINCT student."id")');
      expect(query.values).toContain("staff-1");
      expect(query.values).toContain("2026-04-03");
    } finally {
      jest.useRealTimers();
    }
  });

  it.each([
    { staffProfiles: [] },
    { staffProfiles: [{ id: "staff-1" }, { id: "staff-2" }] },
  ])(
    "denies a teacher without exactly one active linked staff profile",
    async ({ staffProfiles }) => {
      transaction.school.findFirst.mockResolvedValue({
        id: schoolId,
        name: "Synthetic School",
        timezone: "Asia/Kolkata",
      });
      transaction.staffProfile.findMany.mockResolvedValue(staffProfiles);

      await expect(
        service.getTeacherDashboard(schoolId, "user-1"),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(transaction.$queryRaw).not.toHaveBeenCalled();
    },
  );
});
