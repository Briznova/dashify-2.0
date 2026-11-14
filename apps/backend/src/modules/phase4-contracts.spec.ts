import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { PERMISSIONS_KEY } from '../common/decorators/permissions.decorator';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { AcademicController } from './academic/academic.controller';
import { CreateAcademicYearDto } from './academic/dto/create-academic-year.dto';
import { CreateClassDto } from './academic/dto/create-class.dto';
import { CreateClassWithSectionDto } from './academic/dto/create-class-with-section.dto';
import { CreateSectionDto } from './academic/dto/create-section.dto';
import { UpdateClassDto } from './academic/dto/update-class.dto';
import { UpdateSectionDto } from './academic/dto/update-section.dto';
import { AttendanceController } from './attendance/attendance.controller';
import { CreateAttendanceSessionDto } from './attendance/dto/create-session.dto';
import { MarkRecordsDto } from './attendance/dto/mark-records.dto';
import { SchoolsController } from './schools/schools.controller';
import { UpdateSchoolDto } from './schools/dto/update-school.dto';
import { StudentsController } from './students/students.controller';
import { CreateStudentDto } from './students/dto/create-student.dto';
import { UpdateStudentDto } from './students/dto/update-student.dto';

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
    expect(routePermissions(AcademicController.prototype, 'createClassWithSection')).toEqual([
      'academic_structure.manage',
    ]);
    expect(routePermissions(AcademicController.prototype, 'updateClass')).toEqual(['academic_structure.manage']);
    expect(routePermissions(AcademicController.prototype, 'updateSection')).toEqual(['academic_structure.manage']);
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
    expect(routePermissions(StudentsController.prototype, 'update')).toEqual([
      'students.update',
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

  it('denies direct class and section creation without academic_structure.manage', () => {
    const guard = new PermissionsGuard(new Reflector());
    for (const method of ['createClass', 'createClassWithSection', 'createSection', 'updateClass', 'updateSection'] as const) {
      const handler = AcademicController.prototype[method];
      const context = (permissions: string[]) =>
        ({
          getHandler: () => handler,
          getClass: () => AcademicController,
          switchToHttp: () => ({
            getRequest: () => ({ user: { permissions } }),
          }),
        }) as unknown as ExecutionContext;

      expect(() => guard.canActivate(context([]))).toThrow(ForbiddenException);
      expect(() =>
        guard.canActivate(context(['academic_structure.manage'])),
      ).not.toThrow();
    }
  });
});

describe('Phase 4 request validation', () => {
  it('validates complete class and section edits, including clearing capacity', async () => {
    expect(await validate(plainToInstance(UpdateClassDto, { name: 'A', code: 'A', sortOrder: 0 }))).toHaveLength(0);
    expect(await validate(plainToInstance(UpdateSectionDto, { name: 'A', code: 'A', capacity: null }))).toHaveLength(0);
    expect((await validate(plainToInstance(UpdateClassDto, { name: 'A', code: 'A' }))).map((error) => error.property)).toContain('sortOrder');
    expect((await validate(plainToInstance(UpdateSectionDto, { name: 'A', code: 'A' }))).map((error) => error.property)).toContain('capacity');
    expect((await validate(plainToInstance(UpdateSectionDto, { name: 'A', code: 'A', capacity: 0 }))).map((error) => error.property)).toContain('capacity');
  });

  it('requires and validates the first section in combined creation', async () => {
    const valid = plainToInstance(CreateClassWithSectionDto, {
      name: 'Grade 1', code: 'G1', section: { name: 'A', code: 'A' },
    });
    expect(await validate(valid, { whitelist: true, forbidNonWhitelisted: true })).toHaveLength(0);
    const missing = plainToInstance(CreateClassWithSectionDto, { name: 'Grade 1', code: 'G1' });
    expect((await validate(missing)).map((error) => error.property)).toContain('section');
    const invalid = plainToInstance(CreateClassWithSectionDto, {
      name: 'Grade 1', code: 'G1', section: { name: '', code: 'A', capacity: 0 },
    });
    const errors = await validate(invalid);
    expect(errors.find((error) => error.property === 'section')?.children?.map((error) => error.property))
      .toEqual(expect.arrayContaining(['name', 'capacity']));
    const array = plainToInstance(CreateClassWithSectionDto, {
      name: 'Grade 1', code: 'G1', section: [{ name: 'A', code: 'A' }],
    });
    expect((await validate(array)).find((error) => error.property === 'section')?.constraints)
      .toHaveProperty('isObject');
    const extra = plainToInstance(CreateClassWithSectionDto, {
      name: 'Grade 1', code: 'G1', schoolId: 'other-school',
      section: { name: 'A', code: 'A', classId: 'other-class' },
    });
    const extraErrors = await validate(extra, { whitelist: true, forbidNonWhitelisted: true });
    expect(extraErrors.map((error) => error.property)).toContain('schoolId');
    expect(extraErrors.find((error) => error.property === 'section')?.children?.map((error) => error.property))
      .toContain('classId');
  });

  it('rejects invalid class and section creation fields', async () => {
    const classroom = Object.assign(new CreateClassDto(), {
      name: '',
      code: 'x'.repeat(21),
      sortOrder: -1,
    });
    const section = Object.assign(new CreateSectionDto(), {
      classId: 'not-a-uuid',
      name: '',
      code: '',
      capacity: 0,
    });

    const classErrors = await validate(classroom);
    const sectionErrors = await validate(section);
    expect(classErrors.map(({ property }) => property)).toEqual(
      expect.arrayContaining(['name', 'code', 'sortOrder']),
    );
    expect(sectionErrors.map(({ property }) => property)).toEqual(
      expect.arrayContaining(['classId', 'name', 'code', 'capacity']),
    );
  });

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
    const updateStudent = Object.assign(new UpdateStudentDto(), {
      academicYearId: 'still-not-a-uuid',
      guardians: [{
        firstName: 'Priya',
        relationship: 'MOTHER',
        phone: 'bad-phone',
      }],
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
    const studentUpdateErrors = await validate(updateStudent);
    const sessionErrors = await validate(session);
    const attendanceErrors = await validate(attendance);
    expect(studentErrors.map(({ property }) => property)).toEqual(
      expect.arrayContaining(['academicYearId', 'classId', 'sectionId']),
    );
    expect(studentUpdateErrors.map(({ property }) => property)).toEqual(
      expect.arrayContaining(['academicYearId', 'guardians']),
    );
    expect(sessionErrors.map(({ property }) => property)).toEqual(
      expect.arrayContaining(['classId', 'sectionId', 'date']),
    );
    expect(attendanceErrors.map(({ property }) => property)).toContain('records');
  });
});
