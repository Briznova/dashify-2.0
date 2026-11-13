import { ExecutionContext, ForbiddenException, ValidationPipe } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { PermissionsGuard } from "../../common/guards/permissions.guard";
import { CreateSupportTicketDto, SupportTicketActionDto } from "./dto/platform-support.dto";
import { PlatformSupportController } from "./platform-support.controller";

describe("platform support guards and input", () => {
  const pipe = new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true });
  const guard = new PermissionsGuard(new Reflector());
  function context(handler: keyof PlatformSupportController, permissions: string[]) {
    return {
      getHandler: () => PlatformSupportController.prototype[handler],
      getClass: () => PlatformSupportController,
      switchToHttp: () => ({ getRequest: () => ({ user: { permissions } }) }),
    } as unknown as ExecutionContext;
  }
  it("requires read for listing and both explicit permissions for writes", () => {
    expect(() => guard.canActivate(context("list", []))).toThrow(ForbiddenException);
    expect(guard.canActivate(context("list", ["platform.support.read"]))).toBe(true);
    expect(() => guard.canActivate(context("summary", []))).toThrow(ForbiddenException);
    expect(guard.canActivate(context("summary", ["platform.support.read"]))).toBe(true);
    expect(() => guard.canActivate(context("create", ["platform.support.update"]))).toThrow(ForbiddenException);
    expect(() => guard.canActivate(context("act", ["platform.support.read"]))).toThrow(ForbiddenException);
    expect(guard.canActivate(context("act", ["platform.support.read", "platform.support.update"]))).toBe(true);
  });
  it("denies school-scoped sessions even if they claim support permissions", () => {
    const service = { list: jest.fn(), summary: jest.fn(), create: jest.fn() };
    const controller = new PlatformSupportController(service as never);
    const request = { user: { scope: "school", id: "u" } } as never;
    expect(() => controller.list(request, { pageSize: 25 })).toThrow(ForbiddenException);
    expect(() => controller.summary(request)).toThrow(ForbiddenException);
    expect(() => controller.create(request, {} as CreateSupportTicketDto)).toThrow(ForbiddenException);
    expect(service.list).not.toHaveBeenCalled();
    expect(service.summary).not.toHaveBeenCalled();
    expect(service.create).not.toHaveBeenCalled();
  });
  it("trims text and rejects invalid or extra ticket inputs", async () => {
    const transform = (value: unknown) => pipe.transform(value, { type: "body", metatype: CreateSupportTicketDto });
    const valid = { schoolId: "00000000-0000-4000-8000-000000000001", title: "  Issue  ", description: "  Details  " };
    await expect(transform(valid)).resolves.toMatchObject({ title: "Issue", description: "Details" });
    await expect(transform({ ...valid, title: " " })).rejects.toMatchObject({ status: 400 });
    await expect(transform({ ...valid, extra: true })).rejects.toMatchObject({ status: 400 });
    await expect(pipe.transform({ action: "CLAIM", version: 0 }, { type: "body", metatype: SupportTicketActionDto })).rejects.toMatchObject({ status: 400 });
  });
});
