import { NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { AcademicService } from './academic.service';

describe('AcademicService tenant scoping', () => {
  const schoolId = 'school-1';
  let service: AcademicService;
  let transaction: {
    academicYear: { findMany: jest.Mock; findFirst: jest.Mock; create: jest.Mock };
    schoolClass: { findMany: jest.Mock; findFirst: jest.Mock; create: jest.Mock };
    section: { create: jest.Mock };
  };
  let withTenant: jest.Mock;

  beforeEach(() => {
    transaction = {
      academicYear: { findMany: jest.fn(), findFirst: jest.fn(), create: jest.fn() },
      schoolClass: { findMany: jest.fn(), findFirst: jest.fn(), create: jest.fn() },
      section: { create: jest.fn() },
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
      service.createSection(schoolId, {
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
});
