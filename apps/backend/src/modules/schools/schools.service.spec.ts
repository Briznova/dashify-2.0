import { NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { SchoolsService } from './schools.service';

describe('SchoolsService active-school scope', () => {
  const schoolId = 'school-1';
  let service: SchoolsService;
  let transaction: {
    school: {
      findFirst: jest.Mock;
      updateMany: jest.Mock;
      findUniqueOrThrow: jest.Mock;
    };
  };
  let withTenant: jest.Mock;

  beforeEach(() => {
    transaction = {
      school: {
        findFirst: jest.fn(),
        updateMany: jest.fn(),
        findUniqueOrThrow: jest.fn(),
      },
    };
    withTenant = jest.fn(
      (_tenantId: string, work: (tx: typeof transaction) => Promise<unknown>) =>
        work(transaction),
    );
    service = new SchoolsService({ withTenant } as unknown as PrismaService);
  });

  it('reads only the active school profile', async () => {
    const school = { id: schoolId, name: 'Northstar Academy', isActive: true };
    transaction.school.findFirst.mockResolvedValue(school);

    await expect(service.getCurrent(schoolId)).resolves.toEqual(school);
    expect(withTenant).toHaveBeenCalledWith(schoolId, expect.any(Function));
    expect(transaction.school.findFirst).toHaveBeenCalledWith({
      where: { id: schoolId, isActive: true },
    });
  });

  it('does not update a missing school profile', async () => {
    transaction.school.updateMany.mockResolvedValue({ count: 0 });

    await expect(
      service.updateCurrent(schoolId, { name: 'Updated School' }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(transaction.school.updateMany).toHaveBeenCalledWith({
      where: { id: schoolId, isActive: true },
      data: { name: 'Updated School' },
    });
    expect(transaction.school.findUniqueOrThrow).not.toHaveBeenCalled();
  });
});
