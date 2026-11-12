import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { CreateStudentDto } from './dto/create-student.dto';

const studentEnrolmentsInclude = (schoolId: string) => ({
  where: {
    schoolId,
    academicYear: { is: { schoolId } },
    section: { is: { schoolId, class: { is: { schoolId } } } },
  },
  include: {
    academicYear: {
      select: { id: true, name: true, startDate: true, endDate: true, status: true },
    },
    section: {
      select: {
        id: true,
        name: true,
        code: true,
        class: { select: { id: true, name: true, code: true } },
      },
    },
  },
  orderBy: [{ startDate: 'desc' as const }, { createdAt: 'desc' as const }],
});

@Injectable()
export class StudentsService {
  constructor(private readonly prisma: PrismaService) {}
  async list(schoolId: string, page: number, pageSize: number) {
    return this.prisma.withTenant(schoolId, async (tx) => {
      const where = { schoolId, status: { not: 'ARCHIVED' as const } };
      const [data, total] = await Promise.all([
        tx.student.findMany({
          where,
          skip: (page - 1) * pageSize,
          take: pageSize,
          orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
          include: { enrolments: studentEnrolmentsInclude(schoolId) },
        }),
        tx.student.count({ where }),
      ]);
      return { data, meta: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) } };
    });
  }
  async get(schoolId: string, id: string) {
    return this.prisma.withTenant(schoolId, async (tx) => {
      const student = await tx.student.findFirst({
        where: { id, schoolId },
        include: {
          guardians: { include: { guardian: true } },
          enrolments: studentEnrolmentsInclude(schoolId),
        },
      });
      if (!student) throw new NotFoundException();
      return student;
    });
  }
  async create(schoolId: string, actorId: string, dto: CreateStudentDto) {
    return this.prisma.withTenant(schoolId, async (tx) => {
      const exists = await tx.student.findFirst({ where: { schoolId, admissionNumber: dto.admissionNumber } });
      if (exists) throw new ConflictException('Admission number already exists');
      const [year, schoolClass, section] = await Promise.all([
        tx.academicYear.findFirst({ where: { id: dto.academicYearId, schoolId } }),
        tx.schoolClass.findFirst({ where: { id: dto.classId, schoolId, isActive: true } }),
        tx.section.findFirst({ where: { id: dto.sectionId, schoolId, classId: dto.classId, isActive: true } }),
      ]);
      if (!year || !schoolClass || !section) throw new NotFoundException('Academic year, class or section not found');
      const student = await tx.student.create({
        data: {
          schoolId, admissionNumber: dto.admissionNumber, firstName: dto.firstName,
          middleName: dto.middleName, lastName: dto.lastName,
          dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : undefined,
          gender: dto.gender, admissionDate: new Date(dto.admissionDate),
        },
      });
      for (const guardianInput of dto.guardians ?? []) {
        const guardian = await tx.guardian.create({ data: { schoolId, firstName: guardianInput.firstName, lastName: guardianInput.lastName, phone: guardianInput.phone, email: guardianInput.email } });
        await tx.studentGuardian.create({ data: { schoolId, studentId: student.id, guardianId: guardian.id, relationship: guardianInput.relationship, isPrimary: guardianInput.isPrimary ?? false } });
      }
      await tx.studentEnrolment.create({ data: { schoolId, studentId: student.id, academicYearId: year.id, classId: schoolClass.id, sectionId: section.id, startDate: new Date(dto.admissionDate) } });
      await tx.auditLog.create({ data: { schoolId, actorUserId: actorId, action: 'STUDENT_CREATED', resource: 'student', resourceId: student.id, summary: { admissionNumber: dto.admissionNumber } } });
      return tx.student.findUniqueOrThrow({ where: { id: student.id }, include: { guardians: { include: { guardian: true } }, enrolments: true } });
    });
  }
  async archive(schoolId: string, actorId: string, id: string) {
    return this.prisma.withTenant(schoolId, async (tx) => {
      const result = await tx.student.updateMany({ where: { id, schoolId, status: { not: 'ARCHIVED' } }, data: { status: 'ARCHIVED', archivedAt: new Date() } });
      if (!result.count) throw new NotFoundException();
      await tx.auditLog.create({ data: { schoolId, actorUserId: actorId, action: 'STUDENT_ARCHIVED', resource: 'student', resourceId: id } });
      return { success: true };
    });
  }
}
