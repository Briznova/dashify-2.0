import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, SchoolOnboardingStatus } from '@prisma/client';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { UpdateSchoolDto } from './dto/update-school.dto';

@Injectable()
export class SchoolsService {
  constructor(private readonly prisma: PrismaService) {}
  async getCurrent(schoolId: string) {
    return this.prisma.withTenant(schoolId, async (tx) => {
      const school = await tx.school.findFirst({ where: { id: schoolId, isActive: true } });
      if (!school) throw new NotFoundException();
      return school;
    });
  }
  async updateCurrent(schoolId: string, dto: UpdateSchoolDto) {
    return this.prisma.withTenant(schoolId, async (tx) => {
      const result = await tx.school.updateMany({ where: { id: schoolId, isActive: true }, data: dto });
      if (!result.count) throw new NotFoundException();
      return tx.school.findUniqueOrThrow({ where: { id: schoolId } });
    });
  }

  private async onboardingSnapshot(tx: Prisma.TransactionClient, schoolId: string) {
    const [state, academicYears, activeClass] = await Promise.all([
      tx.schoolOnboardingState.findUnique({ where: { schoolId }, select: { status: true } }),
      tx.academicYear.count({ where: { schoolId } }),
      tx.schoolClass.findFirst({
        where: { schoolId, isActive: true, sections: { some: { schoolId, isActive: true } } },
        select: { id: true },
      }),
    ]);
    return {
      status: state?.status ?? null,
      prerequisites: { academicYear: academicYears > 0, classWithSection: activeClass !== null },
    };
  }

  async getOnboarding(schoolId: string) {
    return this.prisma.withTenant(schoolId, async (tx) => {
      const school = await tx.school.findFirst({ where: { id: schoolId, isActive: true }, select: { id: true } });
      if (!school) throw new NotFoundException();
      return this.onboardingSnapshot(tx, schoolId);
    });
  }

  async completeOnboarding(schoolId: string, actorUserId: string) {
    return this.prisma.withTenant(schoolId, async (tx) => {
      const schools = await tx.$queryRaw<{ id: string }[]>`
        SELECT id FROM schools WHERE id = ${schoolId}::uuid AND is_active = true FOR UPDATE
      `;
      if (!schools.length) throw new NotFoundException();
      const snapshot = await this.onboardingSnapshot(tx, schoolId);
      if (snapshot.status === SchoolOnboardingStatus.COMPLETED) return snapshot;
      const years = await tx.$queryRaw<{ id: string }[]>`
        SELECT id FROM academic_years WHERE school_id = ${schoolId}::uuid LIMIT 1 FOR SHARE
      `;
      const classes = await tx.$queryRaw<{ id: string }[]>`
        SELECT c.id FROM classes c
        JOIN sections s ON s.class_id = c.id AND s.school_id = c.school_id
        WHERE c.school_id = ${schoolId}::uuid AND c.is_active = true AND s.is_active = true
        LIMIT 1 FOR SHARE OF c, s
      `;
      if (!years.length || !classes.length) {
        throw new ConflictException('Create an academic year and an active class with an active section before confirming onboarding');
      }
      await tx.schoolOnboardingState.upsert({
        where: { schoolId },
        update: { status: SchoolOnboardingStatus.COMPLETED },
        create: { schoolId, status: SchoolOnboardingStatus.COMPLETED },
      });
      await tx.auditLog.create({
        data: { schoolId, actorUserId, action: 'SCHOOL_ONBOARDING_CONFIRMED', resource: 'school', resourceId: schoolId },
      });
      return { status: SchoolOnboardingStatus.COMPLETED, prerequisites: { academicYear: true, classWithSection: true } };
    });
  }
}
