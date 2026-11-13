import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { SupportTicketStatus } from "@prisma/client";
import { PrismaService } from "../../infrastructure/database/prisma.service";

const RETENTION_MS = 365 * 24 * 60 * 60 * 1000;
const CLEANUP_INTERVAL_MS = 60 * 60 * 1000;

@Injectable()
export class PlatformSupportRetentionService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PlatformSupportRetentionService.name);
  private timer?: ReturnType<typeof setInterval>;
  private running = false;

  constructor(private readonly prisma: PrismaService) {}

  onModuleInit() {
    void this.runScheduled();
    this.timer = setInterval(() => { void this.runScheduled(); }, CLEANUP_INTERVAL_MS);
    this.timer.unref();
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  async cleanup(now = new Date()) {
    const cutoff = new Date(now.getTime() - RETENTION_MS);
    return this.prisma.$transaction(async (tx) => {
      const deleted = await tx.platformSupportTicket.deleteMany({
        where: { status: SupportTicketStatus.RESOLVED, resolvedAt: { lte: cutoff } },
      });
      if (deleted.count) {
        await tx.auditLog.create({
          data: {
            action: "PLATFORM_SUPPORT_RETENTION_CLEANUP",
            resource: "platform_support_ticket",
            summary: { deletedCount: deleted.count },
          },
        });
      }
      return deleted.count;
    });
  }

  private async runScheduled() {
    if (this.running) return;
    this.running = true;
    try {
      const count = await this.cleanup();
      this.logger.log(`Support retention cleanup completed; deleted ${count} ticket(s).`);
    } catch (error) {
      this.logger.error("Support retention cleanup failed", error instanceof Error ? error.stack : String(error));
    } finally {
      this.running = false;
    }
  }
}
