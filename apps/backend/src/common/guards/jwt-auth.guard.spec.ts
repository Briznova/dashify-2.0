import { ExecutionContext, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
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
          .mockResolvedValue(activeSession ? { id: "refresh-1" } : null),
      },
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
});
