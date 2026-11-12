import {
  BadRequestException,
  ExecutionContext,
  ForbiddenException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { PERMISSIONS_KEY } from "../../common/decorators/permissions.decorator";
import { PermissionsGuard } from "../../common/guards/permissions.guard";
import { AuthenticatedRequest } from "../../common/interfaces/authenticated-request";
import { ReportsController } from "./reports.controller";
import { ReportsService } from "./reports.service";

describe("ReportsController", () => {
  it("requires reports.read and denies requests without it", () => {
    const handler = ReportsController.prototype.getAttendanceReport;
    expect(Reflect.getMetadata(PERMISSIONS_KEY, handler)).toEqual([
      "reports.read",
    ]);

    const guard = new PermissionsGuard(new Reflector());
    const context = (permissions: string[]) =>
      ({
        getHandler: () => handler,
        getClass: () => ReportsController,
        switchToHttp: () => ({
          getRequest: () => ({ user: { permissions } }),
        }),
      }) as unknown as ExecutionContext;

    expect(() => guard.canActivate(context([]))).toThrow(ForbiddenException);
    expect(() => guard.canActivate(context(["reports.read"]))).not.toThrow();
  });

  it("derives school scope from authenticated context and rejects no context", async () => {
    const getAttendanceReport = jest
      .fn()
      .mockResolvedValue({ totalSessions: 2 });
    const controller = new ReportsController({
      getAttendanceReport,
    } as unknown as ReportsService);
    const query = { fromDate: "2026-04-01", toDate: "2026-04-30" };
    const request = (activeSchoolId?: string) =>
      ({ user: { activeSchoolId } }) as AuthenticatedRequest;

    await expect(
      controller.getAttendanceReport(request("school-1"), query),
    ).resolves.toEqual({ totalSessions: 2 });
    expect(getAttendanceReport).toHaveBeenCalledWith("school-1", query);
    expect(() => controller.getAttendanceReport(request(), query)).toThrow(
      BadRequestException,
    );
  });
});
