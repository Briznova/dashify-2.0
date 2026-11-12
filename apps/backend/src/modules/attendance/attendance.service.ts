import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { CreateAttendanceSessionDto } from './dto/create-session.dto';
import { MarkRecordsDto } from './dto/mark-records.dto';

function parseCalendarDate(value: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new BadRequestException('date must use YYYY-MM-DD calendar-date format');
  }
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
    throw new BadRequestException('date must be a valid calendar date');
  }
  return date;
}

@Injectable()
export class AttendanceService {
  constructor(private readonly prisma: PrismaService) {}
  async createSession(schoolId: string, actorId: string, dto: CreateAttendanceSessionDto) {
    const date = parseCalendarDate(dto.date);
    return this.prisma.withTenant(schoolId, async (tx) => {
      const section = await tx.section.findFirst({ where: { id: dto.sectionId, classId: dto.classId, schoolId, isActive: true } });
      if (!section) throw new NotFoundException('Section not found');
      try {
        return await tx.attendanceSession.create({ data: { schoolId, classId: dto.classId, sectionId: dto.sectionId, date, createdBy: actorId } });
      } catch (error) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2002'
        ) {
          throw new ConflictException('Attendance session already exists for this class, section and date');
        }
        throw error;
      }
    });
  }
  async mark(schoolId: string, actorId: string, sessionId: string, dto: MarkRecordsDto) {
    const ids = dto.records.map((r) => r.studentId);
    if (new Set(ids).size !== ids.length) throw new BadRequestException('Duplicate student IDs are not allowed');
    return this.prisma.withTenant(schoolId, async (tx) => {
      const session = await tx.attendanceSession.findFirst({ where: { id: sessionId, schoolId } });
      if (!session) throw new NotFoundException();
      if (session.status !== 'OPEN') throw new ConflictException('Attendance session is closed');
      const eligible = await tx.studentEnrolment.findMany({
        where: { schoolId, isActive: true, classId: session.classId, sectionId: session.sectionId, studentId: { in: ids }, startDate: { lte: session.date }, OR: [{ endDate: null }, { endDate: { gte: session.date } }], student: { is: { schoolId, status: { not: 'ARCHIVED' } } } },
        select: { studentId: true },
      });
      if (eligible.length !== ids.length) throw new BadRequestException('One or more students are not enrolled in this section on the session date');
      const existing = await tx.attendanceRecord.findMany({
        where: { schoolId, sessionId, studentId: { in: ids } },
        select: { studentId: true },
      });
      if (existing.length) {
        throw new ConflictException('Attendance corrections are not available');
      }
      const result = await tx.attendanceRecord.createMany({
        data: dto.records.map((record) => ({
          schoolId,
          sessionId,
          studentId: record.studentId,
          status: record.status,
          remarks: record.remarks,
          markedBy: actorId,
        })),
      });
      return { success: true, count: result.count };
    });
  }
  async close(schoolId: string, actorId: string, sessionId: string) {
    return this.prisma.withTenant(schoolId, async (tx) => {
      const result = await tx.attendanceSession.updateMany({ where: { id: sessionId, schoolId, status: 'OPEN' }, data: { status: 'CLOSED', closedAt: new Date() } });
      if (!result.count) throw new NotFoundException();
      await tx.auditLog.create({ data: { schoolId, actorUserId: actorId, action: 'ATTENDANCE_SESSION_CLOSED', resource: 'attendance_session', resourceId: sessionId } });
      return { success: true };
    });
  }
  async list(schoolId: string, date: string) {
    const sessionDate = parseCalendarDate(date);
    return this.prisma.withTenant(schoolId, (tx) => tx.attendanceSession.findMany({ where: { schoolId, date: sessionDate }, include: { records: true }, orderBy: { createdAt: 'desc' } }));
  }

  async roster(schoolId: string, sessionId: string) {
    return this.prisma.withTenant(schoolId, async (tx) => {
      const session = await tx.attendanceSession.findFirst({
        where: { id: sessionId, schoolId },
        select: { id: true, classId: true, sectionId: true, date: true },
      });
      if (!session) throw new NotFoundException('Attendance session not found');

      const enrolments = await tx.studentEnrolment.findMany({
        where: {
          schoolId,
          isActive: true,
          classId: session.classId,
          sectionId: session.sectionId,
          startDate: { lte: session.date },
          OR: [{ endDate: null }, { endDate: { gte: session.date } }],
          student: { is: { schoolId, status: { not: 'ARCHIVED' } } },
        },
        select: {
          student: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              admissionNumber: true,
              attendanceRecords: {
                where: { schoolId, sessionId },
                select: {
                  studentId: true,
                  status: true,
                  remarks: true,
                  markedAt: true,
                },
              },
            },
          },
        },
        orderBy: { student: { lastName: 'asc' } },
      });

      return enrolments.map(({ student }) => ({
        id: student.id,
        firstName: student.firstName,
        lastName: student.lastName,
        admissionNumber: student.admissionNumber,
        record: student.attendanceRecords[0] ?? null,
      }));
    });
  }
}
