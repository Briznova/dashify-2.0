import {
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../../infrastructure/database/prisma.service";
import { AssignTeacherDto } from "./dto/assign-teacher.dto";
import { CreateStaffDto } from "./dto/create-staff.dto";

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

      const userIds = [...new Set(staff.map((member) => member.userId).filter((id): id is string => Boolean(id)))];
      const users = userIds.length
        ? await tx.user.findMany({
            where: { id: { in: userIds } },
            select: { id: true, email: true, firstName: true, lastName: true },
          })
        : [];

      const userById = new Map(users.map((user) => [user.id, user]));
      return staff.map((member) => ({
        ...member,
        user: member.userId ? userById.get(member.userId) ?? null : null,
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

  async create(schoolId: string, dto: CreateStaffDto) {
    return this.prisma.withTenant(schoolId, async (tx) => {
      if (dto.employeeCode) {
        const duplicate = await tx.staffProfile.findFirst({
          where: { schoolId, employeeCode: dto.employeeCode },
        });
        if (duplicate) {
          throw new ConflictException("Employee code already exists in this school");
        }
      }

      let linkedUser: { firstName: string; lastName: string | null; email: string; phone: string | null } | null = null;
      if (dto.userId) {
        const user = await tx.user.findUnique({ where: { id: dto.userId } });
        if (!user) throw new NotFoundException("User not found");
        linkedUser = {
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          phone: user.phone,
        };
      }

      const staff = await tx.staffProfile.create({
        data: {
          schoolId,
          userId: dto.userId,
          firstName: dto.firstName ?? linkedUser?.firstName,
          lastName: dto.lastName ?? linkedUser?.lastName,
          email: dto.email ?? linkedUser?.email,
          phone: dto.phone ?? linkedUser?.phone ?? null,
          employeeCode: dto.employeeCode,
          designation: dto.designation,
          department: dto.department,
          joinedAt: new Date(),
          isActive: true,
        },
      });

      if (dto.userId) {
        const user = await tx.user.findUnique({
          where: { id: dto.userId },
          select: { id: true, email: true, firstName: true, lastName: true },
        });
        return { ...staff, user };
      }

      return { ...staff, user: null };
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

      const userIds = [...new Set(assignments.map((assignment) => assignment.staff.userId).filter((id): id is string => Boolean(id)))];
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
          user: assignment.staff.userId ? userById.get(assignment.staff.userId) ?? null : null,
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
          where: { id: dto.sectionId, schoolId, classId: dto.classId, isActive: true },
        });
        if (!section) {
          throw new NotFoundException("Section not found in the selected class");
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
