import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { Prisma } from '@prisma/client';
import { CreateStudentDto } from './dto/create-student.dto';
import { StudentDirectorySearchDto } from './dto/student-directory-search.dto';
import { CreateAdmissionDto } from './dto/create-admission.dto';

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

const privateStudentFields = {
  address: true,
  emergencyContactKind: true,
  emergencyContactName: true,
  emergencyContactPhone: true,
} as const;

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
          omit: privateStudentFields,
          include: { enrolments: studentEnrolmentsInclude(schoolId) },
        }),
        tx.student.count({ where }),
      ]);
      return { data, meta: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) } };
    });
  }

  async search(schoolId: string, dto: StudentDirectorySearchDto) {
    const page = dto.page ?? 1;
    const pageSize = dto.pageSize ?? 20;
    const placementWhere: Prisma.StudentEnrolmentWhereInput = {
      schoolId,
      isActive: true,
      academicYear: { is: { schoolId } },
      section: {
        is: {
          schoolId,
          class: { is: { schoolId, ...(dto.classId ? { id: dto.classId } : {}) } },
        },
      },
      ...(dto.academicYearId ? { academicYearId: dto.academicYearId } : {}),
      ...(dto.classId ? { classId: dto.classId } : {}),
      ...(dto.sectionId ? { sectionId: dto.sectionId } : {}),
    };
    const terms = (dto.query ?? '').trim().split(/\s+/).filter(Boolean);
    const conditions: Prisma.StudentWhereInput[] = terms.map((term) => {
      const literal = term.replace(/[\\%_]/g, '\\$&');
      return {
        OR: [
          { firstName: { contains: literal, mode: 'insensitive' } },
          { middleName: { contains: literal, mode: 'insensitive' } },
          { lastName: { contains: literal, mode: 'insensitive' } },
          { admissionNumber: { contains: literal, mode: 'insensitive' } },
        ],
      };
    });
    if (dto.academicYearId || dto.classId || dto.sectionId) {
      conditions.push({ enrolments: { some: placementWhere } });
    }
    const where: Prisma.StudentWhereInput = {
      schoolId,
      status: dto.status ?? { not: 'ARCHIVED' },
      ...(conditions.length ? { AND: conditions } : {}),
    };
    return this.prisma.withTenant(schoolId, async (tx) => {
      const [data, total] = await Promise.all([
        tx.student.findMany({
          where,
          skip: (page - 1) * pageSize,
          take: pageSize,
          orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }, { id: 'asc' }],
          omit: privateStudentFields,
          include: {
            enrolments: {
              ...studentEnrolmentsInclude(schoolId),
              where: placementWhere,
            },
          },
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
          guardians: { where: { schoolId, guardian: { is: { schoolId } } }, include: { guardian: true } },
          enrolments: studentEnrolmentsInclude(schoolId),
        },
      });
      if (!student) throw new NotFoundException();
      return student;
    });
  }
  async create(schoolId: string, actorId: string, dto: CreateAdmissionDto) {
    if (dto.dateOfBirth > dto.admissionDate) {
      throw new BadRequestException('Date of birth must not be after admission date');
    }
    if (dto.guardians.filter((guardian) => guardian.isPrimary).length !== 1) {
      throw new BadRequestException('Exactly one primary guardian is required');
    }
    if (dto.emergencyContact.kind === 'PRIMARY_GUARDIAN' &&
      (dto.emergencyContact.name !== undefined || dto.emergencyContact.phone !== undefined)) {
      throw new BadRequestException('Primary guardian emergency contact must not include separate contact details');
    }
    return this.prisma.withTenant(schoolId, async (tx) => {
      const schools = await tx.$queryRaw<{ code: string; admission_prefix: string | null }[]>`
        SELECT code, admission_prefix FROM schools WHERE id = ${schoolId}::uuid AND is_active = true FOR UPDATE
      `;
      if (!schools.length) throw new NotFoundException('School not found');
      const [year, schoolClass, section] = await Promise.all([
        tx.academicYear.findFirst({ where: { id: dto.academicYearId, schoolId } }),
        tx.schoolClass.findFirst({ where: { id: dto.classId, schoolId, isActive: true } }),
        tx.section.findFirst({ where: { id: dto.sectionId, schoolId, classId: dto.classId, isActive: true } }),
      ]);
      if (!year || !schoolClass || !section) throw new NotFoundException('Academic year, class or section not found');
      const placementWhere = {
        schoolId, academicYearId: dto.academicYearId, sectionId: dto.sectionId,
        isActive: true, endDate: null,
      };
      if (section.capacity !== null) {
        const occupied = await tx.studentEnrolment.count({
          where: { ...placementWhere, student: { is: { schoolId, status: { not: 'ARCHIVED' } } } },
        });
        if (occupied >= section.capacity) throw new ConflictException('Section capacity has been reached');
      }
      if (dto.rollNumber && await tx.studentEnrolment.findFirst({
        where: { ...placementWhere, rollNumber: dto.rollNumber }, select: { id: true },
      })) {
        throw new ConflictException('Roll number is already in use in this section and year');
      }
      const admissionYear = Number(dto.admissionDate.slice(0, 4));
      const sequence = await tx.admissionSequence.upsert({
        where: { schoolId_year: { schoolId, year: admissionYear } },
        create: { schoolId, year: admissionYear, lastValue: 0 },
        update: {},
      });
      const base = `${schools[0].admission_prefix ?? schools[0].code}-${admissionYear}-`;
      const existingIds = new Set((await tx.student.findMany({
        where: { schoolId, admissionNumber: { startsWith: base.replace(/[\\%_]/g, '\\$&') } },
        select: { admissionNumber: true },
      })).map((student) => student.admissionNumber));
      let next = sequence.lastValue;
      let admissionNumber: string;
      do {
        next += 1;
        if (next > 2147483647) throw new ConflictException('Admission sequence is exhausted');
        admissionNumber = `${base}${String(next).padStart(4, '0')}`;
      } while (existingIds.has(admissionNumber));
      await tx.admissionSequence.update({ where: { schoolId_year: { schoolId, year: admissionYear } }, data: { lastValue: next } });
      const student = await tx.student.create({
        data: {
          schoolId, admissionNumber, firstName: dto.firstName,
          middleName: dto.middleName, lastName: dto.lastName,
          dateOfBirth: new Date(dto.dateOfBirth),
          gender: dto.gender, admissionDate: new Date(dto.admissionDate),
          ...(dto.address ? { address: { ...dto.address } } : {}),
          emergencyContactKind: dto.emergencyContact.kind,
          emergencyContactName: dto.emergencyContact.kind === 'OTHER' ? dto.emergencyContact.name : null,
          emergencyContactPhone: dto.emergencyContact.kind === 'OTHER' ? dto.emergencyContact.phone : null,
        },
      });
      for (const guardianInput of dto.guardians ?? []) {
        const guardian = await tx.guardian.create({ data: { schoolId, firstName: guardianInput.firstName, lastName: guardianInput.lastName, phone: guardianInput.phone, email: guardianInput.email } });
        await tx.studentGuardian.create({ data: { schoolId, studentId: student.id, guardianId: guardian.id, relationship: guardianInput.relationship, isPrimary: guardianInput.isPrimary ?? false } });
      }
      await tx.studentEnrolment.create({ data: { schoolId, studentId: student.id, academicYearId: year.id, classId: schoolClass.id, sectionId: section.id, startDate: new Date(dto.admissionDate), rollNumber: dto.rollNumber } });
      await tx.auditLog.create({ data: { schoolId, actorUserId: actorId, action: 'STUDENT_CREATED', resource: 'student', resourceId: student.id } });
      return tx.student.findUniqueOrThrow({ where: { id: student.id }, include: { guardians: { include: { guardian: true } }, enrolments: studentEnrolmentsInclude(schoolId) } });
    });
  }

  async update(
    schoolId: string,
    actorId: string,
    id: string,
    dto: Partial<CreateStudentDto>,
  ) {
    const guardianInputs = dto.guardians;
    if (guardianInputs) {
      if (guardianInputs.filter((guardian) => guardian.isPrimary === true).length > 1) {
        throw new BadRequestException('Only one primary guardian is allowed');
      }

      const guardianIds = guardianInputs
        .map((guardian) => guardian.id)
        .filter((guardianId): guardianId is string => guardianId !== undefined);
      if (new Set(guardianIds).size !== guardianIds.length) {
        throw new BadRequestException('A guardian can only appear once');
      }
    }

    return this.prisma.withTenant(schoolId, async (tx) => {
      if (dto.admissionNumber !== undefined) {
        await tx.$queryRaw`SELECT id FROM schools WHERE id = ${schoolId}::uuid FOR UPDATE`;
      }
      const student = await tx.student.findFirst({
        where: { id, schoolId },
        include: { guardians: { include: { guardian: true } }, enrolments: true },
      });
      if (!student) throw new NotFoundException('Student not found');
      if (student.emergencyContactKind && guardianInputs &&
        guardianInputs.filter((guardian) => guardian.isPrimary === true).length !== 1) {
        throw new BadRequestException('Exactly one primary guardian is required');
      }

      const linkedGuardianIds = new Set(
        student.guardians.map((link) => link.guardianId),
      );
      if (
        guardianInputs?.some(
          (guardian) => guardian.id && !linkedGuardianIds.has(guardian.id),
        )
      ) {
        throw new NotFoundException('Guardian not found');
      }

      if (dto.admissionNumber && dto.admissionNumber !== student.admissionNumber) {
        const duplicate = await tx.student.findFirst({
          where: { schoolId, admissionNumber: dto.admissionNumber, id: { not: id } },
        });
        if (duplicate) throw new ConflictException('Admission number already exists');
      }

      let updatedStudent = student;
      const { guardians, ...studentData } = dto;
      const changedFields = Object.keys(dto);
      if (Object.keys(studentData).length > 0) {
        updatedStudent = await tx.student.update({
          where: { id },
          data: {
            ...studentData,
            ...(studentData.dateOfBirth !== undefined
              ? { dateOfBirth: studentData.dateOfBirth ? new Date(studentData.dateOfBirth) : null }
              : {}),
            ...(studentData.admissionDate !== undefined
              ? { admissionDate: new Date(studentData.admissionDate) }
              : {}),
          },
          include: { guardians: { include: { guardian: true } }, enrolments: true },
        });
      }

      const guardianLinkChanges = { added: 0, updated: 0, removed: 0 };
      if (dto.guardians !== undefined) {
        const incomingGuardianIds = dto.guardians
          .flatMap((guardian) => (guardian.id ? [guardian.id] : []));
        const toRemove = updatedStudent.guardians.filter((link) => !incomingGuardianIds.includes(link.guardianId));
        guardianLinkChanges.added = dto.guardians.filter(
          (guardian) => !guardian.id,
        ).length;
        guardianLinkChanges.updated = dto.guardians.filter(
          (guardian) => guardian.id,
        ).length;
        guardianLinkChanges.removed = toRemove.length;
        if (toRemove.length > 0) {
          await tx.studentGuardian.deleteMany({
            where: { schoolId, studentId: id, guardianId: { in: toRemove.map((link) => link.guardianId) } },
          });
        }

        for (const guardianInput of dto.guardians) {
          if (guardianInput.id) {
            const existingLink = updatedStudent.guardians.find((link) => link.guardianId === guardianInput.id);
            if (existingLink) {
              await tx.guardian.update({
                where: { id: guardianInput.id },
                data: {
                  firstName: guardianInput.firstName,
                  lastName: guardianInput.lastName,
                  phone: guardianInput.phone,
                  email: guardianInput.email,
                },
              });
              await tx.studentGuardian.update({
                where: { studentId_guardianId: { studentId: id, guardianId: guardianInput.id } },
                data: { relationship: guardianInput.relationship, isPrimary: guardianInput.isPrimary ?? false },
              });
              continue;
            }
          }

          const guardian = await tx.guardian.create({
            data: {
              schoolId,
              firstName: guardianInput.firstName,
              lastName: guardianInput.lastName,
              phone: guardianInput.phone,
              email: guardianInput.email,
            },
          });
          await tx.studentGuardian.create({
            data: {
              schoolId,
              studentId: id,
              guardianId: guardian.id,
              relationship: guardianInput.relationship,
              isPrimary: guardianInput.isPrimary ?? false,
            },
          });
        }

        updatedStudent = await tx.student.findUniqueOrThrow({
          where: { id },
          include: { guardians: { include: { guardian: true } }, enrolments: true },
        });
      }

      if (changedFields.length > 0) {
        await tx.auditLog.create({
          data: {
            schoolId,
            actorUserId: actorId,
            action: 'STUDENT_UPDATED',
            resource: 'student',
            resourceId: id,
            summary: { changedFields, guardianLinkChanges },
          },
        });
      }

      return updatedStudent;
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
