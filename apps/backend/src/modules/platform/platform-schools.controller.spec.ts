import {
  ExecutionContext,
  ForbiddenException,
  ValidationPipe,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { PermissionsGuard } from "../../common/guards/permissions.guard";
import { PlatformSchoolsController } from "./platform-schools.controller";
import { CreatePlatformSchoolDto } from "./dto/create-platform-school.dto";

const pipe = new ValidationPipe({
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
});
const validate = (value: unknown) =>
  pipe.transform(value, { type: "body", metatype: CreatePlatformSchoolDto });

describe("POST /platform/schools guards and validation", () => {
  it("normalizes name and code", async () => {
    await expect(validate({ name: "  Example School ", code: " ex-01 " })).resolves.toMatchObject({
      name: "Example School",
      code: "EX-01",
    });
  });

  it.each([
    [{ name: "A", code: "EX-01" }],
    [{ name: "Example", code: "-EX" }],
    [{ name: "Example", code: "E" }],
    [{ name: "Example", code: "EX 01" }],
    [{ name: "Example" }],
    [{ name: "Example", code: "EX-01", isActive: false }],
  ])("rejects invalid payload %j", async (body) => {
    await expect(validate(body)).rejects.toMatchObject({ status: 400 });
  });

  function contextFor(user: { scope: string; permissions: string[] }) {
    return {
      getHandler: () => PlatformSchoolsController.prototype.create,
      getClass: () => PlatformSchoolsController,
      switchToHttp: () => ({ getRequest: () => ({ user }) }),
    } as unknown as ExecutionContext;
  }
  const guard = new PermissionsGuard(new Reflector());

  it("denies a platform admin without the explicit create permission", () => {
    expect(() =>
      guard.canActivate(
        contextFor({ scope: "platform", permissions: ["platform.schools.read"] }),
      ),
    ).toThrow(ForbiddenException);
  });

  it("allows the explicit permission and denies school-scoped callers in the controller", () => {
    expect(
      guard.canActivate(
        contextFor({ scope: "platform", permissions: ["platform.schools.create"] }),
      ),
    ).toBe(true);
    const service = { create: jest.fn() };
    const controller = new PlatformSchoolsController(service as never);
    const dto = { name: "Example", code: "EX-01" };
    expect(() =>
      controller.create(
        { user: { id: "u", scope: "school", permissions: ["platform.schools.create"] } } as never,
        dto,
      ),
    ).toThrow(ForbiddenException);
    expect(service.create).not.toHaveBeenCalled();
  });

  it("requires platform scope for directory and selected-school reads", () => {
    const service = { list: jest.fn(), detail: jest.fn() };
    const controller = new PlatformSchoolsController(service as never);
    const request = { user: { id: "u", scope: "school", permissions: ["platform.schools.read"] } } as never;
    expect(() => controller.list(request)).toThrow(ForbiddenException);
    expect(() => controller.detail(request, "school-1")).toThrow(ForbiddenException);
    expect(service.list).not.toHaveBeenCalled();
    expect(service.detail).not.toHaveBeenCalled();
  });
});
