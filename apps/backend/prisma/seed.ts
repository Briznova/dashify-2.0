import { PrismaClient, MembershipStatus } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

async function main(): Promise<void> {
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
  const permissions = [
    'school.read','school.update','users.read','users.invite','users.update','users.disable',
    'roles.read','roles.manage','academic_structure.read','academic_structure.manage',
    'students.read','students.create','students.update','students.archive','guardians.read',
    'guardians.manage','staff.read','staff.manage','attendance.read','attendance.mark','attendance.correct',
    'announcements.read','announcements.manage','audit_logs.read','dashboard.read','reports.read'
  ];
  for (const key of permissions) {
    const permission = await prisma.permission.upsert({ where: { key }, update: {}, create: { key } });
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: role.id, permissionId: permission.id } },
      update: {}, create: { roleId: role.id, permissionId: permission.id }
    });
  }
  console.log('Synthetic seed complete.');
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
}).finally(async () => prisma.$disconnect());
