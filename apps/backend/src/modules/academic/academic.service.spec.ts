import { ConflictException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { AcademicService } from './academic.service';

describe('AcademicService tenant scoping', () => {
  const schoolId = 'school-1';
  let service: AcademicService;
  let transaction: {
    academicYear: { findMany: jest.Mock; findFirst: jest.Mock; create: jest.Mock };
    schoolClass: { findMany: jest.Mock; findFirst: jest.Mock; create: jest.Mock };
    section: { findFirst: jest.Mock; create: jest.Mock };
    auditLog: { create: jest.Mock };
  };
  let withTenant: jest.Mock;

  beforeEach(() => {
    transaction = {
      academicYear: { findMany: jest.fn(), findFirst: jest.fn(), create: jest.fn() },
      schoolClass: { findMany: jest.fn(), findFirst: jest.fn(), create: jest.fn() },
      section: { findFirst: jest.fn(), create: jest.fn() },
      auditLog: { create: jest.fn() },
    };
    withTenant = jest.fn(
      (_tenantId: string, work: (tx: typeof transaction) => Promise<unknown>) =>
        work(transaction),
    );
    service = new AcademicService({ withTenant } as unknown as PrismaService);
  });

  it('lists academic years and classes only within the active school', async () => {
    transaction.academicYear.findMany.mockResolvedValue([]);
    transaction.schoolClass.findMany.mockResolvedValue([]);

    await service.listYears(schoolId);
    await service.listClasses(schoolId);

    expect(withTenant).toHaveBeenNthCalledWith(
      1,
      schoolId,
      expect.any(Function),
    );
    expect(transaction.academicYear.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { schoolId } }),
    );
    expect(transaction.schoolClass.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { schoolId, isActive: true } }),
    );
  });

  it('rejects section creation when its parent class is outside the active school', async () => {
    transaction.schoolClass.findFirst.mockResolvedValue(null);

    await expect(
      service.createSection(schoolId, 'actor-1', {
        classId: 'foreign-class',
        name: 'Section A',
        code: 'A',
        capacity: 30,
      }),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(transaction.schoolClass.findFirst).toHaveBeenCalledWith({
      where: { id: 'foreign-class', schoolId, isActive: true },
    });
    expect(transaction.section.create).not.toHaveBeenCalled();
  });

  it('creates a class within the active school and records the actor', async () => {
    transaction.schoolClass.create.mockResolvedValue({
      id: 'class-1',
      schoolId,
      name: 'Class 1',
      code: 'CLASS-1',
      sortOrder: 1,
    });

    await expect(
      service.createClass(schoolId, 'actor-1', {
        name: 'Class 1',
        code: 'CLASS-1',
        sortOrder: 1,
      }),
    ).resolves.toMatchObject({ id: 'class-1' });

    expect(transaction.schoolClass.create).toHaveBeenCalledWith({
      data: {
        schoolId,
        name: 'Class 1',
        code: 'CLASS-1',
        sortOrder: 1,
      },
    });
    expect(transaction.auditLog.create).toHaveBeenCalledWith({
      data: {
        schoolId,
        actorUserId: 'actor-1',
        action: 'CLASS_CREATED',
        resource: 'class',
        resourceId: 'class-1',
        summary: { name: 'Class 1', code: 'CLASS-1' },
      },
    });
  });

  it('maps duplicate class codes to an explicit conflict', async () => {
    transaction.schoolClass.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('Duplicate class code', {
        code: 'P2002',
        clientVersion: 'test',
      }),
    );

    await expect(
      service.createClass(schoolId, 'actor-1', {
        name: 'Class 1',
        code: 'CLASS-1',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(transaction.auditLog.create).not.toHaveBeenCalled();
  });

  it('creates a section only under an active same-school class and records the actor', async () => {
    transaction.schoolClass.findFirst.mockResolvedValue({
      id: 'class-1',
      schoolId,
      isActive: true,
    });
    transaction.section.create.mockResolvedValue({
      id: 'section-1',
      schoolId,
      classId: 'class-1',
      name: 'Section A',
      code: 'A',
      capacity: 30,
    });

    await expect(
      service.createSection(schoolId, 'actor-1', {
        classId: 'class-1',
        name: 'Section A',
        code: 'A',
        capacity: 30,
      }),
    ).resolves.toMatchObject({ id: 'section-1' });

    expect(transaction.section.create).toHaveBeenCalledWith({
      data: {
        schoolId,
        classId: 'class-1',
        name: 'Section A',
        code: 'A',
        capacity: 30,
      },
    });
    expect(transaction.auditLog.create).toHaveBeenCalledWith({
      data: {
        schoolId,
        actorUserId: 'actor-1',
        action: 'SECTION_CREATED',
        resource: 'section',
        resourceId: 'section-1',
        summary: { classId: 'class-1', name: 'Section A', code: 'A' },
      },
    });
  });

  it('maps duplicate section codes to an explicit conflict', async () => {
    transaction.schoolClass.findFirst.mockResolvedValue({
      id: 'class-1',
      schoolId,
      isActive: true,
    });
    transaction.section.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('Duplicate section code', {
        code: 'P2002',
        clientVersion: 'test',
      }),
    );

    await expect(
      service.createSection(schoolId, 'actor-1', {
        classId: 'class-1',
        name: 'Section A',
        code: 'A',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(transaction.auditLog.create).not.toHaveBeenCalled();
  });
});
