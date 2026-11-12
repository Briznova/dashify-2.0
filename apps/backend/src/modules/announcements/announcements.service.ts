import {
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { AnnouncementStatus, Prisma } from "@prisma/client";
import { PrismaService } from "../../infrastructure/database/prisma.service";
import { CreateAnnouncementDto } from "./dto/create-announcement.dto";

@Injectable()
export class AnnouncementsService {
  constructor(private readonly prisma: PrismaService) {}

  async listPublished(schoolId: string) {
    return this.prisma.withTenant(schoolId, (tx) =>
      tx.announcement.findMany({
        where: {
          schoolId,
          status: AnnouncementStatus.PUBLISHED,
          audience: { equals: Prisma.DbNull },
        },
        orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
        select: {
          id: true,
          title: true,
          body: true,
          status: true,
          publishedAt: true,
          createdAt: true,
        },
      }),
    );
  }

  async listForManagement(schoolId: string) {
    return this.prisma.withTenant(schoolId, (tx) =>
      tx.announcement.findMany({
        where: { schoolId, audience: { equals: Prisma.DbNull } },
        orderBy: [{ createdAt: "desc" }],
        select: {
          id: true,
          title: true,
          body: true,
          status: true,
          publishedAt: true,
          createdAt: true,
        },
      }),
    );
  }

  async createDraft(
    schoolId: string,
    actorId: string,
    dto: CreateAnnouncementDto,
  ) {
    return this.prisma.withTenant(schoolId, async (tx) => {
      const announcement = await tx.announcement.create({
        data: {
          schoolId,
          title: dto.title,
          body: dto.body,
          createdBy: actorId,
          status: AnnouncementStatus.DRAFT,
        },
      });
      await tx.auditLog.create({
        data: {
          schoolId,
          actorUserId: actorId,
          action: "ANNOUNCEMENT_DRAFT_CREATED",
          resource: "announcement",
          resourceId: announcement.id,
          summary: { status: AnnouncementStatus.DRAFT },
        },
      });
      return announcement;
    });
  }

  async publish(schoolId: string, actorId: string, id: string) {
    return this.prisma.withTenant(schoolId, async (tx) => {
      const announcement = await tx.announcement.findFirst({
        where: { id, schoolId },
      });
      if (!announcement) {
        throw new NotFoundException("Announcement not found");
      }
      if (
        announcement.status !== AnnouncementStatus.DRAFT ||
        announcement.audience !== null
      ) {
        throw new ConflictException(
          "Only unpublished school-wide announcements can be published",
        );
      }

      const publishedAt = new Date();
      const result = await tx.announcement.updateMany({
        where: {
          id,
          schoolId,
          status: AnnouncementStatus.DRAFT,
          audience: { equals: Prisma.DbNull },
        },
        data: {
          status: AnnouncementStatus.PUBLISHED,
          publishedAt,
        },
      });
      if (result.count !== 1) {
        throw new ConflictException("Announcement is no longer a draft");
      }

      const published = await tx.announcement.findFirstOrThrow({
        where: { id, schoolId, status: AnnouncementStatus.PUBLISHED },
      });
      await tx.auditLog.create({
        data: {
          schoolId,
          actorUserId: actorId,
          action: "ANNOUNCEMENT_PUBLISHED",
          resource: "announcement",
          resourceId: id,
          summary: { status: AnnouncementStatus.PUBLISHED },
        },
      });
      return published;
    });
  }
}
