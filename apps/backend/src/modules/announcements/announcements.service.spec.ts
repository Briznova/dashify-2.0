import { ConflictException, NotFoundException } from "@nestjs/common";
import { AnnouncementStatus, Prisma } from "@prisma/client";
import { PrismaService } from "../../infrastructure/database/prisma.service";
import { AnnouncementsService } from "./announcements.service";

describe("AnnouncementsService", () => {
  const schoolId = "school-1";
  const actorId = "admin-1";
  const announcementId = "announcement-1";
  let service: AnnouncementsService;
  let withTenant: jest.Mock;
  let tx: {
    schoolMembership: { findMany: jest.Mock };
    notification: { createMany: jest.Mock };
    announcement: {
      findMany: jest.Mock;
      findFirst: jest.Mock;
      findFirstOrThrow: jest.Mock;
      create: jest.Mock;
      updateMany: jest.Mock;
    };
    auditLog: { create: jest.Mock };
  };

  beforeEach(() => {
    tx = {
      schoolMembership: {
        findMany: jest.fn().mockResolvedValue([{ userId: "teacher-1" }]),
      },
      notification: { createMany: jest.fn().mockResolvedValue({ count: 1 }) },
      announcement: {
        findMany: jest.fn().mockResolvedValue([]),
        findFirst: jest.fn(),
        findFirstOrThrow: jest.fn(),
        create: jest.fn(),
        updateMany: jest.fn(),
      },
      auditLog: { create: jest.fn().mockResolvedValue({}) },
    };
    withTenant = jest.fn(
      (_id: string, work: (transaction: typeof tx) => Promise<unknown>) =>
        work(tx),
    );
    service = new AnnouncementsService({
      withTenant,
    } as unknown as PrismaService);
  });

  it("lists only published school-wide announcements within the active school", async () => {
    await service.listPublished(schoolId);

    expect(withTenant).toHaveBeenCalledWith(schoolId, expect.any(Function));
    expect(tx.announcement.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          schoolId,
          status: AnnouncementStatus.PUBLISHED,
          audience: { equals: Prisma.DbNull },
        }),
        select: expect.objectContaining({ body: true }),
      }),
    );
  });

  it("creates an audited draft without including announcement content in audit data", async () => {
    tx.announcement.create.mockResolvedValue({
      id: announcementId,
      title: "Term notice",
      body: "School-wide message",
      status: AnnouncementStatus.DRAFT,
    });

    await service.createDraft(schoolId, actorId, {
      title: "Term notice",
      body: "School-wide message",
    });

    expect(tx.announcement.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        schoolId,
        createdBy: actorId,
        status: AnnouncementStatus.DRAFT,
      }),
    });
    expect(tx.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        schoolId,
        actorUserId: actorId,
        resourceId: announcementId,
        summary: { status: AnnouncementStatus.DRAFT },
      }),
    });
    expect(JSON.stringify(tx.auditLog.create.mock.calls[0][0])).not.toContain(
      "School-wide message",
    );
  });

  it("publishes only a draft in the same school", async () => {
    tx.announcement.findFirst.mockResolvedValue({
      id: announcementId,
      schoolId,
      status: AnnouncementStatus.DRAFT,
      audience: null,
    });
    tx.announcement.updateMany.mockResolvedValue({ count: 1 });
    tx.announcement.findFirstOrThrow.mockResolvedValue({
      id: announcementId,
      schoolId,
      status: AnnouncementStatus.PUBLISHED,
      title: "Term notice",
    });

    await service.publish(schoolId, actorId, announcementId);

    expect(tx.announcement.findFirst).toHaveBeenCalledWith({
      where: { id: announcementId, schoolId },
    });
    expect(tx.announcement.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: announcementId,
          schoolId,
          status: AnnouncementStatus.DRAFT,
        }),
        data: expect.objectContaining({
          status: AnnouncementStatus.PUBLISHED,
        }),
      }),
    );
    expect(tx.schoolMembership.findMany).toHaveBeenCalledWith({
      where: {
        schoolId,
        status: "ACTIVE",
        roles: { some: { role: { is: { key: "TEACHER" } } } },
        user: { is: { isActive: true } },
      },
      select: { userId: true },
    });
    expect(tx.auditLog.create).toHaveBeenCalled();
    expect(tx.notification.createMany).toHaveBeenCalledWith({
      data: [
        {
          userId: "teacher-1",
          schoolId,
          type: "ANNOUNCEMENT",
          title: "Term notice",
          body: "A new school announcement has been published.",
        },
      ],
    });
  });

  it("rejects publishing a missing or audience-targeted announcement", async () => {
    tx.announcement.findFirst.mockResolvedValue(null);
    await expect(
      service.publish(schoolId, actorId, announcementId),
    ).rejects.toBeInstanceOf(NotFoundException);

    tx.announcement.findFirst.mockResolvedValue({
      id: announcementId,
      schoolId,
      status: AnnouncementStatus.DRAFT,
      audience: { classIds: ["class-1"] },
    });
    await expect(
      service.publish(schoolId, actorId, announcementId),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(tx.announcement.updateMany).not.toHaveBeenCalled();
  });
});
