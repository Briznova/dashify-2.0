import { PrismaClient } from "@prisma/client";
import * as argon2 from "argon2";
import { isEmail } from "class-validator";

const DEFAULT_SCHOOL_CODE = "PCS-101";

export async function bootstrapTeacher(
  prisma: PrismaClient,
  env: Record<string, string | undefined>,
): Promise<void> {
  const email = env.SEED_TEACHER_EMAIL?.trim().toLowerCase();
  const password = env.SEED_TEACHER_PASSWORD;
  const schoolCode = env.SEED_TEACHER_SCHOOL_CODE?.trim() || DEFAULT_SCHOOL_CODE;

  if (
    !email ||
    email.length > 254 ||
    !isEmail(email) ||
    !password ||
    password.length < 12
  ) {
    throw new Error(
      "Set a valid SEED_TEACHER_EMAIL and SEED_TEACHER_PASSWORD of at least 12 characters.",
    );
  }

  await prisma.$transaction(async (tx) => {
    const existing = await tx.user.findFirst({
      where: { email: { equals: email, mode: "insensitive" } },
      include: {
        memberships: {
          where: { status: "ACTIVE" },
          include: {
            roles: { include: { role: { select: { key: true, schoolId: true } } } },
          },
        },
      },
    });

    if (existing) {
      const teacherMembership = existing.memberships.find((membership) =>
        membership.roles.some(
          (membershipRole) => membershipRole.role.key === "TEACHER",
        ),
      );

      if (
        existing.email !== email ||
        !existing.isActive ||
        !teacherMembership ||
        existing.memberships.length > 1
      ) {
        throw new Error(
          "The seed email is already in use by an account that is not an active dedicated teacher.",
        );
      }

      if (!(await argon2.verify(existing.passwordHash, password))) {
        throw new Error(
          "SEED_TEACHER_PASSWORD does not match the existing teacher account.",
        );
      }

      return;
    }

    const school = await tx.school.findFirst({
      where: {
        isActive: true,
        code: { equals: schoolCode, mode: "insensitive" },
      },
      select: { id: true, code: true, name: true },
    });

    if (!school) {
      throw new Error(
        `No active school was found for code "${schoolCode}". Create the school first or set SEED_TEACHER_SCHOOL_CODE to a valid school code.`,
      );
    }

    const permission = await tx.permission.upsert({
      where: { key: "dashboard.teacher.read" },
      create: {
        key: "dashboard.teacher.read",
        description:
          "Read the authenticated teacher assigned-class attendance dashboard",
      },
      update: {
        description:
          "Read the authenticated teacher assigned-class attendance dashboard",
      },
    });

    const role = await tx.role.upsert({
      where: { schoolId_key: { schoolId: school.id, key: "TEACHER" } },
      create: {
        schoolId: school.id,
        key: "TEACHER",
        name: "Teacher",
        isSystem: true,
      },
      update: { name: "Teacher" },
    });

    await tx.rolePermission.upsert({
      where: {
        roleId_permissionId: {
          roleId: role.id,
          permissionId: permission.id,
        },
      },
      create: { roleId: role.id, permissionId: permission.id },
      update: {},
    });

    const teacher = await tx.user.create({
      data: {
        email,
        passwordHash: await argon2.hash(password),
        firstName: "Demo",
        lastName: "Teacher",
      },
      select: { id: true, email: true },
    });

    await tx.schoolMembership.create({
      data: {
        schoolId: school.id,
        userId: teacher.id,
        status: "ACTIVE",
        joinedAt: new Date(),
        roles: {
          create: { roleId: role.id },
        },
      },
    });

    await tx.staffProfile.create({
      data: {
        schoolId: school.id,
        userId: teacher.id,
        firstName: "Demo",
        lastName: "Teacher",
        email,
        employeeCode: `TCH-${school.code}`,
        designation: "Teacher",
        isActive: true,
      },
    });

    await tx.auditLog.create({
      data: {
        schoolId: school.id,
        actorUserId: null,
        action: "DEMO_TEACHER_BOOTSTRAPPED",
        resource: "teacher_seed",
        resourceId: teacher.id,
        summary: {
          provisioning: "environment-seed",
          role: "TEACHER",
          schoolCode: school.code,
        },
      },
    });
  });
}

export default bootstrapTeacher;
