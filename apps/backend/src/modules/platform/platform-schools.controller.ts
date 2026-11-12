import { Controller, Get, Header, Req, UseGuards } from "@nestjs/common";
import {
  ApiCookieAuth,
  ApiOperation,
  ApiTags,
} from "@nestjs/swagger";
import { RequirePermissions } from "../../common/decorators/permissions.decorator";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { PermissionsGuard } from "../../common/guards/permissions.guard";
import { AuthenticatedRequest } from "../../common/interfaces/authenticated-request";
import { PlatformSchoolsService } from "./platform-schools.service";

@ApiTags("platform")
@ApiCookieAuth("accessCookie")
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller("platform/schools")
export class PlatformSchoolsController {
  constructor(private readonly schools: PlatformSchoolsService) {}

  @Get()
  @Header("Cache-Control", "no-store")
  @RequirePermissions("platform.schools.read")
  @ApiOperation({
    summary: "List school metadata using a platform-only session",
  })
  list(@Req() req: AuthenticatedRequest) {
    return this.schools.list(req.user.id);
  }
}
