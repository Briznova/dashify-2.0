import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma, SchoolOnboardingStatus } from "@prisma/client";
import { PrismaService } from "../../infrastructure/database/prisma.service";
import { CreatePlatformSchoolDto } from "./dto/create-platform-school.dto";

const schoolDirectorySelect = {
  id: true,
  name: true,
  code: true,
  isActive: true,
  createdAt: true,
} as const;

@Injectable()
export class PlatformSchoolsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(actorUserId: string) {
    return this.prisma.$transaction(async (tx) => {
      const schools = await tx.school.findMany({
        orderBy: { name: "asc" },
        select: schoolDirectorySelect,
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

  async onboardingSummary(actorUserId: string) {
    return this.prisma.$transaction(async (tx) => {
      const rows = await tx.$queryRaw<{ notStarted: bigint; completed: bigint; unknown: bigint }[]>`
        SELECT
          COUNT(*) FILTER (WHERE o.status = 'NOT_STARTED') AS "notStarted",
          COUNT(*) FILTER (WHERE o.status = 'COMPLETED') AS "completed",
          COUNT(*) FILTER (WHERE o.id IS NULL) AS "unknown"
        FROM schools s LEFT JOIN school_onboarding_states o ON o.school_id = s.id
      `;
      const row = rows[0];
      await tx.auditLog.create({
        data: { actorUserId, action: "PLATFORM_SCHOOL_DIRECTORY_READ", resource: "school_directory" },
      });
      return { notStarted: Number(row.notStarted), completed: Number(row.completed), unknown: Number(row.unknown) };
    });
  }

  async detail(actorUserId: string, schoolId: string) {
    return this.prisma.withTenant(schoolId, async (tx) => {
      const school = await tx.school.findUnique({
        where: { id: schoolId },
        select: { ...schoolDirectorySelect, onboardingState: { select: { status: true } } },
      });
      if (!school) throw new NotFoundException("School not found");
      await tx.auditLog.create({
        data: {
          actorUserId,
          action: "PLATFORM_SCHOOL_DETAIL_READ",
          resource: "school",
          resourceId: school.id,
        },
      });
      const { onboardingState, ...metadata } = school;
      return { ...metadata, onboardingState: onboardingState?.status ?? null };
    });
  }

  async create(actorUserId: string, dto: CreatePlatformSchoolDto) {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const duplicate = await tx.school.findFirst({
          where: { code: { equals: dto.code, mode: "insensitive" } },
          select: { id: true },
        });
        if (duplicate) throw new ConflictException("School code already exists");

        const school = await tx.school.create({
          data: { name: dto.name, code: dto.code },
          select: schoolDirectorySelect,
        });
        await tx.schoolOnboardingState.create({
          data: {
            schoolId: school.id,
            status: SchoolOnboardingStatus.NOT_STARTED,
          },
        });
        await tx.auditLog.create({
          data: {
            actorUserId,
            action: "PLATFORM_SCHOOL_CREATED",
            resource: "school",
            resourceId: school.id,
            summary: { code: school.code, onboardingState: "NOT_STARTED" },
          },
        });
        return { ...school, onboardingState: "NOT_STARTED" as const };
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002" &&
        Array.isArray(error.meta?.target) &&
        error.meta.target.length === 1 &&
        error.meta.target[0] === "code"
      ) {
        throw new ConflictException("School code already exists");
      }
      throw error;
    }
  }
}
