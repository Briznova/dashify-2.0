import {
  BadRequestException,
  ExecutionContext,
  ForbiddenException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { PERMISSIONS_KEY } from "../../common/decorators/permissions.decorator";
import { PermissionsGuard } from "../../common/guards/permissions.guard";
import { AuthenticatedRequest } from "../../common/interfaces/authenticated-request";
import { DashboardController } from "./dashboard.controller";
import { DashboardService } from "./dashboard.service";

describe("DashboardController", () => {
  it("requires dashboard.read and denies requests without it", () => {
    const handler = DashboardController.prototype.getSchoolAdminDashboard;
    expect(Reflect.getMetadata(PERMISSIONS_KEY, handler)).toEqual([
      "dashboard.read",
    ]);

    const guard = new PermissionsGuard(new Reflector());
    const context = (permissions: string[]) =>
      ({
        getHandler: () => handler,
        getClass: () => DashboardController,
        switchToHttp: () => ({
          getRequest: () => ({ user: { permissions } }),
        }),
      }) as unknown as ExecutionContext;

    expect(() => guard.canActivate(context([]))).toThrow(ForbiddenException);
    expect(() => guard.canActivate(context(["dashboard.read"]))).not.toThrow();
  });

  it("uses only the authenticated active school and rejects a missing context", async () => {
    const getSchoolAdminDashboard = jest
      .fn()
      .mockResolvedValue({ schoolId: "school-1" });
    const controller = new DashboardController({
      getSchoolAdminDashboard,
    } as unknown as DashboardService);
    const request = (activeSchoolId?: string) =>
      ({ user: { activeSchoolId } }) as AuthenticatedRequest;

    await expect(
      controller.getSchoolAdminDashboard(request("school-1")),
    ).resolves.toEqual({ schoolId: "school-1" });
    expect(getSchoolAdminDashboard).toHaveBeenCalledWith("school-1");

    expect(() => controller.getSchoolAdminDashboard(request())).toThrow(
      BadRequestException,
    );
  });
});
