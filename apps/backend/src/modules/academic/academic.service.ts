import { ConflictException, Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
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
  async createClass(schoolId: string, dto: CreateClassDto) {
    return this.prisma.withTenant(schoolId, (tx) => tx.schoolClass.create({ data: { schoolId, name: dto.name, code: dto.code, sortOrder: dto.sortOrder ?? 0 } }));
  }
  async createSection(schoolId: string, dto: CreateSectionDto) {
    return this.prisma.withTenant(schoolId, async (tx) => {
      const parent = await tx.schoolClass.findFirst({ where: { id: dto.classId, schoolId, isActive: true } });
      if (!parent) throw new NotFoundException('Class not found');
      return tx.section.create({ data: { schoolId, classId: dto.classId, name: dto.name, code: dto.code, capacity: dto.capacity } });
    });
  }
}
