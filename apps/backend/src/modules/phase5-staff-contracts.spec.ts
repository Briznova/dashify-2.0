import { validate } from 'class-validator';
import { PERMISSIONS_KEY } from '../common/decorators/permissions.decorator';
import { AssignTeacherDto } from './staff/dto/assign-teacher.dto';
import { CreateStaffDto } from './staff/dto/create-staff.dto';
import { StaffController } from './staff/staff.controller';

function routePermissions(
  controller: object,
  methodName: string,
): string[] | undefined {
  const method = (controller as Record<string, unknown>)[methodName];
  if (typeof method !== 'function') return undefined;
  return Reflect.getMetadata(PERMISSIONS_KEY, method);
}

describe('Phase 5 staff and teacher-assignment permissions', () => {
  it('protects staff and teacher-assignment routes with the intended permissions', () => {
    expect(routePermissions(StaffController.prototype, 'list')).toEqual([
      'staff.read',
    ]);
    expect(routePermissions(StaffController.prototype, 'get')).toEqual([
      'staff.read',
    ]);
    expect(routePermissions(StaffController.prototype, 'create')).toEqual([
      'staff.manage',
    ]);
    expect(routePermissions(StaffController.prototype, 'teacherAssignments')).toEqual([
      'staff.read',
    ]);
    expect(routePermissions(StaffController.prototype, 'assignTeacher')).toEqual([
      'staff.manage',
    ]);
  });

  it('rejects invalid staff and assignment fields', async () => {
    const staff = Object.assign(new CreateStaffDto(), {
      employeeCode: 'x'.repeat(25),
      firstName: 'A',
      email: 'not-an-email',
      phone: 'x'.repeat(35),
      designation: 'x'.repeat(90),
    });

    const assignment = Object.assign(new AssignTeacherDto(), {
      staffId: 'not-a-uuid',
      classId: 'not-a-uuid',
      sectionId: 'not-a-uuid',
      subject: 'x'.repeat(90),
    });

    const staffErrors = await validate(staff);
    const assignmentErrors = await validate(assignment);

    expect(staffErrors.map(({ property }) => property)).toEqual(
      expect.arrayContaining(['employeeCode', 'email', 'phone', 'designation']),
    );
    expect(assignmentErrors.map(({ property }) => property)).toEqual(
      expect.arrayContaining(['staffId', 'classId', 'sectionId', 'subject']),
    );
  });
});
