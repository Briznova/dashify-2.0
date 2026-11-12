import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { AuthScope } from "@prisma/client";
import { PrismaService } from "../../infrastructure/database/prisma.service";
import { AuthenticatedRequest } from "../interfaces/authenticated-request";
import { ACCESS_COOKIE } from "../../modules/auth/auth-cookies";

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const header = request.headers.authorization;
    const cookieToken = request.cookies?.[ACCESS_COOKIE];
    const token =
      cookieToken ??
      (header?.startsWith("Bearer ") ? header.slice(7) : undefined);
    if (!token) throw new UnauthorizedException();

    let payload: {
      sub: string;
      email: string;
      sid?: string;
      scope?: string;
      schoolId?: string;
      membershipId?: string;
      workspaceRole?: string;
      permissions?: string[];
    };
    try {
      payload = await this.jwt.verifyAsync<{
        sub: string;
        email: string;
        sid?: string;
        scope?: string;
        schoolId?: string;
        membershipId?: string;
        workspaceRole?: string;
        permissions?: string[];
      }>(token, {
        secret: this.config.getOrThrow<string>("AUTH_ACCESS_TOKEN_SECRET"),
      });
    } catch {
      throw new UnauthorizedException();
    }

    if (payload.sid) {
      const activeSession = await this.prisma.refreshToken.findFirst({
        where: {
          userId: payload.sub,
          sessionId: payload.sid,
          revokedAt: null,
          expiresAt: { gt: new Date() },
        },
        select: { id: true, scope: true },
      });
      const expectedScope =
        payload.scope === "platform"
          ? AuthScope.PLATFORM
          : payload.scope === "school"
            ? AuthScope.SCHOOL
            : payload.scope === "school-selection"
              ? AuthScope.SCHOOL_SELECTION
              : null;
      if (!activeSession || !expectedScope || activeSession.scope !== expectedScope) {
        throw new UnauthorizedException();
      }
    }

    if (payload.scope === "platform") {
      if (
        !payload.sid ||
        payload.schoolId ||
        payload.membershipId ||
        payload.workspaceRole
      ) {
        throw new UnauthorizedException();
      }
      const platformGrant = await this.prisma.platformAdminGrant.findFirst({
        where: {
          userId: payload.sub,
          revokedAt: null,
          user: { is: { isActive: true } },
        },
        select: { id: true },
      });
      if (!platformGrant) throw new UnauthorizedException();
      request.user = {
        id: payload.sub,
        email: payload.email,
        sessionId: payload.sid,
        scope: "platform",
        permissions: ["platform.schools.read"],
      };
      return true;
    }

    const platformGrant = await this.prisma.platformAdminGrant.findFirst({
      where: {
        userId: payload.sub,
        revokedAt: null,
        user: { is: { isActive: true } },
      },
      select: { id: true },
    });
    if (platformGrant) throw new UnauthorizedException();

    if (payload.schoolId || payload.membershipId) {
      if (
        payload.scope !== "school" ||
        !payload.schoolId ||
        !payload.membershipId
      ) {
        throw new UnauthorizedException();
      }
      const activeMembership = await this.prisma.schoolMembership.findFirst({
        where: {
          id: payload.membershipId,
          schoolId: payload.schoolId,
          userId: payload.sub,
          status: "ACTIVE",
          school: { isActive: true },
        },
        include: {
          roles: {
            include: {
              role: {
                include: {
                  permissions: { include: { permission: true } },
                },
              },
            },
          },
        },
      });
      if (!activeMembership) throw new UnauthorizedException();
      const workspaceRoles = activeMembership.roles.filter(({ role }) => {
        const key = role.key.toLowerCase();
        return key !== "super_admin" && key !== "platform_super_admin";
      });
      if (
        payload.sid &&
        (!payload.workspaceRole ||
          !workspaceRoles.some(
            ({ role }) =>
              role.key.toLowerCase() === payload.workspaceRole?.toLowerCase(),
          ))
      ) {
        throw new UnauthorizedException();
      }
      request.user = {
        id: payload.sub,
        email: payload.email,
        sessionId: payload.sid,
        scope: "school",
        activeSchoolId: payload.schoolId,
        membershipId: payload.membershipId,
        activeWorkspaceRole: payload.workspaceRole,
        permissions: [
          ...new Set(
            workspaceRoles.flatMap(({ role }) =>
              role.permissions.map(({ permission }) => permission.key),
            ),
          ),
        ],
      };
      return true;
    }

    if (
      payload.scope !== "school-selection" ||
      payload.workspaceRole
    ) {
      throw new UnauthorizedException();
    }
    request.user = {
      id: payload.sub,
      email: payload.email,
      sessionId: payload.sid,
      scope: "school-selection",
      activeSchoolId: payload.schoolId,
      membershipId: payload.membershipId,
      activeWorkspaceRole: payload.workspaceRole,
      permissions: payload.permissions ?? [],
    };
    return true;
  }
}
