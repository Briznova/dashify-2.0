import { ExecutionContext, ForbiddenException, ServiceUnavailableException, ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Reflector } from "@nestjs/core";
import { PermissionsGuard } from "../../common/guards/permissions.guard";
import { CreateSchoolAdminDto } from "./dto/create-school-admin.dto";
import { SchoolAdminController } from "./school-admin.controller";
import { SchoolAdminService } from "./school-admin.service";
import { PrismaService } from "../../infrastructure/database/prisma.service";

describe("school administrator provisioning authorization", () => {
  it("requires both explicit platform permissions and platform scope", () => {
    const guard = new PermissionsGuard(new Reflector());
    const context = (permissions: string[]) => ({
      getHandler: () => SchoolAdminController.prototype.create,
      getClass: () => SchoolAdminController,
      switchToHttp: () => ({ getRequest: () => ({ user: { permissions } }) }),
    }) as unknown as ExecutionContext;
    expect(() => guard.canActivate(context(["platform.schools.read"]))).toThrow(ForbiddenException);
    expect(guard.canActivate(context(["platform.schools.read", "platform.school-admins.create"]))).toBe(true);
    const service = { create: jest.fn() };
    const controller = new SchoolAdminController(service as never);
    expect(() => controller.create({ user: { scope: "school" } } as never, "school", {} as CreateSchoolAdminDto)).toThrow(ForbiddenException);
    expect(service.create).not.toHaveBeenCalled();
  });

  it("normalizes the email and rejects extra fields", async () => {
    const pipe = new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true });
    const transform = (value: unknown) => pipe.transform(value, { type: "body", metatype: CreateSchoolAdminDto });
    const valid = { firstName: "  Synthetic  ", email: "  ADMIN@EXAMPLE.TEST  " };
    await expect(transform(valid)).resolves.toMatchObject({ firstName: "Synthetic", email: "admin@example.test" });
    await expect(transform({ ...valid, password: "not accepted" })).rejects.toMatchObject({ status: 400 });
  });

  it("fails closed when the shared password is missing or too short", async () => {
    const config = { get: jest.fn().mockReturnValue("short") };
    const prisma = { withTenant: jest.fn() };
    const service = new SchoolAdminService(prisma as unknown as PrismaService, config as unknown as ConfigService);
    await expect(service.create("actor", "school", { firstName: "Synthetic", email: "admin@example.test" }))
      .rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(prisma.withTenant).not.toHaveBeenCalled();
  });
});
