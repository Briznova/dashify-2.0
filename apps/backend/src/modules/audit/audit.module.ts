import { Controller, Get, Query, Req, UseGuards, Module } from "@nestjs/common";
import { ApiCookieAuth, ApiTags } from "@nestjs/swagger";
import { AuthModule } from "../auth/auth.module";
import { PrismaService } from "../../infrastructure/database/prisma.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { PermissionsGuard } from "../../common/guards/permissions.guard";
import { RequirePermissions } from "../../common/decorators/permissions.decorator";
import { AuthenticatedRequest } from "../../common/interfaces/authenticated-request";

@ApiTags("audit-logs")
@ApiCookieAuth("accessCookie")
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller("audit-logs")
class AuditController {
  constructor(private readonly prisma: PrismaService) {}
  @Get()
  @RequirePermissions("audit_logs.read")
  async list(
    @Req() req: AuthenticatedRequest,
    @Query("page") page = "1",
    @Query("pageSize") pageSize = "20",
  ) {
    const schoolId = req.user.activeSchoolId;
    if (!schoolId) return [];
    const p = Math.max(1, Number(page));
    const size = Math.min(100, Math.max(1, Number(pageSize)));
    return this.prisma.withTenant(schoolId, async (tx) => {
      const [data, total] = await Promise.all([
        tx.auditLog.findMany({
          where: { schoolId },
          orderBy: { createdAt: "desc" },
          skip: (p - 1) * size,
          take: size,
        }),
        tx.auditLog.count({ where: { schoolId } }),
      ]);
      return {
        data,
        meta: {
          page: p,
          pageSize: size,
          total,
          totalPages: Math.ceil(total / size),
        },
      };
    });
  }
}
@Module({
  imports: [AuthModule],
  controllers: [AuditController],
  providers: [PermissionsGuard],
})
export class AuditModule {}
