import { ExecutionContext, ForbiddenException, InternalServerErrorException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Reflector } from "@nestjs/core";
import { PermissionsGuard } from "../../common/guards/permissions.guard";
import { PrismaService } from "../../infrastructure/database/prisma.service";
import { PlatformSettingsController } from "./platform-settings.controller";

describe("platform settings", () => {
  const request = { user: { id: "operator", scope: "platform" } } as never;
  const prisma = { auditLog: { create: jest.fn().mockResolvedValue({}) } };
  const config = (values: Record<string, number>) => ({
    get: (key: string, fallback: number) => values[key] ?? fallback,
  }) as ConfigService;
  beforeEach(() => jest.clearAllMocks());

  it("requires the settings permission and platform scope", async () => {
    const guard = new PermissionsGuard(new Reflector());
    const context = (permissions: string[]) => ({
      getHandler: () => PlatformSettingsController.prototype.read,
      getClass: () => PlatformSettingsController,
      switchToHttp: () => ({ getRequest: () => ({ user: { permissions } }) }),
    }) as unknown as ExecutionContext;
    expect(() => guard.canActivate(context(["platform.schools.read"]))).toThrow(ForbiddenException);
    expect(guard.canActivate(context(["platform.settings.read"]))).toBe(true);
    const controller = new PlatformSettingsController(new ConfigService(), prisma as unknown as PrismaService);
    await expect(controller.read({ user: { id: "u", scope: "school" } } as never)).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.auditLog.create).not.toHaveBeenCalled();
  });

  it("returns enforced configured token lifetimes and audits access", async () => {
    const controller = new PlatformSettingsController(
      config({ ACCESS_TOKEN_TTL_SECONDS: 1200, REFRESH_TOKEN_TTL_SECONDS: 7200 }),
      prisma as unknown as PrismaService,
    );
    await expect(controller.read(request)).resolves.toEqual({ accessTokenTtlSeconds: 1200, refreshTokenTtlSeconds: 7200 });
    expect(prisma.auditLog.create).toHaveBeenCalledWith({
      data: { actorUserId: "operator", action: "PLATFORM_SETTINGS_READ", resource: "platform_settings" },
    });
  });

  it("does not display invalid configuration or return data when auditing fails", async () => {
    const invalid = new PlatformSettingsController(config({ ACCESS_TOKEN_TTL_SECONDS: -1 }), prisma as unknown as PrismaService);
    await expect(invalid.read(request)).rejects.toBeInstanceOf(InternalServerErrorException);
    expect(prisma.auditLog.create).not.toHaveBeenCalled();
    prisma.auditLog.create.mockRejectedValueOnce(new Error("audit unavailable"));
    const controller = new PlatformSettingsController(new ConfigService(), prisma as unknown as PrismaService);
    await expect(controller.read(request)).rejects.toThrow("audit unavailable");
  });
});
