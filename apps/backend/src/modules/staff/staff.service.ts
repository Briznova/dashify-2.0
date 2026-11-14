import {
  BadRequestException,
  ConflictException,
  InternalServerErrorException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import * as argon2 from "argon2";
import { PrismaService } from "../../infrastructure/database/prisma.service";
import { AssignTeacherDto } from "./dto/assign-teacher.dto";
import { CreateStaffDto } from "./dto/create-staff.dto";
import { CreateTeacherAccountDto } from "./dto/create-teacher-account.dto";
import { CreateDepartmentDto, UpdateDepartmentDto } from "./dto/department.dto";
import { UpdateStaffDto } from "./dto/update-staff.dto";

@Injectable()
export class StaffService {
  constructor(private readonly prisma: PrismaService) {}

  private async lockSchool(tx: Prisma.TransactionClient, schoolId: string) {
    const schools = await tx.$queryRaw<{ id: string }[]>`
      SELECT id FROM schools WHERE id = ${schoolId}::uuid AND is_active = true FOR UPDATE
    `;
    if (!schools.length) throw new NotFoundException("Active school not found");
  }

  async listDepartments(schoolId: string) {
    return this.prisma.withTenant(schoolId, (tx) => tx.schoolDepartment.findMany({
      where: { schoolId }, orderBy: { name: "asc" },
      select: { id: true, name: true, isActive: true },
    }));
  }

  async createDepartment(schoolId: string, actorId: string, dto: CreateDepartmentDto) {
    try {
      return await this.prisma.withTenant(schoolId, async (tx) => {
        await this.lockSchool(tx, schoolId);
        const department = await tx.schoolDepartment.create({
          data: { schoolId, name: dto.name },
          select: { id: true, name: true, isActive: true },
        });
        await tx.auditLog.create({ data: {
          schoolId, actorUserId: actorId, action: "DEPARTMENT_CREATED",
          resource: "school_department", resourceId: department.id,
        } });
        return department;
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw new ConflictException("A department with this name already exists");
      }
      throw error;
    }
  }

  async updateDepartment(schoolId: string, actorId: string, id: string, dto: UpdateDepartmentDto) {
    if (dto.name === undefined && dto.isActive === undefined) {
      throw new BadRequestException("At least one department field is required");
    }
    try {
      return await this.prisma.withTenant(schoolId, async (tx) => {
        await this.lockSchool(tx, schoolId);
        const existing = await tx.schoolDepartment.findFirst({ where: { id, schoolId, isActive: true } });
        if (!existing) throw new NotFoundException("Active department not found");
        const department = await tx.schoolDepartment.update({
          where: { id }, data: dto, select: { id: true, name: true, isActive: true },
        });
        await tx.auditLog.create({ data: {
          schoolId, actorUserId: actorId, action: "DEPARTMENT_UPDATED",
          resource: "school_department", resourceId: id,
          summary: { changedFields: Object.keys(dto) },
        } });
        return department;
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw new ConflictException("A department with this name already exists");
      }
      throw error;
    }
  }

  async createTeacherAccount(schoolId: string, actorId: string, dto: CreateTeacherAccountDto) {
    const passwordHash = await argon2.hash(dto.password);
    try {
      return await this.prisma.withTenant(schoolId, async (tx) => {
        await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${dto.email}))::text`;
        await this.lockSchool(tx, schoolId);
        const existing = await tx.user.findFirst({
          where: { email: { equals: dto.email, mode: "insensitive" } }, select: { id: true },
        });
        if (existing) throw new ConflictException("An account already exists for this email");
        if (dto.departmentId) {
          const department = await tx.schoolDepartment.findFirst({
            where: { id: dto.departmentId, schoolId, isActive: true }, select: { id: true },
          });
          if (!department) throw new NotFoundException("Active department not found");
        }
        const permissions = ["dashboard.teacher.read", "announcements.read"];
        let role = await tx.role.findUnique({
          where: { schoolId_key: { schoolId, key: "TEACHER" } },
          include: { permissions: { include: { permission: { select: { key: true } } } } },
        });
        if (role) {
          const keys = new Set(role.permissions.map(({ permission }) => permission.key));
          if (!role.isSystem || keys.size !== permissions.length || !permissions.every((key) => keys.has(key))) {
            throw new ConflictException("The school's Teacher role differs from the standard role");
          }
        } else {
          role = await tx.role.create({
            data: { schoolId, key: "TEACHER", name: "Teacher", isSystem: true },
            include: { permissions: { include: { permission: { select: { key: true } } } } },
          });
          for (const key of permissions) {
            const permission = await tx.permission.upsert({ where: { key }, create: { key }, update: {} });
            await tx.rolePermission.create({ data: { roleId: role.id, permissionId: permission.id } });
          }
        }
        const user = await tx.user.create({
          data: { email: dto.email, passwordHash, firstName: dto.firstName, lastName: dto.lastName, phone: dto.phone },
          select: { id: true, email: true, firstName: true, lastName: true },
        });
        await tx.schoolMembership.create({
          data: { schoolId, userId: user.id, status: "ACTIVE", joinedAt: new Date(), roles: { create: { roleId: role.id } } },
        });
        const staff = await tx.staffProfile.create({
          data: {
            schoolId, userId: user.id, employeeCode: dto.employeeCode, firstName: dto.firstName,
            lastName: dto.lastName, email: dto.email, phone: dto.phone, designation: "Teacher",
            departmentId: dto.departmentId, joinedAt: new Date(), isActive: true,
          },
          include: { departmentRecord: { select: { id: true, name: true, isActive: true } } },
        });
        await tx.auditLog.create({ data: {
          schoolId, actorUserId: actorId, action: "TEACHER_ACCOUNT_CREATED",
          resource: "staff_profile", resourceId: staff.id, summary: { method: "administrator_set_password" },
        } });
        return { ...staff, user };
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw new ConflictException("An account or employee code already exists");
      }
      throw error;
    }
  }

  async list(schoolId: string) {
    return this.prisma.withTenant(schoolId, async (tx) => {
      const staff = await tx.staffProfile.findMany({
        where: { schoolId, isActive: true },
        orderBy: [{ designation: "asc" }, { employeeCode: "asc" }],
        include: {
          departmentRecord: { select: { id: true, name: true, isActive: true } },
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
          departmentRecord: { select: { id: true, name: true, isActive: true } },
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
        let departmentId: string | undefined;
        if (dto.department !== undefined) {
          if (typeof dto.department !== "string") throw new BadRequestException("Invalid department");
          await this.lockSchool(tx, schoolId);
          const department = await tx.schoolDepartment.findFirst({
            where: { schoolId, isActive: true, name: { equals: dto.department.trim(), mode: "insensitive" } },
            select: { id: true },
          });
          if (!department) throw new NotFoundException("Active department not found");
          departmentId = department.id;
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
            designation: dto.designation ?? "Teacher",
            departmentId,
            joinedAt: new Date(),
            isActive: true,
          },
          include: { departmentRecord: { select: { id: true, name: true, isActive: true } } },
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
        const { department, departmentId, ...fields } = dto;
        if (department !== undefined && departmentId !== undefined) {
          throw new BadRequestException("Provide either department or departmentId, not both");
        }
        if (department !== undefined || departmentId !== undefined) await this.lockSchool(tx, schoolId);
        const current = await tx.staffProfile.findFirst({
          where: { id, schoolId, isActive: true },
        });
        if (!current) throw new NotFoundException("Staff record not found");
        let selectedDepartmentId = departmentId;
        if (department !== undefined) {
          if (typeof department !== "string") throw new BadRequestException("Invalid department");
          const selected = await tx.schoolDepartment.findFirst({
            where: { schoolId, isActive: true, name: { equals: department.trim(), mode: "insensitive" } },
            select: { id: true },
          });
          if (!selected) throw new NotFoundException("Active department not found");
          selectedDepartmentId = selected.id;
        } else if (departmentId && departmentId !== current.departmentId) {
          const selected = await tx.schoolDepartment.findFirst({
            where: { id: departmentId, schoolId, isActive: true }, select: { id: true },
          });
          if (!selected) throw new NotFoundException("Active department not found");
        }

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
          data: {
            ...fields,
            ...(department !== undefined || departmentId !== undefined
              ? { departmentId: selectedDepartmentId, department: null }
              : {}),
          },
          include: { departmentRecord: { select: { id: true, name: true, isActive: true } } },
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
