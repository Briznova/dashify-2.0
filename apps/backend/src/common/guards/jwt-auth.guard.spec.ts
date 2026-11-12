import { ExecutionContext, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { AuthScope } from "@prisma/client";
import { PrismaService } from "../../infrastructure/database/prisma.service";
import { JwtAuthGuard } from "./jwt-auth.guard";

describe("JwtAuthGuard browser sessions", () => {
  const request = {
    headers: {},
    cookies: { dashify_access: "signed-access-cookie" },
  };
  const executionContext = {
    switchToHttp: () => ({ getRequest: () => request }),
  } as ExecutionContext;
  const payload = {
    sub: "user-1",
    email: "user@example.test",
    sid: "session-1",
    scope: "school",
    schoolId: "school-1",
    membershipId: "membership-1",
    workspaceRole: "school_admin",
    permissions: ["students.read"],
  };

  function createGuard(activeSession: boolean) {
    const jwt = {
      verifyAsync: jest.fn().mockResolvedValue(payload),
    };
    const config = {
      getOrThrow: jest.fn().mockReturnValue("x".repeat(32)),
    };
    const prisma = {
      refreshToken: {
        findFirst: jest
          .fn()
          .mockResolvedValue(
            activeSession
              ? { id: "refresh-1", scope: AuthScope.SCHOOL }
              : null,
          ),
      },
      platformAdminGrant: { findFirst: jest.fn() },
      schoolMembership: {
        findFirst: jest.fn().mockResolvedValue({
          id: "membership-1",
          roles: [
            {
              role: {
                key: "SCHOOL_ADMIN",
                permissions: [
                  { permission: { key: "students.read" } },
                  { permission: { key: "students.create" } },
                ],
              },
            },
          ],
        }),
      },
    };
    return {
      guard: new JwtAuthGuard(
        jwt as unknown as JwtService,
        config as unknown as ConfigService,
        prisma as unknown as PrismaService,
      ),
      prisma,
    };
  }

  it("accepts only a valid access token backed by an active refresh session and membership", async () => {
    const { guard, prisma } = createGuard(true);

    await expect(guard.canActivate(executionContext)).resolves.toBe(true);
    expect(prisma.refreshToken.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          userId: payload.sub,
          sessionId: "session-1",
          revokedAt: null,
          expiresAt: { gt: expect.any(Date) },
        },
      }),
    );
    expect(prisma.schoolMembership.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: "membership-1",
          schoolId: "school-1",
          userId: "user-1",
          status: "ACTIVE",
        }),
      }),
    );
    expect(request).toHaveProperty("user", {
      id: payload.sub,
      email: payload.email,
      sessionId: payload.sid,
      scope: "school",
      activeSchoolId: payload.schoolId,
      membershipId: payload.membershipId,
      activeWorkspaceRole: payload.workspaceRole,
      permissions: ["students.read", "students.create"],
    });
  });

  it("rejects access tokens after their browser session is revoked", async () => {
    const { guard } = createGuard(false);

    await expect(guard.canActivate(executionContext)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it("grants only the platform directory permission to an active platform session", async () => {
    const platformPayload = {
      sub: "platform-user-1",
      email: "platform@example.test",
      sid: "platform-session-1",
      scope: "platform",
      permissions: ["students.read", "platform.schools.manage"],
    };
    const jwt = { verifyAsync: jest.fn().mockResolvedValue(platformPayload) };
    const config = {
      getOrThrow: jest.fn().mockReturnValue("x".repeat(32)),
    };
    const prisma = {
      refreshToken: {
        findFirst: jest
          .fn()
          .mockResolvedValue({ id: "refresh-1", scope: AuthScope.PLATFORM }),
      },
      platformAdminGrant: {
        findFirst: jest.fn().mockResolvedValue({ id: "grant-1" }),
      },
      schoolMembership: { findFirst: jest.fn() },
    };
    const guard = new JwtAuthGuard(
      jwt as unknown as JwtService,
      config as unknown as ConfigService,
      prisma as unknown as PrismaService,
    );

    await expect(guard.canActivate(executionContext)).resolves.toBe(true);
    expect(prisma.platformAdminGrant.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          userId: platformPayload.sub,
          revokedAt: null,
          user: { is: { isActive: true } },
        },
      }),
    );
    expect(request).toHaveProperty("user", {
      id: platformPayload.sub,
      email: platformPayload.email,
      sessionId: platformPayload.sid,
      scope: "platform",
      permissions: ["platform.schools.read"],
    });
    expect(prisma.schoolMembership.findFirst).not.toHaveBeenCalled();
  });

  it("rejects a school-scoped token when its account has an active platform grant", async () => {
    const { guard, prisma } = createGuard(true);
    prisma.platformAdminGrant.findFirst.mockResolvedValue({ id: "grant-1" });

    await expect(guard.canActivate(executionContext)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(prisma.schoolMembership.findFirst).not.toHaveBeenCalled();
  });
});
