import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { CreateAcademicYearDto } from './dto/create-academic-year.dto';
import { CreateClassDto } from './dto/create-class.dto';
import { CreateSectionDto } from './dto/create-section.dto';

@Injectable()
export class AcademicService {
  constructor(private readonly prisma: PrismaService) {}
  async listYears(schoolId: string) {
    return this.prisma.withTenant(schoolId, (tx) => tx.academicYear.findMany({ where: { schoolId }, orderBy: { startDate: 'desc' } }));
  }
  async createYear(schoolId: string, dto: CreateAcademicYearDto) {
    const start = new Date(dto.startDate); const end = new Date(dto.endDate);
    if (end <= start) throw new BadRequestException('endDate must be after startDate');
    return this.prisma.withTenant(schoolId, async (tx) => {
      const overlap = await tx.academicYear.findFirst({ where: { schoolId, startDate: { lte: end }, endDate: { gte: start }, status: { in: ['ACTIVE','DRAFT'] } } });
      if (overlap) throw new ConflictException('Academic year date range overlaps an existing year');
      return tx.academicYear.create({ data: { schoolId, name: dto.name, startDate: start, endDate: end } });
    });
  }
  async listClasses(schoolId: string) {
    return this.prisma.withTenant(schoolId, (tx) => tx.schoolClass.findMany({ where: { schoolId, isActive: true }, include: { sections: true }, orderBy: { sortOrder: 'asc' } }));
  }
  async createClass(schoolId: string, actorId: string, dto: CreateClassDto) {
    return this.prisma.withTenant(schoolId, async (tx) => {
      try {
        const classroom = await tx.schoolClass.create({
          data: {
            schoolId,
            name: dto.name,
            code: dto.code,
            sortOrder: dto.sortOrder ?? 0,
          },
        });
        await tx.auditLog.create({
          data: {
            schoolId,
            actorUserId: actorId,
            action: 'CLASS_CREATED',
            resource: 'class',
            resourceId: classroom.id,
            summary: { name: dto.name, code: dto.code },
          },
        });
        return classroom;
      } catch (error) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2002'
        ) {
          throw new ConflictException('Class code already exists');
        }
        throw error;
      }
    });
  }
  async createSection(schoolId: string, actorId: string, dto: CreateSectionDto) {
    return this.prisma.withTenant(schoolId, async (tx) => {
      const parent = await tx.schoolClass.findFirst({ where: { id: dto.classId, schoolId, isActive: true } });
      if (!parent) throw new NotFoundException('Class not found');
      try {
        const section = await tx.section.create({
          data: {
            schoolId,
            classId: dto.classId,
            name: dto.name,
            code: dto.code,
            capacity: dto.capacity,
          },
        });
        await tx.auditLog.create({
          data: {
            schoolId,
            actorUserId: actorId,
            action: 'SECTION_CREATED',
            resource: 'section',
            resourceId: section.id,
            summary: {
              classId: dto.classId,
              name: dto.name,
              code: dto.code,
            },
          },
        });
        return section;
      } catch (error) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2002'
        ) {
          throw new ConflictException('Section code already exists for this class');
        }
        throw error;
      }
    });
  }
}
