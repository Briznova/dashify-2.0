import { ExecutionContext, ForbiddenException, ValidationPipe } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { PermissionsGuard } from "../../common/guards/permissions.guard";
import { ListPlatformAuditDto } from "./dto/list-platform-audit.dto";
import { PlatformAuditController } from "./platform-audit.controller";

describe("platform audit access and validation", () => {
  const pipe = new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true });
  const validate = (value: unknown) => pipe.transform(value, { type: "query", metatype: ListPlatformAuditDto });
  const guard = new PermissionsGuard(new Reflector());
  function context(permissions: string[]) {
    return {
      getHandler: () => PlatformAuditController.prototype.list,
      getClass: () => PlatformAuditController,
      switchToHttp: () => ({ getRequest: () => ({ user: { permissions } }) }),
    } as unknown as ExecutionContext;
  }

  it("requires the separate audit permission and a platform scope", () => {
    expect(() => guard.canActivate(context(["platform.schools.read"]))).toThrow(ForbiddenException);
    expect(guard.canActivate(context(["platform.audit.read"]))).toBe(true);
    const service = { list: jest.fn() };
    const controller = new PlatformAuditController(service as never);
    expect(() => controller.list({ user: { id: "u", scope: "school" } } as never, new ListPlatformAuditDto())).toThrow(ForbiddenException);
    expect(service.list).not.toHaveBeenCalled();
  });

  it.each([
    [{ pageSize: "0" }], [{ pageSize: "101" }], [{ pageSize: "not-a-number" }],
    [{ action: "STUDENT_CREATED" }], [{ from: "2026-01-01" }], [{ unexpected: "x" }],
  ])("rejects invalid query %j", async (query) => {
    await expect(validate(query)).rejects.toMatchObject({ status: 400 });
  });
});
