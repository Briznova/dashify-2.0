import { ConflictException, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../infrastructure/database/prisma.service";
import { PlatformSchoolsService } from "./platform-schools.service";

describe("PlatformSchoolsService", () => {
  it("returns and audits only the approved school directory metadata", async () => {
    const schools = [
      {
        id: "school-1",
        name: "Example School",
        code: "EXAMPLE",
        isActive: true,
        createdAt: new Date("2026-04-03T08:00:00.000Z"),
      },
    ];
    const transaction = {
      school: { findMany: jest.fn().mockResolvedValue(schools) },
      auditLog: { create: jest.fn().mockResolvedValue({ id: "audit-1" }) },
    };
    const prisma = {
      $transaction: jest.fn(
        async (callback: (tx: typeof transaction) => Promise<unknown>) =>
          callback(transaction),
      ),
    };
    const service = new PlatformSchoolsService(
      prisma as unknown as PrismaService,
    );

    await expect(service.list("platform-user-1")).resolves.toEqual(schools);
    expect(transaction.school.findMany).toHaveBeenCalledWith({
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        code: true,
        isActive: true,
        createdAt: true,
      },
    });
    expect(transaction.auditLog.create).toHaveBeenCalledWith({
      data: {
        actorUserId: "platform-user-1",
        action: "PLATFORM_SCHOOL_DIRECTORY_READ",
        resource: "school_directory",
        summary: { resultCount: 1 },
      },
    });
  });

  it.each([["NOT_STARTED"], [null]])("returns and audits the stored onboarding state %s", async (status) => {
    const transaction = {
      school: {
        findUnique: jest.fn().mockResolvedValue({
          id: "school-1", name: "Example", code: "EXAMPLE", isActive: true,
          createdAt: new Date("2026-01-01T00:00:00Z"),
          onboardingState: status ? { status } : null,
        }),
      },
      auditLog: { create: jest.fn().mockResolvedValue({}) },
    };
    const prisma = { withTenant: jest.fn(async (_id: string, callback: (tx: typeof transaction) => unknown) => callback(transaction)) };
    const service = new PlatformSchoolsService(prisma as unknown as PrismaService);
    await expect(service.detail("actor", "school-1")).resolves.toMatchObject({ id: "school-1", onboardingState: status });
    expect(prisma.withTenant).toHaveBeenCalledWith("school-1", expect.any(Function));
    expect(transaction.school.findUnique).toHaveBeenCalledWith({
      where: { id: "school-1" },
      select: {
        id: true, name: true, code: true, isActive: true, createdAt: true,
        onboardingState: { select: { status: true } },
      },
    });
    expect(transaction.auditLog.create).toHaveBeenCalledWith({
      data: { actorUserId: "actor", action: "PLATFORM_SCHOOL_DETAIL_READ", resource: "school", resourceId: "school-1" },
    });
  });

  it("returns not found without substituting a school", async () => {
    const transaction = { school: { findUnique: jest.fn().mockResolvedValue(null) }, auditLog: { create: jest.fn() } };
    const prisma = { withTenant: jest.fn(async (_id: string, callback: (tx: typeof transaction) => unknown) => callback(transaction)) };
    const service = new PlatformSchoolsService(prisma as unknown as PrismaService);
    await expect(service.detail("actor", "missing")).rejects.toBeInstanceOf(NotFoundException);
    expect(transaction.auditLog.create).not.toHaveBeenCalled();
  });

  describe("create", () => {
    const created = {
      id: "school-2",
      name: "New School",
      code: "NEW-01",
      isActive: true,
      createdAt: new Date("2026-04-03T08:00:00.000Z"),
    };
    function setup(duplicate: unknown = null, createError?: Error) {
      const tx = {
        school: {
          findFirst: jest.fn().mockResolvedValue(duplicate),
          create: createError
            ? jest.fn().mockRejectedValue(createError)
            : jest.fn().mockResolvedValue(created),
        },
        schoolOnboardingState: { create: jest.fn().mockResolvedValue({}) },
        auditLog: { create: jest.fn().mockResolvedValue({}) },
      };
      const prisma = {
        $transaction: jest.fn(async (cb: (t: typeof tx) => Promise<unknown>) => cb(tx)),
      };
      return {
        tx,
        service: new PlatformSchoolsService(prisma as unknown as PrismaService),
      };
    }

    it("creates the school, NOT_STARTED state and audit together", async () => {
      const { tx, service } = setup();
      await expect(
        service.create("platform-user-1", { name: "New School", code: "NEW-01" }),
      ).resolves.toEqual({ ...created, onboardingState: "NOT_STARTED" });
      expect(tx.school.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: { name: "New School", code: "NEW-01" } }),
      );
      expect(tx.schoolOnboardingState.create).toHaveBeenCalledWith({
        data: { schoolId: "school-2", status: "NOT_STARTED" },
      });
      expect(tx.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          actorUserId: "platform-user-1",
          action: "PLATFORM_SCHOOL_CREATED",
          resourceId: "school-2",
        }),
      });
    });

    it("rejects a duplicate code without writing", async () => {
      const { tx, service } = setup({ id: "school-1" });
      await expect(
        service.create("u", { name: "New School", code: "NEW-01" }),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(tx.school.create).not.toHaveBeenCalled();
      expect(tx.auditLog.create).not.toHaveBeenCalled();
    });

    it("maps a concurrent unique violation to a conflict", async () => {
      const error = new Prisma.PrismaClientKnownRequestError("dup", {
        code: "P2002",
        clientVersion: "test",
        meta: { target: ["code"] },
      });
      const { service } = setup(null, error);
      await expect(
        service.create("u", { name: "New School", code: "NEW-01" }),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it("does not hide an unrelated unique constraint failure", async () => {
      const error = new Prisma.PrismaClientKnownRequestError("other conflict", {
        code: "P2002",
        clientVersion: "test",
        meta: { target: ["id"] },
      });
      const { service } = setup(null, error);
      await expect(
        service.create("u", { name: "New School", code: "NEW-01" }),
      ).rejects.toBe(error);
    });
  });});
