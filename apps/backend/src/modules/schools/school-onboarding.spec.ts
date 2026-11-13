import { ConflictException, ExecutionContext, ForbiddenException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { PermissionsGuard } from "../../common/guards/permissions.guard";
import { PrismaService } from "../../infrastructure/database/prisma.service";
import { SchoolsController } from "./schools.controller";
import { SchoolsService } from "./schools.service";

function setup() {
  const tx = {
    school: { findFirst: jest.fn().mockResolvedValue({ id: "school-a" }) },
    schoolOnboardingState: {
      findUnique: jest.fn().mockResolvedValue({ status: "NOT_STARTED" }),
      upsert: jest.fn().mockResolvedValue({}),
    },
    academicYear: { count: jest.fn().mockResolvedValue(1) },
    schoolClass: { findFirst: jest.fn().mockResolvedValue({ id: "class-a" }) },
    auditLog: { create: jest.fn().mockResolvedValue({}) },
    $queryRaw: jest.fn().mockResolvedValue([{ id: "row" }]),
  };
  const prisma = { withTenant: jest.fn(async (_id: string, fn: (value: typeof tx) => unknown) => fn(tx)) };
  return { tx, prisma, service: new SchoolsService(prisma as unknown as PrismaService) };
}

describe("school onboarding", () => {
  it("uses the active school for prerequisite reads", async () => {
    const { tx, service } = setup();
    await expect(service.getOnboarding("school-a")).resolves.toEqual({
      status: "NOT_STARTED", prerequisites: { academicYear: true, classWithSection: true },
    });
    expect(tx.academicYear.count).toHaveBeenCalledWith({ where: { schoolId: "school-a" } });
    expect(tx.schoolClass.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: { schoolId: "school-a", isActive: true, sections: { some: { schoolId: "school-a", isActive: true } } },
    }));
  });

  it("records and audits confirmation only after both prerequisites are locked", async () => {
    const { tx, service } = setup();
    await expect(service.completeOnboarding("school-a", "actor")).resolves.toMatchObject({ status: "COMPLETED" });
    expect(tx.$queryRaw).toHaveBeenCalledTimes(3);
    expect(tx.schoolOnboardingState.upsert).toHaveBeenCalledWith(expect.objectContaining({ where: { schoolId: "school-a" } }));
    expect(tx.auditLog.create).toHaveBeenCalledWith({
      data: { schoolId: "school-a", actorUserId: "actor", action: "SCHOOL_ONBOARDING_CONFIRMED", resource: "school", resourceId: "school-a" },
    });
  });

  it("rejects missing prerequisites and does not write", async () => {
    const { tx, service } = setup();
    tx.$queryRaw.mockResolvedValueOnce([{ id: "school-a" }]).mockResolvedValueOnce([]).mockResolvedValueOnce([{ id: "class-a" }]);
    await expect(service.completeOnboarding("school-a", "actor")).rejects.toBeInstanceOf(ConflictException);
    expect(tx.schoolOnboardingState.upsert).not.toHaveBeenCalled();
    expect(tx.auditLog.create).not.toHaveBeenCalled();
  });

  it("returns an existing confirmation without a second write or audit", async () => {
    const { tx, service } = setup();
    tx.schoolOnboardingState.findUnique.mockResolvedValue({ status: "COMPLETED" });
    await expect(service.completeOnboarding("school-a", "actor")).resolves.toMatchObject({ status: "COMPLETED" });
    expect(tx.schoolOnboardingState.upsert).not.toHaveBeenCalled();
    expect(tx.auditLog.create).not.toHaveBeenCalled();
  });

  it("requires the school admin workspace and the server-side update permission", () => {
    const controller = new SchoolsController({} as SchoolsService);
    const guard = new PermissionsGuard(new Reflector());
    const context = (permissions: string[]) => ({
      getHandler: () => SchoolsController.prototype.completeOnboarding,
      getClass: () => SchoolsController,
      switchToHttp: () => ({ getRequest: () => ({ user: { permissions } }) }),
    }) as unknown as ExecutionContext;
    expect(() => guard.canActivate(context([]))).toThrow(ForbiddenException);
    expect(guard.canActivate(context(["school.update"]))).toBe(true);
    expect(() => controller.completeOnboarding({ user: { scope: "platform", activeWorkspaceRole: "school_admin" } } as never)).toThrow(ForbiddenException);
    expect(() => controller.completeOnboarding({ user: { scope: "school", activeSchoolId: "school-a", activeWorkspaceRole: "principal" } } as never)).toThrow(ForbiddenException);
  });
});
