import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../infrastructure/database/prisma.service";
import { SchoolAdminDashboardDto } from "./dto/school-admin-dashboard.dto";

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getSchoolAdminDashboard(
    schoolId: string,
  ): Promise<SchoolAdminDashboardDto> {
    return this.prisma.withTenant(schoolId, async (tx) => {
      const school = await tx.school.findFirst({
        where: { id: schoolId, isActive: true },
        select: { id: true, name: true },
      });
      if (!school) throw new NotFoundException("Active school not found");

      const [
        activeStudentCount,
        activeStaffCount,
        activeClassCount,
        activeSectionCount,
      ] = await Promise.all([
        tx.student.count({ where: { schoolId, status: "ACTIVE" } }),
        tx.staffProfile.count({ where: { schoolId, isActive: true } }),
        tx.schoolClass.count({ where: { schoolId, isActive: true } }),
        tx.section.count({
          where: {
            schoolId,
            isActive: true,
            class: { is: { schoolId, isActive: true } },
          },
        }),
      ]);

      return {
        schoolId: school.id,
        schoolName: school.name,
        activeStudentCount,
        activeStaffCount,
        activeClassCount,
        activeSectionCount,
      };
    });
  }
}
