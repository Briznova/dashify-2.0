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

  let service: StaffService;
  let withTenant: jest.Mock;
  let tx: {
    staffProfile: {
      findFirst: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
    };
    user: { findUnique: jest.Mock };
    platformAdminGrant: { findFirst: jest.Mock };
    role: { findFirst: jest.Mock };
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
    teacherAssignment: { updateMany: jest.Mock };
    auditLog: { create: jest.Mock };
  };

  beforeEach(() => {
    tx = {
      staffProfile: {
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      user: { findUnique: jest.fn() },
      platformAdminGrant: { findFirst: jest.fn().mockResolvedValue(null) },
      role: { findFirst: jest.fn() },
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
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
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
    tx.role.findFirst.mockResolvedValue({ id: "teacher-role" });
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
