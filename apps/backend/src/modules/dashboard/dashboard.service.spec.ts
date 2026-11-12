import { NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../infrastructure/database/prisma.service";
import { DashboardService } from "./dashboard.service";

describe("DashboardService school-admin dashboard", () => {
  const schoolId = "school-1";
  const transaction = {
    school: { findFirst: jest.fn() },
    student: { count: jest.fn() },
    staffProfile: { count: jest.fn() },
    schoolClass: { count: jest.fn() },
    section: { count: jest.fn() },
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
});
