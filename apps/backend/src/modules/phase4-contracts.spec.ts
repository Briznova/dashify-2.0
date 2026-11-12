import { validate } from 'class-validator';
import { PERMISSIONS_KEY } from '../common/decorators/permissions.decorator';
import { AcademicController } from './academic/academic.controller';
import { CreateAcademicYearDto } from './academic/dto/create-academic-year.dto';
import { AttendanceController } from './attendance/attendance.controller';
import { CreateAttendanceSessionDto } from './attendance/dto/create-session.dto';
import { MarkRecordsDto } from './attendance/dto/mark-records.dto';
import { SchoolsController } from './schools/schools.controller';
import { UpdateSchoolDto } from './schools/dto/update-school.dto';
import { StudentsController } from './students/students.controller';
import { CreateStudentDto } from './students/dto/create-student.dto';

function routePermissions(
  controller: object,
  methodName: string,
): string[] | undefined {
  const method = (controller as Record<string, unknown>)[methodName];
  if (typeof method !== 'function') return undefined;
  return Reflect.getMetadata(PERMISSIONS_KEY, method);
}

describe('Phase 4 controller permissions', () => {
  it('protects the school profile and academic structure routes with the intended permissions', () => {
    expect(routePermissions(SchoolsController.prototype, 'get')).toEqual([
      'school.read',
    ]);
    expect(routePermissions(SchoolsController.prototype, 'update')).toEqual([
      'school.update',
    ]);
    expect(routePermissions(AcademicController.prototype, 'years')).toEqual([
      'academic_structure.read',
    ]);
    expect(routePermissions(AcademicController.prototype, 'classes')).toEqual([
      'academic_structure.read',
    ]);
    expect(routePermissions(AcademicController.prototype, 'createYear')).toEqual([
      'academic_structure.manage',
    ]);
    expect(routePermissions(AcademicController.prototype, 'createClass')).toEqual([
      'academic_structure.manage',
    ]);
    expect(routePermissions(AcademicController.prototype, 'createSection')).toEqual([
      'academic_structure.manage',
    ]);
  });

  it('protects student and attendance reads and writes with the intended permissions', () => {
    expect(routePermissions(StudentsController.prototype, 'list')).toEqual([
      'students.read',
    ]);
    expect(routePermissions(StudentsController.prototype, 'get')).toEqual([
      'students.read',
    ]);
    expect(routePermissions(StudentsController.prototype, 'create')).toEqual([
      'students.create',
    ]);
    expect(routePermissions(AttendanceController.prototype, 'list')).toEqual([
      'attendance.read',
    ]);
    expect(routePermissions(AttendanceController.prototype, 'roster')).toEqual([
      'attendance.read',
    ]);
    expect(routePermissions(AttendanceController.prototype, 'create')).toEqual([
      'attendance.mark',
    ]);
    expect(routePermissions(AttendanceController.prototype, 'mark')).toEqual([
      'attendance.mark',
    ]);
    expect(routePermissions(AttendanceController.prototype, 'close')).toEqual([
      'attendance.correct',
    ]);
  });
});

describe('Phase 4 request validation', () => {
  it('rejects invalid academic-year and school-profile fields', async () => {
    const academicYear = Object.assign(new CreateAcademicYearDto(), {
      name: 'x'.repeat(81),
      startDate: 'not-a-date',
      endDate: '2027-03-31',
    });
    const schoolProfile = Object.assign(new UpdateSchoolDto(), {
      email: 'not-an-email',
      phone: 'x'.repeat(31),
    });

    const academicErrors = await validate(academicYear);
    const schoolErrors = await validate(schoolProfile);
    expect(academicErrors.map(({ property }) => property)).toEqual(
      expect.arrayContaining(['name', 'startDate']),
    );
    expect(schoolErrors.map(({ property }) => property)).toEqual(
      expect.arrayContaining(['email', 'phone']),
    );
  });

  it('rejects invalid student IDs and attendance session/record input', async () => {
    const student = Object.assign(new CreateStudentDto(), {
      admissionNumber: 'ADM-001',
      firstName: 'Aarav',
      admissionDate: '2026-04-01',
      academicYearId: 'not-a-uuid',
      classId: 'not-a-uuid',
      sectionId: 'not-a-uuid',
      guardians: [],
    });
    const session = Object.assign(new CreateAttendanceSessionDto(), {
      classId: 'not-a-uuid',
      sectionId: 'not-a-uuid',
      date: 'not-a-date',
    });
    const attendance = Object.assign(new MarkRecordsDto(), {
      records: [],
    });

    const studentErrors = await validate(student);
    const sessionErrors = await validate(session);
    const attendanceErrors = await validate(attendance);
    expect(studentErrors.map(({ property }) => property)).toEqual(
      expect.arrayContaining(['academicYearId', 'classId', 'sectionId']),
    );
    expect(sessionErrors.map(({ property }) => property)).toEqual(
      expect.arrayContaining(['classId', 'sectionId', 'date']),
    );
    expect(attendanceErrors.map(({ property }) => property)).toContain('records');
  });
});
