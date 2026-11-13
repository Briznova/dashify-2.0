import { PrismaClient, MembershipStatus } from '@prisma/client';
import * as argon2 from 'argon2';
import { SCHOOL_ADMIN_PERMISSIONS } from '../src/common/school-admin-permissions';
import {
  assertCreatePermissionSeedInputs,
  assertAuditPermissionSeedInputs,
  assertSettingsPermissionSeedInputs,
  assertSupportReadPermissionSeedInputs,
  assertSupportUpdatePermissionSeedInputs,
  assertSchoolAdminsCreatePermissionSeedInputs,
  grantPlatformPermission,
  grantSchoolsCreatePermission,
} from './seed-platform-permission';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  const grantSchoolsCreate = assertCreatePermissionSeedInputs(process.env);
  const grantAuditRead = assertAuditPermissionSeedInputs(process.env);
  const grantSettingsRead = assertSettingsPermissionSeedInputs(process.env);
  const grantSupportRead = assertSupportReadPermissionSeedInputs(process.env);
  const grantSupportUpdate = assertSupportUpdatePermissionSeedInputs(process.env);
  const grantSchoolAdminsCreate = assertSchoolAdminsCreatePermissionSeedInputs(process.env);
  const email = process.env.SEED_ADMIN_EMAIL;
  const password = process.env.SEED_ADMIN_PASSWORD;
  if (!email || !password || password.length < 12) {
    throw new Error('Set SEED_ADMIN_EMAIL and a SEED_ADMIN_PASSWORD of at least 12 characters before seeding.');
  }
  const passwordHash = await argon2.hash(password);
  const user = await prisma.user.upsert({
    where: { email },
    update: {},
    create: { email, passwordHash, firstName: 'Demo', lastName: 'Admin' },
  });
  const school = await prisma.school.upsert({
    where: { code: 'DEMO-001' },
    update: {},
    create: { code: 'DEMO-001', name: 'DASHIFY Demo School' },
  });
  const membership = await prisma.schoolMembership.upsert({
    where: { schoolId_userId: { schoolId: school.id, userId: user.id } },
    update: { status: MembershipStatus.ACTIVE },
    create: { schoolId: school.id, userId: user.id, status: MembershipStatus.ACTIVE, joinedAt: new Date() },
  });
  const role = await prisma.role.upsert({
    where: { schoolId_key: { schoolId: school.id, key: 'SCHOOL_ADMIN' } },
    update: {},
    create: { schoolId: school.id, key: 'SCHOOL_ADMIN', name: 'School Admin', isSystem: true },
  });
  await prisma.membershipRole.upsert({
    where: { membershipId_roleId: { membershipId: membership.id, roleId: role.id } },
    update: {},
    create: { membershipId: membership.id, roleId: role.id },
  });
  for (const key of SCHOOL_ADMIN_PERMISSIONS) {
    const permission = await prisma.permission.upsert({ where: { key }, update: {}, create: { key } });
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: role.id, permissionId: permission.id } },
      update: {}, create: { roleId: role.id, permissionId: permission.id }
    });
  }
  const principalRole = await prisma.role.upsert({
    where: { schoolId_key: { schoolId: school.id, key: 'PRINCIPAL' } },
    update: {},
    create: { schoolId: school.id, key: 'PRINCIPAL', name: 'Principal', isSystem: true },
  });
  const principalDashboardPermission = await prisma.permission.upsert({
    where: { key: 'dashboard.principal.read' },
    update: {},
    create: { key: 'dashboard.principal.read', description: 'Read the active school daily attendance dashboard' },
  });
  await prisma.rolePermission.upsert({
    where: { roleId_permissionId: { roleId: principalRole.id, permissionId: principalDashboardPermission.id } },
    update: {},
    create: { roleId: principalRole.id, permissionId: principalDashboardPermission.id },
  });
  const teacherRole = await prisma.role.upsert({
    where: { schoolId_key: { schoolId: school.id, key: 'TEACHER' } },
    update: {},
    create: { schoolId: school.id, key: 'TEACHER', name: 'Teacher', isSystem: true },
  });
  const teacherDashboardPermission = await prisma.permission.upsert({
    where: { key: 'dashboard.teacher.read' },
    update: {},
    create: {
      key: 'dashboard.teacher.read',
      description: 'Read the authenticated teacher assigned-class attendance dashboard',
    },
  });
  await prisma.rolePermission.upsert({
    where: { roleId_permissionId: { roleId: teacherRole.id, permissionId: teacherDashboardPermission.id } },
    update: {},
    create: { roleId: teacherRole.id, permissionId: teacherDashboardPermission.id },
  });

  const platformAdminEmail = process.env.SEED_PLATFORM_ADMIN_EMAIL?.trim().toLowerCase();
  const platformAdminPassword = process.env.SEED_PLATFORM_ADMIN_PASSWORD;
  const teacherEmail = process.env.SEED_TEACHER_EMAIL?.trim().toLowerCase();
  const teacherPassword = process.env.SEED_TEACHER_PASSWORD;
  const teacherEmployeeCode = 'DEMO-T-001';

  if (Boolean(teacherEmail) !== Boolean(teacherPassword)) {
    throw new Error('Set both SEED_TEACHER_EMAIL and SEED_TEACHER_PASSWORD to seed the local Teacher account.');
  }
  if (teacherEmail && teacherPassword) {
    if (teacherPassword.length < 12) {
      throw new Error('SEED_TEACHER_PASSWORD must be at least 12 characters.');
    }
    if (teacherEmail === email.trim().toLowerCase() || teacherEmail === platformAdminEmail) {
      throw new Error('Use a dedicated email for the seeded Teacher account.');
    }

    const existingTeacher = await prisma.user.findUnique({
      where: { email: teacherEmail },
    });
    if (existingTeacher) {
      const membership = await prisma.schoolMembership.findUnique({
        where: {
          schoolId_userId: { schoolId: school.id, userId: existingTeacher.id },
        },
        include: { roles: { include: { role: true } } },
      });
      const profile = await prisma.staffProfile.findFirst({
        where: { schoolId: school.id, userId: existingTeacher.id },
        select: { isActive: true, employeeCode: true },
      });
      const platformGrant = await prisma.platformAdminGrant.findUnique({
        where: { userId: existingTeacher.id },
      });
      const activeMembershipCount = await prisma.schoolMembership.count({
        where: {
          userId: existingTeacher.id,
          status: MembershipStatus.ACTIVE,
        },
      });
      const isDemoTeacher =
        existingTeacher.isActive &&
        !platformGrant &&
        membership?.status === MembershipStatus.ACTIVE &&
        membership.roles.length === 1 &&
        membership.roles[0].role.key === 'TEACHER' &&
        profile?.isActive &&
        profile.employeeCode === teacherEmployeeCode &&
        activeMembershipCount === 1;

      if (!isDemoTeacher) {
        throw new Error('The seeded Teacher email already belongs to an account with a different school access setup.');
      }
      if (!(await argon2.verify(existingTeacher.passwordHash, teacherPassword))) {
        throw new Error('SEED_TEACHER_PASSWORD does not match the existing local Teacher account.');
      }
    } else {
      const existingEmployeeCode = await prisma.staffProfile.findFirst({
        where: { schoolId: school.id, employeeCode: teacherEmployeeCode },
        select: { id: true },
      });
      if (existingEmployeeCode) {
        throw new Error('The seeded Teacher employee code is already used in the demo school.');
      }

      await prisma.$transaction(async (transaction) => {
        const teacher = await transaction.user.create({
          data: {
            email: teacherEmail,
            passwordHash: await argon2.hash(teacherPassword),
            firstName: 'Demo',
            lastName: 'Teacher',
          },
        });
        const teacherMembership = await transaction.schoolMembership.create({
          data: {
            schoolId: school.id,
            userId: teacher.id,
            status: MembershipStatus.ACTIVE,
            joinedAt: new Date(),
          },
        });
        await transaction.membershipRole.create({
          data: {
            membershipId: teacherMembership.id,
            roleId: teacherRole.id,
          },
        });
        const staffProfile = await transaction.staffProfile.create({
          data: {
            schoolId: school.id,
            userId: teacher.id,
            firstName: 'Demo',
            lastName: 'Teacher',
            email: teacherEmail,
            employeeCode: teacherEmployeeCode,
            designation: 'Teacher',
            department: 'General',
            joinedAt: new Date(),
            isActive: true,
          },
        });
        await transaction.auditLog.create({
          data: {
            schoolId: school.id,
            actorUserId: user.id,
            action: 'STAFF_PROFILE_CREATED',
            resource: 'staff_profile',
            resourceId: staffProfile.id,
            summary: {
              linkedExistingAccount: true,
              teacherRoleGranted: true,
              provisioning: 'local-environment-seed',
            },
          },
        });
      });
    }
  }

  if (Boolean(platformAdminEmail) !== Boolean(platformAdminPassword)) {
    throw new Error('Set both SEED_PLATFORM_ADMIN_EMAIL and SEED_PLATFORM_ADMIN_PASSWORD to bootstrap the platform administrator.');
  }
  if (platformAdminEmail && platformAdminPassword) {
    if (platformAdminPassword.length < 12) {
      throw new Error('SEED_PLATFORM_ADMIN_PASSWORD must be at least 12 characters.');
    }
    const existingPlatformAdmin = await prisma.user.findUnique({
      where: { email: platformAdminEmail },
    });
    if (existingPlatformAdmin) {
      const grant = await prisma.platformAdminGrant.findUnique({
        where: { userId: existingPlatformAdmin.id },
      });
      if (!existingPlatformAdmin.isActive || !grant || grant.revokedAt) {
        throw new Error('The platform administrator email already belongs to an account without an active platform grant; do not auto-elevate it.');
      }
      const activeMembershipCount = await prisma.schoolMembership.count({
        where: {
          userId: existingPlatformAdmin.id,
          status: MembershipStatus.ACTIVE,
        },
      });
      if (activeMembershipCount > 0) {
        throw new Error('Use a dedicated platform administrator account without active school memberships.');
      }
    } else {
      await prisma.$transaction(async (transaction) => {
        const platformAdmin = await transaction.user.create({
          data: {
            email: platformAdminEmail,
            passwordHash: await argon2.hash(platformAdminPassword),
            firstName: 'Platform',
            lastName: 'Super Admin',
          },
        });
        await transaction.platformAdminGrant.create({
          data: { userId: platformAdmin.id },
        });
        await transaction.auditLog.create({
          data: {
            actorUserId: null,
            action: 'PLATFORM_ADMIN_BOOTSTRAPPED',
            resource: 'platform_admin_grant',
            resourceId: platformAdmin.id,
            summary: { provisioning: 'environment-seed' },
          },
        });
      });
    }

  }

  if (grantSchoolsCreate) {
    if (!platformAdminEmail) {
      throw new Error('A platform administrator email is required to grant school creation.');
    }
    await grantSchoolsCreatePermission(prisma, platformAdminEmail);
  }
  if (grantAuditRead) {
    if (!platformAdminEmail) {
      throw new Error('A platform administrator email is required to grant audit access.');
    }
    await grantPlatformPermission(prisma, platformAdminEmail, 'AUDIT_READ');
  }
  if (grantSettingsRead) {
    if (!platformAdminEmail) {
      throw new Error('A platform administrator email is required to grant settings access.');
    }
    await grantPlatformPermission(prisma, platformAdminEmail, 'SETTINGS_READ');
  }
  if (grantSupportRead) {
    if (!platformAdminEmail) throw new Error('Platform administrator email is required.');
    await grantPlatformPermission(prisma, platformAdminEmail, 'SUPPORT_READ');
  }
  if (grantSupportUpdate) {
    if (!platformAdminEmail) throw new Error('Platform administrator email is required.');
    await grantPlatformPermission(prisma, platformAdminEmail, 'SUPPORT_UPDATE');
  }
  if (grantSchoolAdminsCreate) {
    if (!platformAdminEmail) throw new Error('Platform administrator email is required.');
    await grantPlatformPermission(prisma, platformAdminEmail, 'SCHOOL_ADMINS_CREATE');
  }

  console.log('Synthetic seed complete.');
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
}).finally(async () => prisma.$disconnect());
