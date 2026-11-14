import {
  BadRequestException,
  ForbiddenException,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { AuthScope } from "@prisma/client";
import { PrismaService } from "../../infrastructure/database/prisma.service";
import { AuthService } from "./auth.service";
import * as argon2 from "argon2";

jest.mock("argon2", () => ({
  verify: jest.fn(),
  hash: jest.fn(),
}));

describe("AuthService browser sessions", () => {
  const user = {
    id: "user-1",
    email: "admin@example.test",
    passwordHash: "hashed-password",
    firstName: "Avery",
    lastName: "Johnson",
    phone: null,
    isActive: true,
    emailVerifiedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  const membership = {
    id: "membership-1",
    userId: user.id,
    schoolId: "school-1",
    status: "ACTIVE",
    joinedAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
    school: { id: "school-1", name: "Example School", isActive: true },
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
  };

  let prismaMock: {
    user: { findUnique: jest.Mock; update: jest.Mock };
    auditLog: { create: jest.Mock };
    platformAdminGrant: { findFirst: jest.Mock };
    schoolMembership: {
      findMany: jest.Mock;
      findFirst: jest.Mock;
      count: jest.Mock;
    };
    refreshToken: {
      create: jest.Mock;
      findFirst: jest.Mock;
      updateMany: jest.Mock;
    };
    $transaction: jest.Mock;
    $queryRaw: jest.Mock;
  };
  let auth: AuthService;

  beforeEach(() => {
    prismaMock = {
      user: { findUnique: jest.fn(), update: jest.fn().mockResolvedValue({}) },
      auditLog: { create: jest.fn().mockResolvedValue({}) },
      platformAdminGrant: { findFirst: jest.fn().mockResolvedValue(null) },
      schoolMembership: {
        findMany: jest.fn().mockResolvedValue([membership]),
        findFirst: jest.fn(),
        count: jest.fn().mockResolvedValue(0),
      },
      refreshToken: {
        create: jest.fn().mockResolvedValue({ id: "refresh-1" }),
        findFirst: jest.fn(),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      $transaction: jest.fn(),
      $queryRaw: jest.fn().mockResolvedValue([{ id: "refresh-1" }]),
    };
    prismaMock.$transaction.mockImplementation(
      async (callback: (client: typeof prismaMock) => Promise<unknown>) =>
        callback(prismaMock),
    );
    const jwt = {
      signAsync: jest.fn().mockResolvedValue("signed-access-cookie"),
    };
    const config = {
      getOrThrow: jest.fn().mockReturnValue("x".repeat(32)),
      get: jest.fn((_key: string, fallback: unknown) => fallback),
    };
    auth = new AuthService(
      prismaMock as unknown as PrismaService,
      jwt as unknown as JwtService,
      config as unknown as ConfigService,
    );
    jest.mocked(argon2.verify).mockResolvedValue(true);
    jest.mocked(argon2.hash).mockResolvedValue("new-hash");
  });

  it("creates a browser session without returning credentials in JSON", async () => {
    prismaMock.user.findUnique.mockResolvedValue(user);

    const result = await auth.login({
      email: " ADMIN@EXAMPLE.TEST ",
      password: "example-password",
    });

    expect(prismaMock.user.findUnique).toHaveBeenCalledWith({
      where: { email: "admin@example.test" },
    });
    expect(prismaMock.refreshToken.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: user.id,
        sessionId: expect.any(String),
        tokenHash: expect.any(String),
      }),
    });
    expect(result.body).toEqual({
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
      },
      scope: "school-selection",
      memberships: [
        {
          membershipId: membership.id,
          school: { id: membership.school.id, name: membership.school.name },
          workspaceRoles: ["school_admin"],
        },
      ],
      activeSchool: null,
    });
    expect(result.credentials.accessToken).toBe("signed-access-cookie");
    expect("refreshToken" in result.body).toBe(false);
    expect("accessToken" in result.body).toBe(false);
  });

  it("rejects invalid credentials without creating a session", async () => {
    prismaMock.user.findUnique.mockResolvedValue(user);
    jest.mocked(argon2.verify).mockResolvedValue(false);

    await expect(
      auth.login({ email: user.email, password: "incorrect-password" }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(prismaMock.refreshToken.create).not.toHaveBeenCalled();
  });

  it("does not create a login session if the password changed after verification", async () => {
    prismaMock.user.findUnique
      .mockResolvedValueOnce(user)
      .mockResolvedValueOnce({ ...user, passwordHash: "changed-hash" });

    await expect(
      auth.login({ email: user.email, password: "example-password" }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(prismaMock.refreshToken.create).not.toHaveBeenCalled();
  });

  it("changes the password and revokes other and legacy sessions, but not the current session", async () => {
    prismaMock.user.findUnique.mockResolvedValue(user);
    const input = {
      currentPassword: "synthetic-old-password",
      newPassword: "synthetic-new-password",
    };

    await auth.changePassword(user.id, "session-1", input);

    expect(prismaMock.user.update).toHaveBeenCalledWith({
      where: { id: user.id },
      data: { passwordHash: "new-hash" },
    });
    expect(prismaMock.refreshToken.updateMany).toHaveBeenCalledWith({
      where: {
        userId: user.id,
        revokedAt: null,
        OR: [{ sessionId: { not: "session-1" } }, { sessionId: null }],
      },
      data: { revokedAt: expect.any(Date) },
    });
    expect(prismaMock.auditLog.create).toHaveBeenCalledWith({
      data: {
        actorUserId: user.id,
        action: "PASSWORD_CHANGED",
        resource: "user",
        resourceId: user.id,
      },
    });
    expect(JSON.stringify(prismaMock.auditLog.create.mock.calls)).not.toContain(
      input.currentPassword,
    );
    expect(JSON.stringify(prismaMock.auditLog.create.mock.calls)).not.toContain(
      input.newPassword,
    );
  });

  it("rejects an incorrect current password without updating or revoking sessions", async () => {
    prismaMock.user.findUnique.mockResolvedValue(user);
    jest.mocked(argon2.verify).mockResolvedValue(false);
    await expect(
      auth.changePassword(user.id, "session-1", {
        currentPassword: "wrong-synthetic-password",
        newPassword: "synthetic-new-password",
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prismaMock.user.update).not.toHaveBeenCalled();
    expect(prismaMock.refreshToken.updateMany).not.toHaveBeenCalled();
    expect(prismaMock.auditLog.create).toHaveBeenCalledWith({
      data: {
        actorUserId: user.id,
        action: "PASSWORD_CHANGE_FAILED",
        resource: "user",
        resourceId: user.id,
      },
    });
  });

  it("rejects password changes if the current session has been revoked", async () => {
    prismaMock.$queryRaw.mockResolvedValueOnce([]).mockResolvedValueOnce([]);
    prismaMock.user.findUnique.mockResolvedValue(user);
    await expect(
      auth.changePassword(user.id, "session-1", {
        currentPassword: "synthetic-old-password",
        newPassword: "synthetic-new-password",
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(prismaMock.user.update).not.toHaveBeenCalled();
  });

  it("does not infer platform scope for users without an active school membership", async () => {
    prismaMock.user.findUnique.mockResolvedValue(user);
    prismaMock.schoolMembership.findMany.mockResolvedValue([]);

    await expect(
      auth.login({ email: user.email, password: "example-password" }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(prismaMock.refreshToken.create).not.toHaveBeenCalled();
  });

  it("creates a dedicated platform session with no school memberships", async () => {
    prismaMock.user.findUnique.mockResolvedValue(user);
    prismaMock.platformAdminGrant.findFirst.mockResolvedValue({
      id: "grant-1",
    });

    const result = await auth.login({
      email: user.email,
      password: "example-password",
    });

    expect(result.body).toMatchObject({
      scope: "platform",
      memberships: [],
      activeSchool: null,
      workspaceRoles: [],
      activeWorkspaceRole: null,
      permissionKeys: ["platform.schools.read"],
    });
    expect(prismaMock.refreshToken.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ scope: AuthScope.PLATFORM }),
    });
    expect(prismaMock.schoolMembership.findMany).not.toHaveBeenCalled();
  });

  it("rejects platform login when the account has an active school membership", async () => {
    prismaMock.user.findUnique.mockResolvedValue(user);
    prismaMock.platformAdminGrant.findFirst.mockResolvedValue({
      id: "grant-1",
    });
    prismaMock.schoolMembership.count.mockResolvedValue(1);

    await expect(
      auth.login({ email: user.email, password: "example-password" }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(prismaMock.refreshToken.create).not.toHaveBeenCalled();
  });

  it("restores platform sessions without querying or returning school memberships", async () => {
    prismaMock.user.findUnique.mockResolvedValue(user);
    prismaMock.platformAdminGrant.findFirst.mockResolvedValue({
      id: "grant-1",
    });

    const result = await auth.currentSession(user.id, {
      scope: "platform",
      activeSchoolId: null,
      membershipId: null,
      activeWorkspaceRole: null,
      permissionKeys: [],
    });

    expect(result).toMatchObject({
      scope: "platform",
      memberships: [],
      activeSchool: null,
      permissionKeys: ["platform.schools.read"],
    });
    expect(prismaMock.schoolMembership.findMany).not.toHaveBeenCalled();
  });

  it("revokes a platform refresh session after its grant is revoked", async () => {
    prismaMock.refreshToken.findFirst.mockResolvedValue({
      id: "refresh-1",
      userId: user.id,
      sessionId: "platform-session-1",
      scope: AuthScope.PLATFORM,
      revokedAt: null,
      expiresAt: new Date(Date.now() + 60_000),
      activeSchoolId: null,
      membershipId: null,
      activeWorkspaceRole: null,
    });
    prismaMock.user.findUnique.mockResolvedValue(user);
    prismaMock.platformAdminGrant.findFirst.mockResolvedValue(null);

    await expect(auth.refresh("platform-refresh-token")).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(prismaMock.refreshToken.updateMany).toHaveBeenCalledWith({
      where: { sessionId: "platform-session-1", revokedAt: null },
      data: { revokedAt: expect.any(Date) },
    });
  });

  it("does not expose a platform role as a school workspace role", async () => {
    prismaMock.user.findUnique.mockResolvedValue(user);
    prismaMock.schoolMembership.findMany.mockResolvedValue([
      {
        ...membership,
        roles: [
          {
            role: {
              key: "PLATFORM_SUPER_ADMIN",
              permissions: [{ permission: { key: "platform.schools.manage" } }],
            },
          },
        ],
      },
    ]);

    const result = await auth.login({
      email: user.email,
      password: "example-password",
    });

    expect(result.body.scope).toBe("school-selection");
    expect(result.body.memberships[0].workspaceRoles).toEqual([]);
  });

  it("revokes all refresh credentials belonging to the current session on logout", async () => {
    prismaMock.refreshToken.findFirst.mockResolvedValue({
      id: "refresh-1",
      sessionId: "session-1",
    });

    await auth.logout("opaque-refresh-token");

    expect(prismaMock.refreshToken.updateMany).toHaveBeenCalledWith({
      where: { sessionId: "session-1", revokedAt: null },
      data: { revokedAt: expect.any(Date) },
    });
  });

  it("rejects and revokes a reused refresh credential", async () => {
    prismaMock.refreshToken.findFirst.mockResolvedValue({
      id: "refresh-1",
      userId: user.id,
      sessionId: "session-1",
      revokedAt: new Date(),
      expiresAt: new Date(Date.now() + 60_000),
      activeSchoolId: null,
      membershipId: null,
      activeWorkspaceRole: null,
    });

    await expect(auth.refresh("reused-refresh-token")).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(prismaMock.refreshToken.updateMany).toHaveBeenCalledWith({
      where: { sessionId: "session-1", revokedAt: null },
      data: { revokedAt: expect.any(Date) },
    });
  });

  it("rejects and revokes an expired refresh session", async () => {
    prismaMock.refreshToken.findFirst.mockResolvedValue({
      id: "refresh-1",
      userId: user.id,
      sessionId: "session-1",
      scope: AuthScope.SCHOOL,
      revokedAt: null,
      expiresAt: new Date(Date.now() - 60_000),
      activeSchoolId: null,
      membershipId: null,
      activeWorkspaceRole: null,
    });

    await expect(auth.refresh("expired-refresh-token")).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(prismaMock.refreshToken.updateMany).toHaveBeenCalledWith({
      where: { sessionId: "session-1", revokedAt: null },
      data: { revokedAt: expect.any(Date) },
    });
  });

  it("rotates the refresh credential and preserves the membership permission union", async () => {
    prismaMock.refreshToken.findFirst.mockResolvedValue({
      id: "refresh-1",
      userId: user.id,
      sessionId: "session-1",
      scope: AuthScope.SCHOOL,
      revokedAt: null,
      expiresAt: new Date(Date.now() + 60_000),
      activeSchoolId: membership.schoolId,
      membershipId: membership.id,
      activeWorkspaceRole: "school_admin",
      tokenHash: "old-hash",
      replacedById: null,
      createdAt: new Date(),
    });
    prismaMock.user.findUnique.mockResolvedValue(user);
    prismaMock.schoolMembership.findFirst.mockResolvedValue(membership);
    const transaction = {
      $queryRaw: jest.fn().mockResolvedValue([]),
      refreshToken: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        create: jest.fn().mockResolvedValue({ id: "refresh-2" }),
        update: jest.fn().mockResolvedValue({}),
      },
    };
    prismaMock.$transaction.mockImplementation(
      async (callback: (client: typeof transaction) => Promise<unknown>) =>
        callback(transaction),
    );

    const result = await auth.refresh("current-refresh-token");

    expect(transaction.refreshToken.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: "refresh-1",
          revokedAt: null,
          expiresAt: { gt: expect.any(Date) },
        },
      }),
    );
    expect(transaction.refreshToken.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: user.id,
        sessionId: "session-1",
        activeSchoolId: membership.schoolId,
        membershipId: membership.id,
        activeWorkspaceRole: "school_admin",
      }),
    });
    expect(result.body).toMatchObject({
      scope: "school",
      activeWorkspaceRole: "school_admin",
      permissionKeys: ["students.read", "students.create"],
    });
    expect(result.credentials.refreshToken).not.toBe("current-refresh-token");
    expect("refreshToken" in result.body).toBe(false);
  });
});
