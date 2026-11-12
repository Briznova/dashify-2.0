import { Injectable, NotFoundException } from '@nestjs/common';
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
}
