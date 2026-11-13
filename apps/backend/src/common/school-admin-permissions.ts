export const SCHOOL_ADMIN_PERMISSIONS = [
  'school.read', 'school.update', 'users.read', 'users.invite', 'users.update', 'users.disable',
  'roles.read', 'roles.manage', 'academic_structure.read', 'academic_structure.manage',
  'students.read', 'students.create', 'students.update', 'students.archive', 'guardians.read',
  'guardians.manage', 'staff.read', 'staff.manage', 'attendance.read', 'attendance.mark', 'attendance.correct',
  'announcements.read', 'announcements.manage', 'audit_logs.read', 'dashboard.read', 'reports.read',
] as const;
