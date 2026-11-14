import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { AuthScope, type Prisma, type RefreshToken } from "@prisma/client";
import { createHash, randomBytes, randomUUID } from "crypto";
import * as argon2 from "argon2";
import { PrismaService } from "../../infrastructure/database/prisma.service";
import { LoginDto } from "./dto/login.dto";
import { ChangePasswordDto } from "./dto/change-password.dto";
import {
  platformGrantSelect,
  platformPermissionKeys,
} from "../../common/platform-permissions";
import type { AuthCredentials } from "./auth-cookies";
import { getAuthTokenTtls } from "./auth-token-ttls";

type SessionContext = {
  sessionId: string;
  scope: "platform" | "school-selection" | "school";
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
    const platformGrant = await this.prisma.platformAdminGrant.findFirst({
      where: { userId: user.id, revokedAt: null },
      select: platformGrantSelect,
    });
    if (platformGrant) {
      const activeMembershipCount = await this.prisma.schoolMembership.count({
        where: { userId: user.id, status: "ACTIVE" },
      });
      if (activeMembershipCount > 0) {
        throw new ForbiddenException(
          "Platform administrator accounts cannot have active school memberships",
        );
      }
      const sessionId = randomUUID();
      const refreshToken = this.newRefreshToken();
      const context: SessionContext = {
        sessionId,
        scope: "platform",
        activeSchoolId: null,
        membershipId: null,
        activeWorkspaceRole: null,
        permissionKeys: platformPermissionKeys(platformGrant),
      };
      await this.createLoginSession(user, {
        userId: user.id,
        tokenHash: this.hashToken(refreshToken),
        expiresAt: this.refreshExpiry(),
        sessionId,
        scope: AuthScope.PLATFORM,
      });
      const accessToken = await this.createAccessToken(user, context);
      return {
        body: this.sessionResponse(user, [], context, null),
        credentials: this.credentials(accessToken, refreshToken),
      };
    }

    const memberships = await this.activeMemberships(user.id);
    if (memberships.length === 0) {
      throw new ForbiddenException("An active school membership is required");
    }

    const sessionId = randomUUID();
    const refreshToken = this.newRefreshToken();
    await this.createLoginSession(user, {
      userId: user.id,
      tokenHash: this.hashToken(refreshToken),
      expiresAt: this.refreshExpiry(),
      sessionId,
      scope: AuthScope.SCHOOL_SELECTION,
    });

    const context: SessionContext = {
      sessionId,
      scope: "school-selection",
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

    if (existing.scope !== AuthScope.PLATFORM) {
      const platformGrant = await this.prisma.platformAdminGrant.findFirst({
        where: { userId: user.id, revokedAt: null },
        select: { id: true },
      });
      if (platformGrant) {
        await this.revokeSession(existing.sessionId);
        throw new UnauthorizedException();
      }
    }

    let activeMembership: MembershipRecord | null = null;
    let permissionKeys: string[] = [];
    if (existing.scope === AuthScope.PLATFORM) {
      const platformGrant = await this.prisma.platformAdminGrant.findFirst({
        where: { userId: user.id, revokedAt: null },
        select: platformGrantSelect,
      });
      if (
        !platformGrant ||
        existing.activeSchoolId ||
        existing.membershipId ||
        existing.activeWorkspaceRole
      ) {
        await this.revokeSession(existing.sessionId);
        throw new UnauthorizedException();
      }
      permissionKeys = platformPermissionKeys(platformGrant);
    } else if (existing.scope === AuthScope.SCHOOL) {
      if (!existing.activeSchoolId || !existing.membershipId) {
        await this.revokeSession(existing.sessionId);
        throw new UnauthorizedException();
      }
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
    } else if (
      existing.scope === AuthScope.SCHOOL_SELECTION &&
      (existing.activeSchoolId ||
        existing.membershipId ||
        existing.activeWorkspaceRole)
    ) {
      await this.revokeSession(existing.sessionId);
      throw new UnauthorizedException();
    }

    const context: SessionContext = {
      sessionId: existing.sessionId,
      scope: this.sessionScope(existing.scope),
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

    const memberships =
      context.scope === "platform" ? [] : await this.activeMemberships(user.id);
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

  async changePassword(
    userId: string,
    sessionId: string | undefined,
    dto: ChangePasswordDto,
  ): Promise<void> {
    if (!sessionId) throw new UnauthorizedException();
    const result = await this.prisma.$transaction(async (transaction) => {
      await this.lockAuthSessions(transaction, userId);
      const currentSession = await transaction.$queryRaw<{ id: string }[]>`
        SELECT id FROM refresh_tokens
        WHERE user_id = ${userId}::uuid AND session_id = ${sessionId}::uuid
          AND revoked_at IS NULL AND expires_at > NOW()
        FOR UPDATE
      `;
      const user = await transaction.user.findUnique({
        where: { id: userId },
        select: { isActive: true, passwordHash: true },
      });
      if (!currentSession.length || !user?.isActive)
        throw new UnauthorizedException();
      if (!(await argon2.verify(user.passwordHash, dto.currentPassword))) {
        await transaction.auditLog.create({
          data: {
            actorUserId: userId,
            action: "PASSWORD_CHANGE_FAILED",
            resource: "user",
            resourceId: userId,
          },
        });
        return false;
      }

      const passwordHash = await argon2.hash(dto.newPassword);
      await transaction.user.update({
        where: { id: userId },
        data: { passwordHash },
      });
      await transaction.refreshToken.updateMany({
        where: {
          userId,
          revokedAt: null,
          OR: [{ sessionId: { not: sessionId } }, { sessionId: null }],
        },
        data: { revokedAt: new Date() },
      });
      await transaction.auditLog.create({
        data: {
          actorUserId: userId,
          action: "PASSWORD_CHANGED",
          resource: "user",
          resourceId: userId,
        },
      });
      return true;
    });
    if (!result)
      throw new BadRequestException("Current password is incorrect.");
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
    if (existing.scope === AuthScope.PLATFORM) {
      throw new ForbiddenException("Platform sessions cannot select a school");
    }
    const platformGrant = await this.prisma.platformAdminGrant.findFirst({
      where: { userId, revokedAt: null },
      select: { id: true },
    });
    if (platformGrant) {
      throw new ForbiddenException("Platform sessions cannot select a school");
    }

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
      scope: "school",
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

  async listSchools(userId: string, scope: string | undefined) {
    const platformGrant = await this.prisma.platformAdminGrant.findFirst({
      where: { userId, revokedAt: null },
      select: { id: true },
    });
    if (scope === "platform" || platformGrant) {
      throw new ForbiddenException(
        "Platform sessions do not use school selection",
      );
    }
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

    if (context.scope === "platform") {
      const platformGrant = await this.prisma.platformAdminGrant.findFirst({
        where: { userId, revokedAt: null },
        select: platformGrantSelect,
      });
      if (
        !platformGrant ||
        context.activeSchoolId ||
        context.membershipId ||
        context.activeWorkspaceRole
      ) {
        throw new UnauthorizedException();
      }
      return this.sessionResponse(
        user,
        [],
        {
          ...context,
          scope: "platform",
          permissionKeys: platformPermissionKeys(platformGrant),
        },
        null,
      );
    }

    const memberships = await this.activeMemberships(userId);
    let activeMembership: MembershipRecord | null = null;
    let permissionKeys: string[] = [];
    if (context.scope === "school") {
      if (!context.activeSchoolId || !context.membershipId) {
        throw new UnauthorizedException();
      }
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
    } else if (
      context.scope !== "school-selection" ||
      context.activeSchoolId ||
      context.membershipId ||
      context.activeWorkspaceRole
    ) {
      throw new UnauthorizedException();
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
      scope: context.scope,
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
        scope: context.scope,
        schoolId: context.activeSchoolId ?? undefined,
        membershipId: context.membershipId ?? undefined,
        workspaceRole: context.activeWorkspaceRole ?? undefined,
        permissions: context.permissionKeys,
      },
      {
        secret: this.config.getOrThrow<string>("AUTH_ACCESS_TOKEN_SECRET"),
        expiresIn: getAuthTokenTtls(this.config).accessTokenTtlSeconds,
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
      Date.now() + getAuthTokenTtls(this.config).refreshTokenTtlSeconds * 1000,
    );
  }

  private async lockAuthSessions(
    transaction: Prisma.TransactionClient,
    userId: string,
  ): Promise<void> {
    // Serialize password changes with login session creation and refresh rotation.
    await transaction.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${"dashify:auth:" + userId}, 0))::text`;
  }

  private async createLoginSession(
    user: { id: string; passwordHash: string },
    data: Prisma.RefreshTokenUncheckedCreateInput,
  ): Promise<void> {
    await this.prisma.$transaction(async (transaction) => {
      await this.lockAuthSessions(transaction, user.id);
      const current = await transaction.user.findUnique({
        where: { id: user.id },
        select: { isActive: true, passwordHash: true },
      });
      if (!current?.isActive || current.passwordHash !== user.passwordHash) {
        throw new UnauthorizedException("Invalid email or password");
      }
      await transaction.refreshToken.create({ data });
    });
  }

  private async rotateRefreshToken(
    existing: RefreshToken,
    rawToken: string,
    context: SessionContext,
  ): Promise<void> {
    const now = new Date();
    const next = await this.prisma.$transaction(async (transaction) => {
      await this.lockAuthSessions(transaction, existing.userId);
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
          scope: this.databaseScope(context.scope),
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

  private sessionScope(scope: AuthScope): SessionContext["scope"] {
    switch (scope) {
      case AuthScope.PLATFORM:
        return "platform";
      case AuthScope.SCHOOL:
        return "school";
      case AuthScope.SCHOOL_SELECTION:
        return "school-selection";
    }
  }

  private databaseScope(scope: SessionContext["scope"]): AuthScope {
    switch (scope) {
      case "platform":
        return AuthScope.PLATFORM;
      case "school":
        return AuthScope.SCHOOL;
      case "school-selection":
        return AuthScope.SCHOOL_SELECTION;
    }
  }
}
