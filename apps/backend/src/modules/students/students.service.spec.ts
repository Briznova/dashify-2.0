import { NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { StudentsService } from './students.service';

describe('StudentsService enrolments', () => {
  const schoolId = 'school-1';
  const studentId = 'student-1';
  const studentWithEnrolments = (enrolments: object[]) => ({
    id: studentId,
    schoolId,
    admissionNumber: 'ADM-001',
    admissionDate: new Date('2026-04-01'),
    enrolments,
  });

  let service: StudentsService;
  let transaction: {
    student: {
      findMany: jest.Mock;
      count: jest.Mock;
      findFirst: jest.Mock;
    };
    academicYear: { findFirst: jest.Mock };
    schoolClass: { findFirst: jest.Mock };
    section: { findFirst: jest.Mock };
  };

  beforeEach(() => {
    transaction = {
      student: {
        findMany: jest.fn(),
        count: jest.fn(),
        findFirst: jest.fn(),
      },
      academicYear: { findFirst: jest.fn() },
      schoolClass: { findFirst: jest.fn() },
      section: { findFirst: jest.fn() },
    };
    const prisma = {
      withTenant: jest.fn(
        (_tenantId: string, work: (tx: typeof transaction) => Promise<unknown>) =>
          work(transaction),
      ),
    } as unknown as PrismaService;
    service = new StudentsService(prisma);
  });

  it('returns a student with one active enrolment in the list', async () => {
    const enrolment = {
      id: 'enrolment-1',
      schoolId,
      isActive: true,
      startDate: new Date('2026-04-01'),
      academicYear: { id: 'year-1', name: '2026-2027', status: 'ACTIVE' },
      section: {
        id: 'section-1',
        name: 'A',
        class: { id: 'class-1', name: 'Grade 1', code: 'G1' },
      },
    };
    const student = studentWithEnrolments([enrolment]);
    transaction.student.findMany.mockResolvedValue([student]);
    transaction.student.count.mockResolvedValue(1);

    const result = await service.list(schoolId, 1, 20);

    expect(result.data).toEqual([student]);
    expect(transaction.student.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { schoolId, status: { not: 'ARCHIVED' } },
        include: {
          enrolments: expect.objectContaining({
            where: expect.objectContaining({ schoolId }),
            include: expect.objectContaining({
              academicYear: expect.any(Object),
              section: expect.any(Object),
            }),
          }),
        },
      }),
    );
  });

  it('returns all enrolments for an individual student, including inactive history', async () => {
    const enrolments = [
      { id: 'enrolment-1', schoolId, isActive: true },
      { id: 'enrolment-2', schoolId, isActive: false },
    ];
    const student = studentWithEnrolments(enrolments);
    transaction.student.findFirst.mockResolvedValue(student);

    const result = await service.get(schoolId, studentId);

    expect(result).toEqual(student);
    expect(transaction.student.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: studentId, schoolId },
        include: {
          guardians: { include: { guardian: true } },
          enrolments: expect.objectContaining({
            where: expect.objectContaining({ schoolId }),
          }),
        },
      }),
    );
    const query = transaction.student.findFirst.mock.calls[0][0];
    expect(query.include.enrolments.where).not.toHaveProperty('isActive');
  });

  it('returns an empty enrolment array when a student has no enrolments', async () => {
    const student = studentWithEnrolments([]);
    transaction.student.findFirst.mockResolvedValue(student);

    const result = await service.get(schoolId, studentId);

    expect(result.enrolments).toEqual([]);
  });

  it('does not return a student belonging to another school', async () => {
    transaction.student.findFirst.mockResolvedValue(null);

    await expect(service.get(schoolId, studentId)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(transaction.student.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: studentId, schoolId } }),
    );
  });

  it('scopes the student and included enrolments and related academic data to the school', async () => {
    transaction.student.findFirst.mockResolvedValue(studentWithEnrolments([]));

    await service.get(schoolId, studentId);

    const query = transaction.student.findFirst.mock.calls[0][0];
    expect(query.where).toEqual({ id: studentId, schoolId });
    expect(query.include.enrolments.where).toEqual({
      schoolId,
      academicYear: { is: { schoolId } },
      section: { is: { schoolId, class: { is: { schoolId } } } },
    });
  });

  it.each(['academicYear', 'schoolClass', 'section'] as const)(
    'rejects a missing or cross-school %s reference on create',
    async (missingReference) => {
      transaction.student.findFirst.mockResolvedValue(null);
      transaction.academicYear.findFirst.mockResolvedValue(
        missingReference === 'academicYear' ? null : { id: 'year-1', schoolId },
      );
      transaction.schoolClass.findFirst.mockResolvedValue(
        missingReference === 'schoolClass' ? null : { id: 'class-1', schoolId },
      );
      transaction.section.findFirst.mockResolvedValue(
        missingReference === 'section' ? null : { id: 'section-1', schoolId },
      );

      await expect(
        service.create(schoolId, 'actor-1', {
          admissionNumber: 'ADM-001',
          firstName: 'Aarav',
          lastName: 'Sharma',
          admissionDate: '2026-04-01',
          academicYearId: 'year-1',
          classId: 'class-1',
          sectionId: 'section-1',
          guardians: [],
        }),
      ).rejects.toBeInstanceOf(NotFoundException);

      expect(transaction.academicYear.findFirst).toHaveBeenCalledWith({
        where: { id: 'year-1', schoolId },
      });
      expect(transaction.schoolClass.findFirst).toHaveBeenCalledWith({
        where: { id: 'class-1', schoolId, isActive: true },
      });
      expect(transaction.section.findFirst).toHaveBeenCalledWith({
        where: {
          id: 'section-1',
          schoolId,
          classId: 'class-1',
          isActive: true,
        },
      });
    },
  );
});
