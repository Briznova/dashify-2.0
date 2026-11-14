import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../infrastructure/database/prisma.service";

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(schoolId: string, userId: string) {
    return this.prisma.withTenant(schoolId, async (tx) => {
      const [notifications, unreadCount] = await Promise.all([
        tx.notification.findMany({
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
        }),
        tx.notification.count({ where: { schoolId, userId, readAt: null } }),
      ]);
      return { notifications, unreadCount };
    });
  }

  async markRead(schoolId: string, userId: string, notificationId: string) {
    return this.prisma.withTenant(schoolId, async (tx) => {
      const updated = await tx.notification.updateMany({
        where: {
          id: notificationId,
          schoolId,
          userId,
          readAt: null,
        },
        data: { readAt: new Date() },
      });
      if (updated.count) return { success: true };

      const existing = await tx.notification.findFirst({
        where: { id: notificationId, schoolId, userId },
        select: { id: true },
      });
      if (!existing) throw new NotFoundException("Notification not found");
      return { success: true };
    });
  }

  async markAllRead(schoolId: string, userId: string) {
    return this.prisma.withTenant(schoolId, async (tx) => {
      const result = await tx.notification.updateMany({
        where: { schoolId, userId, readAt: null },
        data: { readAt: new Date() },
      });
      return { success: true, updatedCount: result.count };
    });
  }
}
