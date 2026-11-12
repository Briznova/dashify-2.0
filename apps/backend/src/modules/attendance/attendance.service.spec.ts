import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { AttendanceService } from './attendance.service';

describe('AttendanceService roster', () => {
  const schoolId = 'school-1';
  const sessionId = 'session-1';
  let service: AttendanceService;
  let transaction: {
    attendanceSession: { findFirst: jest.Mock; findMany: jest.Mock };
    studentEnrolment: { findMany: jest.Mock };
    attendanceRecord: { findMany: jest.Mock; createMany: jest.Mock };
  };

  beforeEach(() => {
    transaction = {
      attendanceSession: { findFirst: jest.fn(), findMany: jest.fn() },
      studentEnrolment: { findMany: jest.fn() },
      attendanceRecord: { findMany: jest.fn(), createMany: jest.fn() },
    };
    const prisma = {
      withTenant: jest.fn(
        (_tenantId: string, work: (tx: typeof transaction) => Promise<unknown>) =>
          work(transaction),
      ),
    } as unknown as PrismaService;
    service = new AttendanceService(prisma);
  });

  it('returns only active students enrolled in the session section on its date', async () => {
    const session = {
      id: sessionId,
      classId: 'class-1',
      sectionId: 'section-1',
      date: new Date('2026-04-02T00:00:00.000Z'),
    };
    const student = {
      id: 'student-1',
      firstName: 'Aarav',
      lastName: 'Sharma',
      admissionNumber: 'ADM-001',
      attendanceRecords: [
        {
          studentId: 'student-1',
          status: 'PRESENT',
          remarks: null,
          markedAt: new Date('2026-04-02T08:00:00.000Z'),
        },
      ],
    };
    transaction.attendanceSession.findFirst.mockResolvedValue(session);
    transaction.studentEnrolment.findMany.mockResolvedValue([{ student }]);

    await expect(service.roster(schoolId, sessionId)).resolves.toEqual([
      {
        id: student.id,
        firstName: student.firstName,
        lastName: student.lastName,
        admissionNumber: student.admissionNumber,
        record: student.attendanceRecords[0],
      },
    ]);

    expect(transaction.attendanceSession.findFirst).toHaveBeenCalledWith({
      where: { id: sessionId, schoolId },
      select: { id: true, classId: true, sectionId: true, date: true },
    });
    expect(transaction.studentEnrolment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          schoolId,
          isActive: true,
          classId: session.classId,
          sectionId: session.sectionId,
          startDate: { lte: session.date },
          OR: [{ endDate: null }, { endDate: { gte: session.date } }],
          student: { is: { schoolId, status: { not: 'ARCHIVED' } } },
        }),
      }),
    );
    expect(transaction.studentEnrolment.findMany.mock.calls[0][0].select.student.select.attendanceRecords)
      .toEqual({ where: { schoolId, sessionId }, select: expect.any(Object) });
  });

  it('does not expose sessions belonging to another school', async () => {
    transaction.attendanceSession.findFirst.mockResolvedValue(null);

    await expect(service.roster(schoolId, sessionId)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(transaction.attendanceSession.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: sessionId, schoolId } }),
    );
    expect(transaction.studentEnrolment.findMany).not.toHaveBeenCalled();
  });

  it('rejects attempts to change an attendance record when corrections are deferred', async () => {
    transaction.attendanceSession.findFirst.mockResolvedValue({
      id: sessionId,
      classId: 'class-1',
      sectionId: 'section-1',
      date: new Date('2026-04-02T00:00:00.000Z'),
      status: 'OPEN',
    });
    transaction.studentEnrolment.findMany.mockResolvedValue([{ studentId: 'student-1' }]);
    transaction.attendanceRecord.findMany.mockResolvedValue([{ studentId: 'student-1' }]);

    await expect(
      service.mark(schoolId, 'actor-1', sessionId, {
        records: [{ studentId: 'student-1', status: 'ABSENT' }],
      }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(transaction.attendanceRecord.createMany).not.toHaveBeenCalled();
  });

  it('rejects students not enrolled in this school section on the session date', async () => {
    transaction.attendanceSession.findFirst.mockResolvedValue({
      id: sessionId,
      classId: 'class-1',
      sectionId: 'section-1',
      date: new Date('2026-04-02T00:00:00.000Z'),
      status: 'OPEN',
    });
    transaction.studentEnrolment.findMany.mockResolvedValue([]);

    await expect(
      service.mark(schoolId, 'actor-1', sessionId, {
        records: [{ studentId: 'foreign-student', status: 'PRESENT' }],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(transaction.attendanceRecord.findMany).not.toHaveBeenCalled();
    expect(transaction.attendanceRecord.createMany).not.toHaveBeenCalled();
  });

  it('accepts only real YYYY-MM-DD calendar dates when listing sessions', async () => {
    transaction.attendanceSession.findMany.mockResolvedValue([]);

    await expect(service.list(schoolId, '2026-04-02')).resolves.toEqual([]);
    expect(transaction.attendanceSession.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { schoolId, date: new Date('2026-04-02T00:00:00.000Z') },
      }),
    );
    await expect(service.list(schoolId, '2026-02-31')).rejects.toBeInstanceOf(
      BadRequestException,
    );
    await expect(service.list(schoolId, '2026-04-02T00:00:00Z')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
});
