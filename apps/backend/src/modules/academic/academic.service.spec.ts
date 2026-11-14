import { ConflictException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { AcademicService } from './academic.service';

describe('AcademicService tenant scoping', () => {
  const schoolId = 'school-1';
  let service: AcademicService;
  let transaction: {
    academicYear: { findMany: jest.Mock; findFirst: jest.Mock; create: jest.Mock; update: jest.Mock };
    gradeScale: { findFirst: jest.Mock; upsert: jest.Mock };
    schoolClass: { findMany: jest.Mock; findFirst: jest.Mock; create: jest.Mock; update: jest.Mock };
    section: { findFirst: jest.Mock; create: jest.Mock; update: jest.Mock };
    studentEnrolment: { groupBy: jest.Mock };
    $queryRaw: jest.Mock;
    auditLog: { create: jest.Mock };
  };
  let withTenant: jest.Mock;

  beforeEach(() => {
    transaction = {
      academicYear: { findMany: jest.fn(), findFirst: jest.fn(), create: jest.fn(), update: jest.fn() },
      gradeScale: { findFirst: jest.fn(), upsert: jest.fn() },
      schoolClass: { findMany: jest.fn(), findFirst: jest.fn(), create: jest.fn(), update: jest.fn() },
      section: { findFirst: jest.fn(), create: jest.fn(), update: jest.fn() },
      studentEnrolment: { groupBy: jest.fn() },
      $queryRaw: jest.fn().mockResolvedValue([{ id: schoolId, timezone: 'Asia/Kolkata' }]),
      auditLog: { create: jest.fn() },
    };
    withTenant = jest.fn(
      (_tenantId: string, work: (tx: typeof transaction) => Promise<unknown>) =>
        work(transaction),
    );
    service = new AcademicService({ withTenant } as unknown as PrismaService);
  });

  afterEach(() => {
    jest.useRealTimers();
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

  it('activates a draft year when the school-local date is within its range and no other year is active', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-04-14T20:00:00.000Z'));
    const year = {
      id: 'year-1',
      schoolId,
      name: '2026-2027',
      startDate: new Date('2026-04-15T00:00:00.000Z'),
      endDate: new Date('2027-03-31T00:00:00.000Z'),
      status: 'DRAFT',
    };
    transaction.academicYear.findFirst
      .mockResolvedValueOnce(year)
      .mockResolvedValueOnce(null);
    transaction.academicYear.update.mockResolvedValue({ ...year, status: 'ACTIVE' });

    await expect(
      service.activateYear(schoolId, 'actor-1', 'year-1'),
    ).resolves.toMatchObject({ id: 'year-1', status: 'ACTIVE' });
    expect(transaction.academicYear.findFirst).toHaveBeenNthCalledWith(2, {
      where: { schoolId, status: 'ACTIVE' },
      select: { id: true, name: true },
    });
    expect(transaction.academicYear.update).toHaveBeenCalledWith({
      where: { id: 'year-1' },
      data: { status: 'ACTIVE' },
    });
    expect(transaction.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: 'ACADEMIC_YEAR_ACTIVATED',
          resourceId: 'year-1',
        }),
      }),
    );
  });

  it('blocks activation while another academic year is active', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-04-15T12:00:00.000Z'));
    transaction.academicYear.findFirst
      .mockResolvedValueOnce({
        id: 'year-2',
        name: '2026-2027',
        startDate: new Date('2026-04-01T00:00:00.000Z'),
        endDate: new Date('2027-03-31T00:00:00.000Z'),
        status: 'DRAFT',
      })
      .mockResolvedValueOnce({ id: 'year-1', name: '2025-2026' });

    await expect(
      service.activateYear(schoolId, 'actor-1', 'year-2'),
    ).rejects.toThrow('Complete the currently active academic year');
    expect(transaction.academicYear.update).not.toHaveBeenCalled();
  });

  it('rejects activation before the academic year starts', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-04-14T12:00:00.000Z'));
    transaction.academicYear.findFirst
      .mockResolvedValueOnce({
        id: 'year-1',
        name: '2026-2027',
        startDate: new Date('2026-04-15T00:00:00.000Z'),
        endDate: new Date('2027-03-31T00:00:00.000Z'),
        status: 'DRAFT',
      })
      .mockResolvedValueOnce(null);

    await expect(
      service.activateYear(schoolId, 'actor-1', 'year-1'),
    ).rejects.toThrow('only be activated during its date range');
    expect(transaction.academicYear.update).not.toHaveBeenCalled();
  });

  it('rejects activation after the academic year ends', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2027-04-01T12:00:00.000Z'));
    transaction.academicYear.findFirst
      .mockResolvedValueOnce({
        id: 'year-1',
        name: '2026-2027',
        startDate: new Date('2026-04-01T00:00:00.000Z'),
        endDate: new Date('2027-03-31T00:00:00.000Z'),
        status: 'DRAFT',
      })
      .mockResolvedValueOnce(null);

    await expect(
      service.activateYear(schoolId, 'actor-1', 'year-1'),
    ).rejects.toThrow('only be activated during its date range');
    expect(transaction.academicYear.update).not.toHaveBeenCalled();
  });

  it('completes an active year only after its end date', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2027-04-01T12:00:00.000Z'));
    const year = {
      id: 'year-1',
      name: '2026-2027',
      endDate: new Date('2027-03-31T00:00:00.000Z'),
      status: 'ACTIVE',
    };
    transaction.academicYear.findFirst.mockResolvedValue(year);
    transaction.academicYear.update.mockResolvedValue({ ...year, status: 'COMPLETED' });

    await expect(
      service.completeYear(schoolId, 'actor-1', 'year-1'),
    ).resolves.toMatchObject({ id: 'year-1', status: 'COMPLETED' });
    expect(transaction.academicYear.update).toHaveBeenCalledWith({
      where: { id: 'year-1' },
      data: { status: 'COMPLETED' },
    });
    expect(transaction.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: 'ACADEMIC_YEAR_COMPLETED',
          resourceId: 'year-1',
        }),
      }),
    );
  });

  it('blocks completing an academic year on its end date', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2027-03-31T12:00:00.000Z'));
    transaction.academicYear.findFirst.mockResolvedValue({
      id: 'year-1',
      name: '2026-2027',
      endDate: new Date('2027-03-31T00:00:00.000Z'),
      status: 'ACTIVE',
    });

    await expect(
      service.completeYear(schoolId, 'actor-1', 'year-1'),
    ).rejects.toThrow('only be completed after its end date');
    expect(transaction.academicYear.update).not.toHaveBeenCalled();
  });

  it('does not transition an academic year outside the active school', async () => {
    transaction.academicYear.findFirst.mockResolvedValue(null);

    await expect(
      service.activateYear(schoolId, 'actor-1', 'foreign-year'),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(transaction.academicYear.update).not.toHaveBeenCalled();
  });

  it("saves a complete grade scale for an active-school academic year", async () => {
    transaction.academicYear.findFirst.mockResolvedValue({
      id: "year-1",
      name: "2025-26",
    });
    const bands = [
      { id: "band-1", label: "Needs work", minPercent: 0, maxPercent: 39 },
      { id: "band-2", label: "Pass", minPercent: 40, maxPercent: 100 },
    ];
    transaction.gradeScale.upsert.mockResolvedValue({
      id: "scale-1",
      bands,
    });

    await expect(
      service.saveGradeScale(schoolId, "actor-1", "year-1", {
        bands: [
          { label: "Pass", minPercent: 40, maxPercent: 100 },
          { label: "Needs work", minPercent: 0, maxPercent: 39 },
        ],
      }),
    ).resolves.toEqual({
      academicYearId: "year-1",
      academicYearName: "2025-26",
      bands,
    });
    expect(transaction.gradeScale.upsert).toHaveBeenCalledWith({
      where: { academicYearId: "year-1" },
      create: {
        schoolId,
        academicYearId: "year-1",
        bands: {
          create: [
            { label: "Needs work", minPercent: 0, maxPercent: 39 },
            { label: "Pass", minPercent: 40, maxPercent: 100 },
          ],
        },
      },
      update: {
        bands: {
          deleteMany: {},
          create: [
            { label: "Needs work", minPercent: 0, maxPercent: 39 },
            { label: "Pass", minPercent: 40, maxPercent: 100 },
          ],
        },
      },
      include: { bands: { orderBy: { minPercent: "asc" } } },
    });
    expect(transaction.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: "GRADE_SCALE_UPDATED",
          summary: { academicYearId: "year-1", bandCount: 2 },
        }),
      }),
    );
  });

  it("rejects grade scales with gaps before writing", async () => {
    await expect(
      service.saveGradeScale(schoolId, "actor-1", "year-1", {
        bands: [
          { label: "Fail", minPercent: 0, maxPercent: 49 },
          { label: "Pass", minPercent: 51, maxPercent: 100 },
        ],
      }),
    ).rejects.toThrow("Grade bands must cover 0-100 without gaps or overlaps");
    expect(withTenant).not.toHaveBeenCalled();
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

  it('creates a class and its first section with both audits in one tenant transaction', async () => {
    transaction.schoolClass.create.mockResolvedValue({ id: 'class-1', schoolId, name: 'Class 1', code: 'C1' });
    transaction.section.create.mockResolvedValue({ id: 'section-1', schoolId, classId: 'class-1', name: 'A', code: 'A' });
    const dto = { name: 'Class 1', code: 'C1', section: { name: 'A', code: 'A', capacity: 30 } };
    await expect(service.createClassWithSection(schoolId, 'actor-1', dto))
      .resolves.toMatchObject({ id: 'class-1', sections: [{ id: 'section-1' }] });
    expect(withTenant).toHaveBeenCalledTimes(1);
    expect(transaction.section.create).toHaveBeenCalledWith({
      data: { schoolId, classId: 'class-1', name: 'A', code: 'A', capacity: 30 },
    });
    expect(transaction.auditLog.create).toHaveBeenCalledTimes(2);
    expect(transaction.auditLog.create).toHaveBeenNthCalledWith(2, {
      data: {
        schoolId, actorUserId: 'actor-1', action: 'SECTION_CREATED', resource: 'section',
        resourceId: 'section-1', summary: { classId: 'class-1', name: 'A', code: 'A' },
      },
    });
  });

  it('propagates section and audit failures from combined creation', async () => {
    transaction.schoolClass.create.mockResolvedValue({ id: 'class-1' });
    const dto = { name: 'Class 1', code: 'C1', section: { name: 'A', code: 'A' } };
    const failure = new Error('write failed');
    transaction.section.create.mockRejectedValueOnce(failure).mockResolvedValueOnce({ id: 'section-1' });
    await expect(service.createClassWithSection(schoolId, 'actor-1', dto)).rejects.toBe(failure);
    transaction.auditLog.create.mockRejectedValueOnce(failure);
    await expect(service.createClassWithSection(schoolId, 'actor-1', dto)).rejects.toBe(failure);
  });

  it('reports a duplicate class code for combined creation', async () => {
    transaction.schoolClass.create.mockRejectedValue(new Prisma.PrismaClientKnownRequestError('Duplicate', {
      code: 'P2002', clientVersion: 'test',
    }));
    await expect(service.createClassWithSection(schoolId, 'actor-1', {
      name: 'Class 1', code: 'C1', section: { name: 'A', code: 'A' },
    })).rejects.toBeInstanceOf(ConflictException);
    expect(transaction.section.create).not.toHaveBeenCalled();
  });

  it('updates only an active same-school class and audits it', async () => {
    transaction.schoolClass.findFirst.mockResolvedValue({ id: 'class-1' });
    transaction.schoolClass.update.mockResolvedValue({ id: 'class-1', sections: [] });
    const input = { name: 'Grade 1', code: 'G1', sortOrder: 1 };
    await service.updateClass(schoolId, 'actor-1', 'class-1', input);
    expect(transaction.schoolClass.findFirst).toHaveBeenCalledWith({ where: { id: 'class-1', schoolId, isActive: true } });
    expect(transaction.schoolClass.update).toHaveBeenCalledWith({ where: { id: 'class-1' }, data: input, include: { sections: true } });
    expect(transaction.auditLog.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ action: 'CLASS_UPDATED', schoolId, actorUserId: 'actor-1' }) }));
    transaction.schoolClass.findFirst.mockResolvedValue(null);
    await expect(service.updateClass(schoolId, 'actor-1', 'foreign', input)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rejects capacity below any year occupancy but allows the per-year maximum and no limit', async () => {
    transaction.section.findFirst.mockResolvedValue({ id: 'section-1' });
    transaction.studentEnrolment.groupBy.mockResolvedValue([{ _count: { _all: 4 } }, { _count: { _all: 3 } }]);
    transaction.section.update.mockResolvedValue({ id: 'section-1' });
    const input = { name: 'A', code: 'A', capacity: 3 };
    await expect(service.updateSection(schoolId, 'actor-1', 'class-1', 'section-1', input)).rejects.toBeInstanceOf(ConflictException);
    expect(transaction.section.update).not.toHaveBeenCalled();
    expect(transaction.$queryRaw).toHaveBeenCalled();
    expect(transaction.studentEnrolment.groupBy).toHaveBeenCalledWith({
      by: ['academicYearId'], where: {
        schoolId, sectionId: 'section-1', isActive: true, endDate: null,
        student: { is: { schoolId, status: { not: 'ARCHIVED' } } },
      }, _count: { _all: true },
    });
    await service.updateSection(schoolId, 'actor-1', 'class-1', 'section-1', { ...input, capacity: 4 });
    await service.updateSection(schoolId, 'actor-1', 'class-1', 'section-1', { ...input, capacity: null });
    expect(transaction.studentEnrolment.groupBy).toHaveBeenCalledTimes(2);
    expect(transaction.auditLog.create).toHaveBeenCalledTimes(2);
  });

  it('rejects foreign sections and reports duplicate codes', async () => {
    transaction.section.findFirst.mockResolvedValueOnce(null).mockResolvedValueOnce({ id: 'section-1' });
    const input = { name: 'A', code: 'A', capacity: null };
    await expect(service.updateSection(schoolId, 'actor-1', 'class-1', 'foreign', input)).rejects.toBeInstanceOf(NotFoundException);
    expect(transaction.section.findFirst).toHaveBeenCalledWith({
      where: { id: 'foreign', schoolId, classId: 'class-1', isActive: true, class: { is: { schoolId, isActive: true } } },
    });
    transaction.section.update.mockRejectedValue(new Prisma.PrismaClientKnownRequestError('Duplicate', {
      code: 'P2002', clientVersion: 'test',
    }));
    await expect(service.updateSection(schoolId, 'actor-1', 'class-1', 'section-1', input)).rejects.toBeInstanceOf(ConflictException);
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
