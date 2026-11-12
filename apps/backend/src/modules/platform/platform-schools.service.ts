import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../infrastructure/database/prisma.service";

@Injectable()
export class PlatformSchoolsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(actorUserId: string) {
    return this.prisma.$transaction(async (tx) => {
      const schools = await tx.school.findMany({
        orderBy: { name: "asc" },
        select: {
          id: true,
          name: true,
          code: true,
          isActive: true,
          createdAt: true,
        },
      });
      await tx.auditLog.create({
        data: {
          actorUserId,
          action: "PLATFORM_SCHOOL_DIRECTORY_READ",
          resource: "school_directory",
          summary: { resultCount: schools.length },
        },
      });
      return schools;
    });
  }
}
