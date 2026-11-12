import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
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
          sessionId: payload.sid,
          revokedAt: null,
          expiresAt: { gt: new Date() },
        },
        select: { id: true },
      });
      if (!activeSession) throw new UnauthorizedException();
    }

    if (payload.schoolId || payload.membershipId) {
      if (!payload.schoolId || !payload.membershipId) {
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

    request.user = {
      id: payload.sub,
      email: payload.email,
      sessionId: payload.sid,
      activeSchoolId: payload.schoolId,
      membershipId: payload.membershipId,
      activeWorkspaceRole: payload.workspaceRole,
      permissions: payload.permissions ?? [],
    };
    return true;
  }
}
