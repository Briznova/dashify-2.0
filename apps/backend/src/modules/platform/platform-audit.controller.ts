import { Controller, ForbiddenException, Get, Header, Query, Req, UseGuards } from "@nestjs/common";
import { ApiCookieAuth, ApiOkResponse, ApiOperation, ApiTags } from "@nestjs/swagger";
import { RequirePermissions } from "../../common/decorators/permissions.decorator";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { PermissionsGuard } from "../../common/guards/permissions.guard";
import { AuthenticatedRequest } from "../../common/interfaces/authenticated-request";
import { ListPlatformAuditDto } from "./dto/list-platform-audit.dto";
import { PlatformAuditService } from "./platform-audit.service";

@ApiTags("platform")
@ApiCookieAuth("accessCookie")
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller("platform/audit-events")
export class PlatformAuditController {
  constructor(private readonly audit: PlatformAuditService) {}

  @Get()
  @Header("Cache-Control", "no-store")
  @RequirePermissions("platform.audit.read")
  @ApiOperation({ summary: "List redacted platform-origin audit events" })
  @ApiOkResponse({
    schema: {
      type: "object",
      required: ["data", "nextCursor"],
      properties: {
        data: {
          type: "array",
          items: {
            type: "object",
            required: ["id", "createdAt", "actorUserId", "action"],
            properties: {
              id: { type: "string", format: "uuid" },
              createdAt: { type: "string", format: "date-time" },
              actorUserId: { type: "string", format: "uuid", nullable: true },
              action: { type: "string" },
            },
          },
        },
        nextCursor: { type: "string", nullable: true },
      },
    },
  })
  list(@Req() req: AuthenticatedRequest, @Query() query: ListPlatformAuditDto) {
    if (req.user.scope !== "platform") throw new ForbiddenException();
    return this.audit.list(req.user.id, query);
  }
}
