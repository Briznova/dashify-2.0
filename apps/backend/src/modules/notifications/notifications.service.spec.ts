import { NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../infrastructure/database/prisma.service";
import { NotificationsService } from "./notifications.service";

describe("NotificationsService", () => {
  const schoolId = "school-1";
  const userId = "teacher-1";
  const notificationId = "notification-1";
  let service: NotificationsService;
  let withTenant: jest.Mock;
  let tx: {
    notification: {
      findMany: jest.Mock;
      count: jest.Mock;
      updateMany: jest.Mock;
      findFirst: jest.Mock;
    };
  };

  beforeEach(() => {
    tx = {
      notification: {
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        findFirst: jest.fn(),
      },
    };
    withTenant = jest.fn(
      (_schoolId: string, work: (transaction: typeof tx) => Promise<unknown>) =>
        work(tx),
    );
    service = new NotificationsService({
      withTenant,
    } as unknown as PrismaService);
  });

  it("lists only the active user's school notifications and counts all unread items", async () => {
    const notifications = [{ id: notificationId, readAt: null }];
    tx.notification.findMany.mockResolvedValue(notifications);
    tx.notification.count.mockResolvedValue(52);

    await expect(service.list(schoolId, userId)).resolves.toEqual({
      notifications,
      unreadCount: 52,
    });
    expect(withTenant).toHaveBeenCalledWith(schoolId, expect.any(Function));
    expect(tx.notification.findMany).toHaveBeenCalledWith({
      where: { schoolId, userId },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: 50,
      select: {
        id: true,
        type: true,
        title: true,
        body: true,
        readAt: true,
        createdAt: true,
      },
    });
    expect(tx.notification.count).toHaveBeenCalledWith({
      where: { schoolId, userId, readAt: null },
    });
  });

  it("does not expose another user's notification when marking it read", async () => {
    tx.notification.updateMany.mockResolvedValue({ count: 0 });
    tx.notification.findFirst.mockResolvedValue(null);

    await expect(
      service.markRead(schoolId, userId, notificationId),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(tx.notification.updateMany).toHaveBeenCalledWith({
      where: {
        id: notificationId,
        schoolId,
        userId,
        readAt: null,
      },
      data: { readAt: expect.any(Date) },
    });
    expect(tx.notification.findFirst).toHaveBeenCalledWith({
      where: { id: notificationId, schoolId, userId },
      select: { id: true },
    });
  });

  it("returns the number of the user's unread notifications marked read", async () => {
    tx.notification.updateMany.mockResolvedValue({ count: 3 });

    await expect(service.markAllRead(schoolId, userId)).resolves.toEqual({
      success: true,
      updatedCount: 3,
    });
    expect(tx.notification.updateMany).toHaveBeenCalledWith({
      where: { schoolId, userId, readAt: null },
      data: { readAt: expect.any(Date) },
    });
  });
});
