import {
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import type { Prisma, RefreshToken } from "@prisma/client";
import { createHash, randomBytes, randomUUID } from "crypto";
import * as argon2 from "argon2";
import { PrismaService } from "../../infrastructure/database/prisma.service";
import { LoginDto } from "./dto/login.dto";
import type { AuthCredentials } from "./auth-cookies";

type SessionContext = {
  sessionId: string;
  activeSchoolId: string | null;
  membershipId: string | null;
  activeWorkspaceRole: string | null;
  permissionKeys: string[];
};

const membershipInclude = {
  school: { select: { id: true, name: true, isActive: true } },
  roles: {
    include: {
      role: {
        include: {
          permissions: { include: { permission: true } },
        },
      },
    },
  },
} as const;

type MembershipRecord = Prisma.SchoolMembershipGetPayload<{
  include: typeof membershipInclude;
}>;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async login(dto: LoginDto, existingRefreshToken?: string) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.trim().toLowerCase() },
    });
    if (
      !user ||
      !user.isActive ||
      !(await argon2.verify(user.passwordHash, dto.password))
    ) {
      throw new UnauthorizedException("Invalid email or password");
    }

    await this.logout(existingRefreshToken);
    const memberships = await this.activeMemberships(user.id);
    if (memberships.length === 0) {
      throw new ForbiddenException("An active school membership is required");
    }

    const sessionId = randomUUID();
    const refreshToken = this.newRefreshToken();
    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: this.hashToken(refreshToken),
        expiresAt: this.refreshExpiry(),
        sessionId,
      },
    });

    const context: SessionContext = {
      sessionId,
      activeSchoolId: null,
      membershipId: null,
      activeWorkspaceRole: null,
      permissionKeys: [],
    };
    const accessToken = await this.createAccessToken(user, context);

    return {
      body: {
        user: this.userSummary(user),
        scope: "school-selection" as const,
        memberships: memberships.map((membership) =>
          this.membershipSummary(membership),
        ),
        activeSchool: null,
      },
      credentials: this.credentials(accessToken, refreshToken),
    };
  }

  async refresh(rawRefreshToken: string | undefined) {
    if (!rawRefreshToken) throw new UnauthorizedException();

    const existing = await this.prisma.refreshToken.findFirst({
      where: { tokenHash: this.hashToken(rawRefreshToken) },
    });
    if (!existing) throw new UnauthorizedException();
    if (!existing.sessionId) {
      await this.prisma.refreshToken.updateMany({
        where: { id: existing.id, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      throw new UnauthorizedException();
    }
    if (existing.revokedAt || existing.expiresAt <= new Date()) {
      await this.revokeSession(existing.sessionId);
      throw new UnauthorizedException();
    }

    const user = await this.prisma.user.findUnique({
      where: { id: existing.userId },
    });
    if (!user?.isActive) {
      await this.revokeSession(existing.sessionId);
      throw new UnauthorizedException();
    }

    let activeMembership: MembershipRecord | null = null;
    let permissionKeys: string[] = [];
    if (existing.activeSchoolId && existing.membershipId) {
      activeMembership = await this.prisma.schoolMembership.findFirst({
        where: {
          id: existing.membershipId,
          schoolId: existing.activeSchoolId,
          userId: user.id,
          status: "ACTIVE",
          school: { isActive: true },
        },
        include: membershipInclude,
      });
      if (
        !activeMembership ||
        !existing.activeWorkspaceRole ||
        !this.schoolWorkspaceRoles(activeMembership).some(
          ({ role }) =>
            role.key.toLowerCase() ===
            existing.activeWorkspaceRole?.toLowerCase(),
        )
      ) {
        await this.revokeSession(existing.sessionId);
        throw new UnauthorizedException();
      }
      permissionKeys = this.permissionsFor(activeMembership);
    }

    const context: SessionContext = {
      sessionId: existing.sessionId,
      activeSchoolId: activeMembership?.schoolId ?? null,
      membershipId: activeMembership?.id ?? null,
      activeWorkspaceRole: activeMembership
        ? existing.activeWorkspaceRole
        : null,
      permissionKeys,
    };
    const nextRefreshToken = this.newRefreshToken();
    const accessToken = await this.createAccessToken(user, context);
    await this.rotateRefreshToken(existing, nextRefreshToken, context);

    const memberships = await this.activeMemberships(user.id);
    return {
      body: this.sessionResponse(user, memberships, context, activeMembership),
      credentials: this.credentials(accessToken, nextRefreshToken),
    };
  }

  async logout(rawRefreshToken: string | undefined): Promise<void> {
    if (!rawRefreshToken) return;

    const existing = await this.prisma.refreshToken.findFirst({
      where: { tokenHash: this.hashToken(rawRefreshToken) },
    });
    if (!existing) return;

    if (existing.sessionId) {
      await this.revokeSession(existing.sessionId);
      return;
    }
    await this.prisma.refreshToken.updateMany({
      where: { id: existing.id, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async selectSchool(
    userId: string,
    sessionId: string | undefined,
    rawRefreshToken: string | undefined,
    schoolId: string,
    requestedWorkspaceRole: string,
  ) {
    if (!sessionId || !rawRefreshToken) throw new UnauthorizedException();
    const existing = await this.prisma.refreshToken.findFirst({
      where: {
        tokenHash: this.hashToken(rawRefreshToken),
        userId,
        sessionId,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
    });
    if (!existing) throw new UnauthorizedException();

    const membership = await this.prisma.schoolMembership.findFirst({
      where: {
        userId,
        schoolId,
        status: "ACTIVE",
        school: { isActive: true },
      },
      include: membershipInclude,
    });
    if (!membership)
      throw new ForbiddenException("Active school membership required");

    const role = this.schoolWorkspaceRoles(membership).find(
      ({ role: item }) =>
        item.key.toLowerCase() === requestedWorkspaceRole.trim().toLowerCase(),
    );
    if (!role) throw new ForbiddenException("Workspace role is not assigned");

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user?.isActive) throw new UnauthorizedException();

    const context: SessionContext = {
      sessionId,
      activeSchoolId: membership.schoolId,
      membershipId: membership.id,
      activeWorkspaceRole: role.role.key.toLowerCase(),
      permissionKeys: this.permissionsFor(membership),
    };
    const nextRefreshToken = this.newRefreshToken();
    const accessToken = await this.createAccessToken(user, context);
    await this.rotateRefreshToken(existing, nextRefreshToken, context);

    const memberships = await this.activeMemberships(userId);
    return {
      body: this.sessionResponse(user, memberships, context, membership),
      credentials: this.credentials(accessToken, nextRefreshToken),
    };
  }

  async listSchools(userId: string) {
    const memberships = await this.activeMemberships(userId);
    return memberships.map((membership) => this.membershipSummary(membership));
  }

  async currentSession(
    userId: string,
    context: Omit<SessionContext, "sessionId">,
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user?.isActive) throw new UnauthorizedException();

    const memberships = await this.activeMemberships(userId);
    let activeMembership: MembershipRecord | null = null;
    let permissionKeys: string[] = [];
    if (context.activeSchoolId && context.membershipId) {
      activeMembership = await this.prisma.schoolMembership.findFirst({
        where: {
          id: context.membershipId,
          schoolId: context.activeSchoolId,
          userId,
          status: "ACTIVE",
          school: { isActive: true },
        },
        include: membershipInclude,
      });
      if (
        !activeMembership ||
        !context.activeWorkspaceRole ||
        !this.schoolWorkspaceRoles(activeMembership).some(
          ({ role }) =>
            role.key.toLowerCase() ===
            context.activeWorkspaceRole?.toLowerCase(),
        )
      ) {
        throw new UnauthorizedException();
      }
      permissionKeys = this.permissionsFor(activeMembership);
    }

    return this.sessionResponse(
      user,
      memberships,
      {
        ...context,
        permissionKeys,
      },
      activeMembership,
    );
  }

  private async activeMemberships(userId: string) {
    return this.prisma.schoolMembership.findMany({
      where: {
        userId,
        status: "ACTIVE",
        school: { isActive: true },
      },
      include: membershipInclude,
      orderBy: { createdAt: "asc" },
    });
  }

  private userSummary(user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string | null;
  }) {
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
    };
  }

  private membershipSummary(membership: MembershipRecord) {
    return {
      membershipId: membership.id,
      school: {
        id: membership.school.id,
        name: membership.school.name,
      },
      workspaceRoles: this.schoolWorkspaceRoles(membership).map(({ role }) =>
        role.key.toLowerCase(),
      ),
    };
  }

  private sessionResponse(
    user: {
      id: string;
      email: string;
      firstName: string;
      lastName: string | null;
    },
    memberships: MembershipRecord[],
    context: Omit<SessionContext, "sessionId">,
    activeMembership: MembershipRecord | null,
  ) {
    return {
      user: this.userSummary(user),
      scope: activeMembership
        ? ("school" as const)
        : ("school-selection" as const),
      memberships: memberships.map((membership) =>
        this.membershipSummary(membership),
      ),
      activeSchool: activeMembership
        ? {
            id: activeMembership.school.id,
            name: activeMembership.school.name,
          }
        : null,
      workspaceRoles: activeMembership
        ? this.schoolWorkspaceRoles(activeMembership).map(({ role }) =>
            role.key.toLowerCase(),
          )
        : [],
      activeWorkspaceRole: context.activeWorkspaceRole,
      permissionKeys: context.permissionKeys,
    };
  }

  private permissionsFor(membership: MembershipRecord): string[] {
    return [
      ...new Set(
        this.schoolWorkspaceRoles(membership).flatMap(({ role }) =>
          role.permissions.map(({ permission }) => permission.key),
        ),
      ),
    ];
  }

  private schoolWorkspaceRoles(membership: MembershipRecord) {
    return membership.roles.filter(({ role }) => {
      const key = role.key.toLowerCase();
      return key !== "super_admin" && key !== "platform_super_admin";
    });
  }

  private async createAccessToken(
    user: { id: string; email: string },
    context: SessionContext,
  ): Promise<string> {
    return this.jwt.signAsync(
      {
        sub: user.id,
        email: user.email,
        sid: context.sessionId,
        scope: context.activeSchoolId ? "school" : "school-selection",
        schoolId: context.activeSchoolId ?? undefined,
        membershipId: context.membershipId ?? undefined,
        workspaceRole: context.activeWorkspaceRole ?? undefined,
        permissions: context.permissionKeys,
      },
      {
        secret: this.config.getOrThrow<string>("AUTH_ACCESS_TOKEN_SECRET"),
        expiresIn: Number(this.config.get("ACCESS_TOKEN_TTL_SECONDS", 900)),
      },
    );
  }

  private credentials(
    accessToken: string,
    refreshToken: string,
  ): AuthCredentials {
    return {
      accessToken,
      refreshToken,
      csrfToken: randomBytes(32).toString("base64url"),
    };
  }

  private newRefreshToken(): string {
    return randomBytes(48).toString("base64url");
  }

  private hashToken(token: string): string {
    return createHash("sha256").update(token).digest("hex");
  }

  private refreshExpiry(): Date {
    return new Date(
      Date.now() +
        Number(this.config.get("REFRESH_TOKEN_TTL_SECONDS", 2_592_000)) * 1000,
    );
  }

  private async rotateRefreshToken(
    existing: RefreshToken,
    rawToken: string,
    context: SessionContext,
  ): Promise<void> {
    const now = new Date();
    const next = await this.prisma.$transaction(async (transaction) => {
      const revoked = await transaction.refreshToken.updateMany({
        where: {
          id: existing.id,
          revokedAt: null,
          expiresAt: { gt: now },
        },
        data: { revokedAt: now },
      });
      if (revoked.count !== 1) return null;

      const replacement = await transaction.refreshToken.create({
        data: {
          userId: existing.userId,
          tokenHash: this.hashToken(rawToken),
          expiresAt: this.refreshExpiry(),
          sessionId: context.sessionId,
          activeSchoolId: context.activeSchoolId,
          membershipId: context.membershipId,
          activeWorkspaceRole: context.activeWorkspaceRole,
        },
      });
      await transaction.refreshToken.update({
        where: { id: existing.id },
        data: { replacedById: replacement.id },
      });
      return replacement;
    });

    if (!next) {
      await this.revokeSession(context.sessionId);
      throw new UnauthorizedException();
    }
  }

  private async revokeSession(sessionId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { sessionId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
}
