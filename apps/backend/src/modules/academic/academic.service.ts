import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { CreateAcademicYearDto } from './dto/create-academic-year.dto';
import { CreateClassDto } from './dto/create-class.dto';
import { CreateClassWithSectionDto } from './dto/create-class-with-section.dto';
import { CreateSectionDto } from './dto/create-section.dto';
import { UpdateClassDto } from './dto/update-class.dto';
import { UpdateSectionDto } from './dto/update-section.dto';

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
  async createClassWithSection(schoolId: string, actorId: string, dto: CreateClassWithSectionDto) {
    return this.prisma.withTenant(schoolId, async (tx) => {
      let classroom;
      try {
        classroom = await tx.schoolClass.create({
          data: { schoolId, name: dto.name, code: dto.code, sortOrder: dto.sortOrder ?? 0 },
        });
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
          throw new ConflictException('Class code already exists');
        }
        throw error;
      }
      const section = await tx.section.create({
        data: {
          schoolId,
          classId: classroom.id,
          name: dto.section.name,
          code: dto.section.code,
          capacity: dto.section.capacity,
        },
      });
      await tx.auditLog.create({
        data: {
          schoolId, actorUserId: actorId, action: 'CLASS_CREATED',
          resource: 'class', resourceId: classroom.id,
          summary: { name: dto.name, code: dto.code },
        },
      });
      await tx.auditLog.create({
        data: {
          schoolId, actorUserId: actorId, action: 'SECTION_CREATED',
          resource: 'section', resourceId: section.id,
          summary: { classId: classroom.id, name: dto.section.name, code: dto.section.code },
        },
      });
      return { ...classroom, sections: [section] };
    });
  }

  async updateClass(schoolId: string, actorId: string, id: string, dto: UpdateClassDto) {
    return this.prisma.withTenant(schoolId, async (tx) => {
      const current = await tx.schoolClass.findFirst({ where: { id, schoolId, isActive: true } });
      if (!current) throw new NotFoundException('Class not found');
      let classroom;
      try {
        classroom = await tx.schoolClass.update({ where: { id }, data: dto, include: { sections: true } });
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
          throw new ConflictException('Class code already exists');
        }
        throw error;
      }
      await tx.auditLog.create({ data: {
        schoolId, actorUserId: actorId, action: 'CLASS_UPDATED', resource: 'class',
        resourceId: id, summary: { fields: ['name', 'code', 'sortOrder'] },
      } });
      return classroom;
    });
  }

  async updateSection(schoolId: string, actorId: string, classId: string, sectionId: string, dto: UpdateSectionDto) {
    return this.prisma.withTenant(schoolId, async (tx) => {
      const schools = await tx.$queryRaw<{ id: string }[]>`
        SELECT id FROM schools WHERE id = ${schoolId}::uuid AND is_active = true FOR UPDATE
      `;
      if (!schools.length) throw new NotFoundException('School not found');
      const section = await tx.section.findFirst({
        where: { id: sectionId, schoolId, classId, isActive: true, class: { is: { schoolId, isActive: true } } },
      });
      if (!section) throw new NotFoundException('Section not found');
      const capacity = dto.capacity;
      if (capacity !== null) {
        const occupancy = await tx.studentEnrolment.groupBy({
          by: ['academicYearId'],
          where: {
            schoolId, sectionId, isActive: true, endDate: null,
            student: { is: { schoolId, status: { not: 'ARCHIVED' } } },
          },
          _count: { _all: true },
        });
        if (occupancy.some((year) => year._count._all > capacity)) {
          throw new ConflictException('Section capacity cannot be below current enrollment');
        }
      }
      let updated;
      try {
        updated = await tx.section.update({ where: { id: sectionId }, data: dto });
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
          throw new ConflictException('Section code already exists for this class');
        }
        throw error;
      }
      await tx.auditLog.create({ data: {
        schoolId, actorUserId: actorId, action: 'SECTION_UPDATED', resource: 'section',
        resourceId: sectionId, summary: { fields: ['name', 'code', 'capacity'] },
      } });
      return updated;
    });
  }
}
