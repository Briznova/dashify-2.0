import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../../infrastructure/database/prisma.service";
import { StaffService } from "./staff.service";

describe("StaffService account management", () => {
  const schoolId = "school-1";
  const actorId = "admin-1";
  const staffId = "staff-1";
  const userId = "teacher-1";
  const standardTeacherPermissionKeys = [
    "dashboard.teacher.read",
    "announcements.read",
    "teacher.classes.read",
    "teacher.attendance.read",
    "teacher.attendance.mark",
    "teacher.assessments.read",
    "teacher.assessments.manage",
    "teacher.results.read",
    "teacher.results.write",
  ];

  let service: StaffService;
  let withTenant: jest.Mock;
  let tx: {
    staffProfile: {
      findFirst: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
    };
    user: {
      findUnique: jest.Mock;
      findFirst: jest.Mock;
      create: jest.Mock;
    };
    platformAdminGrant: { findFirst: jest.Mock };
    role: {
      findFirst: jest.Mock;
      findUnique: jest.Mock;
      create: jest.Mock;
    };
    permission: { upsert: jest.Mock };
    rolePermission: { create: jest.Mock };
    schoolMembership: {
      findUnique: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
    };
    membershipRole: {
      upsert: jest.Mock;
      deleteMany: jest.Mock;
      count: jest.Mock;
    };
    teacherAssignment: {
      findFirst: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      updateMany: jest.Mock;
    };
    schoolClass: { findFirst: jest.Mock };
    section: { findFirst: jest.Mock };
    $queryRaw: jest.Mock;
    auditLog: { create: jest.Mock };
  };

  beforeEach(() => {
    tx = {
      staffProfile: {
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      user: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
      },
      platformAdminGrant: { findFirst: jest.fn().mockResolvedValue(null) },
      role: {
        findFirst: jest.fn(),
        findUnique: jest.fn().mockResolvedValue({
          id: "teacher-role",
          isSystem: true,
          permissions: standardTeacherPermissionKeys.map((key) => ({
            permission: { key },
          })),
        }),
        create: jest.fn(),
      },
      permission: { upsert: jest.fn() },
      rolePermission: { create: jest.fn() },
      schoolMembership: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      membershipRole: {
        upsert: jest.fn(),
        deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
        count: jest.fn(),
      },
      teacherAssignment: {
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
      schoolClass: { findFirst: jest.fn() },
      section: { findFirst: jest.fn() },
      $queryRaw: jest.fn().mockResolvedValue([{ id: schoolId }]),
      auditLog: { create: jest.fn() },
    };
    withTenant = jest.fn(
      (_id: string, work: (transaction: typeof tx) => Promise<unknown>) =>
        work(tx),
    );
    service = new StaffService({ withTenant } as unknown as PrismaService);
  });

  it("links an existing user and grants only the active school's Teacher role", async () => {
    const user = {
      id: userId,
      email: "teacher@example.test",
      firstName: "Taylor",
      lastName: "Teacher",
      phone: null,
      isActive: true,
    };
    tx.staffProfile.findFirst.mockResolvedValue(null);
    tx.user.findUnique.mockResolvedValue(user);
    tx.role.findUnique.mockResolvedValue(null);
    tx.role.create.mockResolvedValue({
      id: "teacher-role",
      isSystem: true,
      permissions: [],
    });
    tx.permission.upsert.mockResolvedValue({ id: "teacher-permission" });
    tx.rolePermission.create.mockResolvedValue({});
    tx.schoolMembership.findUnique.mockResolvedValue(null);
    tx.schoolMembership.create.mockResolvedValue({
      id: "membership-1",
      status: "ACTIVE",
    });
    tx.staffProfile.create.mockResolvedValue({
      id: staffId,
      userId,
      firstName: "Taylor",
    });

    await service.create(schoolId, actorId, {
      accountEmail: " TEACHER@example.test ",
      employeeCode: "T-1",
      firstName: "Taylor",
    });

    expect(tx.user.findUnique).toHaveBeenCalledWith({
      where: { email: "teacher@example.test" },
    });
    expect(tx.role.create).toHaveBeenCalledWith({
      data: { schoolId, key: "TEACHER", name: "Teacher", isSystem: true },
      include: {
        permissions: { include: { permission: { select: { key: true } } } },
      },
    });
    expect(tx.permission.upsert).toHaveBeenCalledTimes(9);
    expect(tx.rolePermission.create).toHaveBeenCalledTimes(9);
    expect(tx.schoolMembership.create).toHaveBeenCalledWith({
      data: {
        schoolId,
        userId,
        status: "ACTIVE",
        joinedAt: expect.any(Date),
      },
    });
    expect(tx.membershipRole.upsert).toHaveBeenCalledWith({
      where: {
        membershipId_roleId: {
          membershipId: "membership-1",
          roleId: "teacher-role",
        },
      },
      create: { membershipId: "membership-1", roleId: "teacher-role" },
      update: {},
    });
    expect(tx.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          schoolId,
          actorUserId: actorId,
          action: "STAFF_PROFILE_CREATED",
          summary: {
            linkedExistingAccount: true,
            teacherRoleGranted: true,
          },
        }),
      }),
    );
    expect(withTenant).toHaveBeenCalledWith(schoolId, expect.any(Function));
  });

  it("creates new Teacher accounts with the standard permission-bearing role", async () => {
    tx.user.findFirst.mockResolvedValue(null);
    tx.user.create.mockResolvedValue({
      id: userId,
      email: "new-teacher@example.test",
      firstName: "Taylor",
      lastName: null,
    });
    tx.role.findUnique.mockResolvedValue({
      id: "teacher-role",
      isSystem: true,
      permissions: standardTeacherPermissionKeys
        .filter((key) => key !== "dashboard.teacher.read")
        .map((key) => ({ permission: { key } })),
    });
    tx.permission.upsert.mockResolvedValue({ id: "dashboard-permission" });
    tx.rolePermission.create.mockResolvedValue({});
    tx.schoolMembership.create.mockResolvedValue({ id: "membership-1" });
    tx.staffProfile.create.mockResolvedValue({
      id: staffId,
      userId,
      firstName: "Taylor",
    });

    await service.createTeacherAccount(schoolId, actorId, {
      employeeCode: "T-2",
      firstName: "Taylor",
      email: "new-teacher@example.test",
      password: "synthetic-test-password",
    });

    expect(tx.role.findUnique).toHaveBeenCalledWith({
      where: { schoolId_key: { schoolId, key: "TEACHER" } },
      include: {
        permissions: { include: { permission: { select: { key: true } } } },
      },
    });
    expect(tx.permission.upsert).toHaveBeenCalledWith({
      where: { key: "dashboard.teacher.read" },
      create: { key: "dashboard.teacher.read" },
      update: {},
    });
    expect(tx.rolePermission.create).toHaveBeenCalledWith({
      data: {
        roleId: "teacher-role",
        permissionId: "dashboard-permission",
      },
    });
    expect(tx.schoolMembership.create).toHaveBeenCalledWith({
      data: {
        schoolId,
        userId,
        status: "ACTIVE",
        joinedAt: expect.any(Date),
        roles: { create: { roleId: "teacher-role" } },
      },
    });
  });

  it("does not create accounts when the supplied email has no existing user", async () => {
    tx.user.findUnique.mockResolvedValue(null);

    await expect(
      service.create(schoolId, actorId, {
        accountEmail: "missing@example.test",
        employeeCode: "T-1",
        firstName: "Taylor",
      }),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(tx.schoolMembership.create).not.toHaveBeenCalled();
    expect(tx.staffProfile.create).not.toHaveBeenCalled();
  });

  it("does not link a dedicated platform administrator to a school", async () => {
    tx.staffProfile.findFirst.mockResolvedValue(null);
    tx.user.findUnique.mockResolvedValue({
      id: userId,
      email: "platform@example.test",
      firstName: "Platform",
      lastName: "Admin",
      phone: null,
      isActive: true,
    });
    tx.platformAdminGrant.findFirst.mockResolvedValue({ id: "grant-1" });

    await expect(
      service.create(schoolId, actorId, {
        userId,
        employeeCode: "T-1",
        firstName: "Platform",
      }),
    ).rejects.toBeInstanceOf(ConflictException);

    expect(tx.schoolMembership.create).not.toHaveBeenCalled();
    expect(tx.staffProfile.create).not.toHaveBeenCalled();
  });

  it("does not reactivate a suspended or revoked school membership", async () => {
    tx.staffProfile.findFirst.mockResolvedValue(null);
    tx.user.findUnique.mockResolvedValue({
      id: userId,
      email: "teacher@example.test",
      firstName: "Taylor",
      lastName: null,
      phone: null,
      isActive: true,
    });
    tx.role.findFirst.mockResolvedValue({ id: "teacher-role" });
    tx.schoolMembership.findUnique.mockResolvedValue({
      id: "membership-1",
      status: "SUSPENDED",
    });
    await expect(
      service.create(schoolId, actorId, {
        userId,
        employeeCode: "T-1",
        firstName: "Taylor",
      }),
    ).rejects.toBeInstanceOf(ConflictException);

    expect(tx.membershipRole.upsert).not.toHaveBeenCalled();
    expect(tx.staffProfile.create).not.toHaveBeenCalled();
  });

  it("updates only active-school staff fields and records changed field names", async () => {
    const updated = {
      id: staffId,
      schoolId,
      firstName: "Taylor",
      designation: "Senior Teacher",
    };
    tx.staffProfile.findFirst.mockResolvedValue({
      id: staffId,
      schoolId,
      employeeCode: "T-1",
      isActive: true,
    });
    tx.staffProfile.update.mockResolvedValue(updated);

    await expect(
      service.update(schoolId, actorId, staffId, {
        designation: "Senior Teacher",
      }),
    ).resolves.toEqual(updated);
    expect(tx.staffProfile.findFirst).toHaveBeenCalledWith({
      where: { id: staffId, schoolId, isActive: true },
    });
    expect(tx.auditLog.create).toHaveBeenCalledWith({
      data: {
        schoolId,
        actorUserId: actorId,
        action: "STAFF_PROFILE_UPDATED",
        resource: "staff_profile",
        resourceId: staffId,
        summary: { changedFields: ["designation"] },
      },
    });
  });

  it("rejects an empty staff update", async () => {
    tx.staffProfile.findFirst.mockResolvedValue({
      id: staffId,
      schoolId,
      isActive: true,
    });

    await expect(
      service.update(schoolId, actorId, staffId, {}),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(tx.staffProfile.update).not.toHaveBeenCalled();
  });

  it("designates one assigned teacher for a specific section", async () => {
    tx.staffProfile.findFirst.mockResolvedValue({ id: staffId });
    tx.schoolClass.findFirst.mockResolvedValue({ id: "class-1" });
    tx.section.findFirst.mockResolvedValue({ id: "section-1" });
    tx.teacherAssignment.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null);
    tx.teacherAssignment.create.mockResolvedValue({
      id: "assignment-1",
      isClassTeacher: true,
    });

    await service.assignTeacher(schoolId, actorId, {
      staffId,
      classId: "class-1",
      sectionId: "section-1",
      isClassTeacher: true,
    });

    expect(tx.teacherAssignment.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          schoolId,
          staffId,
          classId: "class-1",
          sectionId: "section-1",
          isClassTeacher: true,
        }),
      }),
    );
    expect(tx.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          summary: {
            classId: "class-1",
            sectionId: "section-1",
            isClassTeacher: true,
          },
        }),
      }),
    );
  });

  it("rejects a second designated class teacher for the same section", async () => {
    tx.staffProfile.findFirst.mockResolvedValue({ id: staffId });
    tx.schoolClass.findFirst.mockResolvedValue({ id: "class-1" });
    tx.section.findFirst.mockResolvedValue({ id: "section-1" });
    tx.teacherAssignment.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: "existing-assignment" });

    await expect(
      service.assignTeacher(schoolId, actorId, {
        staffId,
        classId: "class-1",
        sectionId: "section-1",
        isClassTeacher: true,
      }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(tx.teacherAssignment.create).not.toHaveBeenCalled();
  });

  it("deactivates the profile and assignments and revokes an otherwise-empty membership", async () => {
    tx.staffProfile.findFirst.mockResolvedValue({
      id: staffId,
      schoolId,
      userId,
      isActive: true,
    });
    tx.role.findFirst.mockResolvedValue({ id: "teacher-role" });
    tx.schoolMembership.findUnique.mockResolvedValue({
      id: "membership-1",
      status: "ACTIVE",
    });
    tx.membershipRole.count.mockResolvedValue(0);
    tx.staffProfile.update.mockResolvedValue({
      id: staffId,
      isActive: false,
    });

    await service.deactivate(schoolId, actorId, staffId);

    expect(tx.teacherAssignment.updateMany).toHaveBeenCalledWith({
      where: { schoolId, staffId, isActive: true },
      data: { isActive: false },
    });
    expect(tx.membershipRole.deleteMany).toHaveBeenCalledWith({
      where: { membershipId: "membership-1", roleId: "teacher-role" },
    });
    expect(tx.schoolMembership.update).toHaveBeenCalledWith({
      where: { id: "membership-1" },
      data: { status: "REVOKED" },
    });
    expect(tx.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: "STAFF_PROFILE_DEACTIVATED",
          resourceId: staffId,
        }),
      }),
    );
  });

  it("preserves other active roles when deactivating a teacher profile", async () => {
    tx.staffProfile.findFirst.mockResolvedValue({
      id: staffId,
      schoolId,
      userId,
      isActive: true,
    });
    tx.role.findFirst.mockResolvedValue({ id: "teacher-role" });
    tx.schoolMembership.findUnique.mockResolvedValue({
      id: "membership-1",
      status: "ACTIVE",
    });
    tx.membershipRole.count.mockResolvedValue(1);
    tx.staffProfile.update.mockResolvedValue({
      id: staffId,
      isActive: false,
    });

    await service.deactivate(schoolId, actorId, staffId);

    expect(tx.schoolMembership.update).not.toHaveBeenCalled();
    expect(tx.membershipRole.deleteMany).toHaveBeenCalled();
  });
});
