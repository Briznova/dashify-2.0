import { ConflictException, Injectable, NotFoundException, ServiceUnavailableException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { MembershipStatus, Prisma } from "@prisma/client";
import * as argon2 from "argon2";
import { SCHOOL_ADMIN_PERMISSIONS } from "../../common/school-admin-permissions";
import { PrismaService } from "../../infrastructure/database/prisma.service";
import { CreateSchoolAdminDto } from "./dto/create-school-admin.dto";

@Injectable()
export class SchoolAdminService {
  constructor(private readonly prisma: PrismaService, private readonly config: ConfigService) {}

  async create(actorUserId: string, schoolId: string, input: CreateSchoolAdminDto) {
    const password = this.config.get<string>("SCHOOL_ADMIN_DEFAULT_PASSWORD");
    if (!password || password.length < 12) {
      throw new ServiceUnavailableException("School administrator default password is not configured");
    }

    const passwordHash = await argon2.hash(password);
    try {
      return await this.prisma.withTenant(schoolId, async (tx) => {
        await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${input.email}))::text`;
        const schools = await tx.$queryRaw<{ id: string }[]>`
          SELECT id FROM schools WHERE id = ${schoolId}::uuid AND is_active = true FOR UPDATE
        `;
        if (!schools.length) throw new NotFoundException("Active school not found");
        const existing = await tx.user.findFirst({
          where: { email: { equals: input.email, mode: "insensitive" } },
          select: { id: true },
        });
        if (existing) throw new ConflictException("An account already exists for this email");

        let role = await tx.role.findUnique({
          where: { schoolId_key: { schoolId, key: "SCHOOL_ADMIN" } },
          include: { permissions: { include: { permission: { select: { key: true } } } } },
        });
        if (role) {
          const keys = new Set(role.permissions.map(({ permission }) => permission.key));
          if (!role.isSystem || keys.size !== SCHOOL_ADMIN_PERMISSIONS.length ||
            !SCHOOL_ADMIN_PERMISSIONS.every((key) => keys.has(key))) {
            throw new ConflictException("The school's administrator role differs from the standard role");
          }
        } else {
          role = await tx.role.create({
            data: { schoolId, key: "SCHOOL_ADMIN", name: "School Admin", isSystem: true },
            include: { permissions: { include: { permission: { select: { key: true } } } } },
          });
          for (const key of SCHOOL_ADMIN_PERMISSIONS) {
            const permission = await tx.permission.upsert({ where: { key }, create: { key }, update: {} });
            await tx.rolePermission.create({ data: { roleId: role.id, permissionId: permission.id } });
          }
        }
        const user = await tx.user.create({
          data: { email: input.email, passwordHash, firstName: input.firstName, lastName: input.lastName },
          select: { id: true, email: true },
        });
        await tx.schoolMembership.create({
          data: {
            schoolId, userId: user.id, status: MembershipStatus.ACTIVE, joinedAt: new Date(),
            roles: { create: { roleId: role.id } },
          },
        });
        await tx.auditLog.create({
          data: { actorUserId, action: "PLATFORM_SCHOOL_ADMIN_CREATED", resource: "school", resourceId: schoolId,
            summary: { method: "shared_default_password" } },
        });
        return { id: user.id, email: user.email, schoolId };
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002" && Array.isArray(error.meta?.target) &&
        error.meta.target.length === 1 && error.meta.target[0] === "email") {
        throw new ConflictException("An account already exists for this email");
      }
      throw error;
    }
  }
}
