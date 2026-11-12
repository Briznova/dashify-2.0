import {
  BadRequestException,
  ConflictException,
  InternalServerErrorException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../infrastructure/database/prisma.service";
import { AssignTeacherDto } from "./dto/assign-teacher.dto";
import { CreateStaffDto } from "./dto/create-staff.dto";
import { UpdateStaffDto } from "./dto/update-staff.dto";

@Injectable()
export class StaffService {
  constructor(private readonly prisma: PrismaService) {}

  async list(schoolId: string) {
    return this.prisma.withTenant(schoolId, async (tx) => {
      const staff = await tx.staffProfile.findMany({
        where: { schoolId, isActive: true },
        orderBy: [{ designation: "asc" }, { employeeCode: "asc" }],
        include: {
          teacherAssignments: {
            where: { isActive: true },
            include: { class: true, section: true },
          },
        },
      });

      const userIds = [
        ...new Set(
          staff
            .map((member) => member.userId)
            .filter((id): id is string => Boolean(id)),
        ),
      ];
      const users = userIds.length
        ? await tx.user.findMany({
            where: { id: { in: userIds } },
            select: { id: true, email: true, firstName: true, lastName: true },
          })
        : [];

      const userById = new Map(users.map((user) => [user.id, user]));
      return staff.map((member) => ({
        ...member,
        user: member.userId ? (userById.get(member.userId) ?? null) : null,
      }));
    });
  }

  async get(schoolId: string, id: string) {
    return this.prisma.withTenant(schoolId, async (tx) => {
      const staff = await tx.staffProfile.findFirst({
        where: { id, schoolId },
        include: {
          teacherAssignments: {
            where: { isActive: true },
            include: { class: true, section: true },
          },
        },
      });
      if (!staff) throw new NotFoundException("Staff record not found");

      if (staff.userId) {
        const user = await tx.user.findUnique({
          where: { id: staff.userId },
          select: { id: true, email: true, firstName: true, lastName: true },
        });
        return { ...staff, user };
      }

      return { ...staff, user: null };
    });
  }

  async create(schoolId: string, actorId: string, dto: CreateStaffDto) {
    try {
      return await this.prisma.withTenant(schoolId, async (tx) => {
        if (dto.userId && dto.accountEmail) {
          throw new BadRequestException(
            "Provide either userId or accountEmail, not both",
          );
        }

        if (dto.employeeCode) {
          const duplicate = await tx.staffProfile.findFirst({
            where: { schoolId, employeeCode: dto.employeeCode },
          });
          if (duplicate) {
            throw new ConflictException(
              "Employee code already exists in this school",
            );
          }
        }

        const accountEmail = dto.accountEmail?.trim().toLowerCase();
        const user = dto.userId
          ? await tx.user.findUnique({ where: { id: dto.userId } })
          : accountEmail
            ? await tx.user.findUnique({ where: { email: accountEmail } })
            : null;
        if ((dto.userId || accountEmail) && !user) {
          throw new NotFoundException("Existing user account not found");
        }
        if (user && !user.isActive) {
          throw new ConflictException(
            "Inactive user accounts cannot be linked",
          );
        }
        if (user) {
          const platformGrant = await tx.platformAdminGrant.findFirst({
            where: { userId: user.id, revokedAt: null },
            select: { id: true },
          });
          if (platformGrant) {
            throw new ConflictException(
              "Platform administrator accounts cannot be linked to a school",
            );
          }
          const duplicateProfile = await tx.staffProfile.findFirst({
            where: { schoolId, userId: user.id },
          });
          if (duplicateProfile) {
            throw new ConflictException(
              "This account is already linked to a staff profile in this school",
            );
          }

          await this.grantTeacherRole(tx, schoolId, user.id);
        }

        const staff = await tx.staffProfile.create({
          data: {
            schoolId,
            userId: user?.id,
            firstName: dto.firstName ?? user?.firstName,
            lastName: dto.lastName ?? user?.lastName,
            email: dto.email ?? user?.email,
            phone: dto.phone ?? user?.phone ?? null,
            employeeCode: dto.employeeCode,
            designation: dto.designation,
            department: dto.department,
            joinedAt: new Date(),
            isActive: true,
          },
        });

        await tx.auditLog.create({
          data: {
            schoolId,
            actorUserId: actorId,
            action: "STAFF_PROFILE_CREATED",
            resource: "staff_profile",
            resourceId: staff.id,
            summary: {
              linkedExistingAccount: Boolean(user),
              teacherRoleGranted: Boolean(user),
            },
          },
        });

        if (user) {
          return {
            ...staff,
            user: {
              id: user.id,
              email: user.email,
              firstName: user.firstName,
              lastName: user.lastName,
            },
          };
        }

        return { ...staff, user: null };
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        throw new ConflictException(
          "A staff profile or school membership already exists",
        );
      }
      throw error;
    }
  }

  async update(
    schoolId: string,
    actorId: string,
    id: string,
    dto: UpdateStaffDto,
  ) {
    try {
      return await this.prisma.withTenant(schoolId, async (tx) => {
        const current = await tx.staffProfile.findFirst({
          where: { id, schoolId, isActive: true },
        });
        if (!current) throw new NotFoundException("Staff record not found");

        const changedFields = Object.keys(dto).filter(
          (key) => dto[key as keyof UpdateStaffDto] !== undefined,
        );
        if (changedFields.length === 0) {
          throw new BadRequestException(
            "At least one staff profile field is required",
          );
        }

        if (dto.employeeCode && dto.employeeCode !== current.employeeCode) {
          const duplicate = await tx.staffProfile.findFirst({
            where: {
              schoolId,
              employeeCode: dto.employeeCode,
              id: { not: id },
            },
          });
          if (duplicate) {
            throw new ConflictException(
              "Employee code already exists in this school",
            );
          }
        }

        const updated = await tx.staffProfile.update({
          where: { id },
          data: dto,
        });
        await tx.auditLog.create({
          data: {
            schoolId,
            actorUserId: actorId,
            action: "STAFF_PROFILE_UPDATED",
            resource: "staff_profile",
            resourceId: id,
            summary: { changedFields },
          },
        });
        return updated;
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        throw new ConflictException(
          "Employee code already exists in this school",
        );
      }
      throw error;
    }
  }

  async deactivate(schoolId: string, actorId: string, id: string) {
    return this.prisma.withTenant(schoolId, async (tx) => {
      const staff = await tx.staffProfile.findFirst({
        where: { id, schoolId, isActive: true },
      });
      if (!staff) throw new NotFoundException("Active staff record not found");

      const deactivatedAssignments = await tx.teacherAssignment.updateMany({
        where: { schoolId, staffId: id, isActive: true },
        data: { isActive: false },
      });

      let teacherAccessRevoked = false;
      if (staff.userId) {
        const role = await this.teacherRole(tx, schoolId);
        if (!role) {
          throw new InternalServerErrorException(
            "Teacher role is not configured for this school",
          );
        }
        const membership = await tx.schoolMembership.findUnique({
          where: {
            schoolId_userId: { schoolId, userId: staff.userId },
          },
        });
        if (membership) {
          const removedRole = await tx.membershipRole.deleteMany({
            where: { membershipId: membership.id, roleId: role.id },
          });
          teacherAccessRevoked = removedRole.count > 0;
          const remainingRoles = await tx.membershipRole.count({
            where: { membershipId: membership.id },
          });
          if (remainingRoles === 0 && membership.status === "ACTIVE") {
            await tx.schoolMembership.update({
              where: { id: membership.id },
              data: { status: "REVOKED" },
            });
          }
        }
      }

      const updated = await tx.staffProfile.update({
        where: { id },
        data: { isActive: false },
      });
      await tx.auditLog.create({
        data: {
          schoolId,
          actorUserId: actorId,
          action: "STAFF_PROFILE_DEACTIVATED",
          resource: "staff_profile",
          resourceId: id,
          summary: {
            teacherAccessRevoked,
            deactivatedAssignments: deactivatedAssignments.count,
          },
        },
      });
      return updated;
    });
  }

  private async grantTeacherRole(
    tx: Prisma.TransactionClient,
    schoolId: string,
    userId: string,
  ) {
    const role = await this.teacherRole(tx, schoolId);
    if (!role) {
      throw new InternalServerErrorException(
        "Teacher role is not configured for this school",
      );
    }

    let membership = await tx.schoolMembership.findUnique({
      where: { schoolId_userId: { schoolId, userId } },
    });
    if (membership && membership.status !== "ACTIVE") {
      throw new ConflictException(
        "The existing school membership is not active",
      );
    }
    if (!membership) {
      membership = await tx.schoolMembership.create({
        data: {
          schoolId,
          userId,
          status: "ACTIVE",
          joinedAt: new Date(),
        },
      });
    }

    await tx.membershipRole.upsert({
      where: {
        membershipId_roleId: {
          membershipId: membership.id,
          roleId: role.id,
        },
      },
      create: { membershipId: membership.id, roleId: role.id },
      update: {},
    });
  }

  private async teacherRole(tx: Prisma.TransactionClient, schoolId: string) {
    return tx.role.findFirst({
      where: { schoolId, key: "TEACHER" },
    });
  }

  async listAssignments(schoolId: string) {
    return this.prisma.withTenant(schoolId, async (tx) => {
      const assignments = await tx.teacherAssignment.findMany({
        where: { schoolId, isActive: true },
        orderBy: { assignedAt: "desc" },
        include: {
          staff: true,
          class: true,
          section: true,
        },
      });

      const userIds = [
        ...new Set(
          assignments
            .map((assignment) => assignment.staff.userId)
            .filter((id): id is string => Boolean(id)),
        ),
      ];
      const users = userIds.length
        ? await tx.user.findMany({
            where: { id: { in: userIds } },
            select: { id: true, email: true, firstName: true, lastName: true },
          })
        : [];

      const userById = new Map(users.map((user) => [user.id, user]));
      return assignments.map((assignment) => ({
        ...assignment,
        staff: {
          ...assignment.staff,
          user: assignment.staff.userId
            ? (userById.get(assignment.staff.userId) ?? null)
            : null,
        },
      }));
    });
  }

  async assignTeacher(schoolId: string, dto: AssignTeacherDto) {
    return this.prisma.withTenant(schoolId, async (tx) => {
      const staff = await tx.staffProfile.findFirst({
        where: { id: dto.staffId, schoolId, isActive: true },
      });
      if (!staff) throw new NotFoundException("Staff member not found");

      const schoolClass = await tx.schoolClass.findFirst({
        where: { id: dto.classId, schoolId, isActive: true },
      });
      if (!schoolClass) throw new NotFoundException("Class not found");

      if (dto.sectionId) {
        const section = await tx.section.findFirst({
          where: {
            id: dto.sectionId,
            schoolId,
            classId: dto.classId,
            isActive: true,
          },
        });
        if (!section) {
          throw new NotFoundException(
            "Section not found in the selected class",
          );
        }
      }

      const assignment = await tx.teacherAssignment.findFirst({
        where: {
          schoolId,
          staffId: dto.staffId,
          classId: dto.classId,
          sectionId: dto.sectionId ?? null,
        },
      });

      if (assignment) {
        return tx.teacherAssignment.update({
          where: { id: assignment.id },
          data: {
            subject: dto.subject ?? assignment.subject,
            isActive: true,
          },
          include: { staff: true, class: true, section: true },
        });
      }

      return tx.teacherAssignment.create({
        data: {
          schoolId,
          staffId: dto.staffId,
          classId: dto.classId,
          sectionId: dto.sectionId,
          subject: dto.subject,
          isActive: true,
        },
        include: { staff: true, class: true, section: true },
      });
    });
  }
}
