import { Controller, ForbiddenException, Get, Header, InternalServerErrorException, Req, UseGuards } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { ApiCookieAuth, ApiOkResponse, ApiOperation, ApiTags } from "@nestjs/swagger";
import { RequirePermissions } from "../../common/decorators/permissions.decorator";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { PermissionsGuard } from "../../common/guards/permissions.guard";
import { AuthenticatedRequest } from "../../common/interfaces/authenticated-request";
import { PrismaService } from "../../infrastructure/database/prisma.service";
import { getAuthTokenTtls } from "../auth/auth-token-ttls";

@ApiTags("platform")
@ApiCookieAuth("accessCookie")
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller("platform/settings")
export class PlatformSettingsController {
  constructor(private readonly config: ConfigService, private readonly prisma: PrismaService) {}

  @Get()
  @Header("Cache-Control", "no-store")
  @RequirePermissions("platform.settings.read")
  @ApiOperation({ summary: "Read enforced platform session token lifetimes" })
  @ApiOkResponse({
    schema: {
      type: "object",
      required: ["accessTokenTtlSeconds", "refreshTokenTtlSeconds"],
      properties: {
        accessTokenTtlSeconds: { type: "integer", minimum: 1 },
        refreshTokenTtlSeconds: { type: "integer", minimum: 1 },
      },
    },
  })
  async read(@Req() req: AuthenticatedRequest) {
    if (req.user.scope !== "platform") throw new ForbiddenException();
    const values = getAuthTokenTtls(this.config);
    if (!Object.values(values).every((value) => Number.isSafeInteger(value) && value > 0)) {
      throw new InternalServerErrorException("Platform token lifetime configuration is invalid");
    }
    await this.prisma.auditLog.create({
      data: { actorUserId: req.user.id, action: "PLATFORM_SETTINGS_READ", resource: "platform_settings" },
    });
    return values;
  }
}
