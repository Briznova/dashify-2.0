import { Body, Controller, ForbiddenException, Header, Param, ParseUUIDPipe, Post, Req, UseGuards } from "@nestjs/common";
import { ApiCookieAuth, ApiCreatedResponse, ApiHeader, ApiOperation, ApiTags } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import { RequirePermissions } from "../../common/decorators/permissions.decorator";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { PermissionsGuard } from "../../common/guards/permissions.guard";
import { AuthenticatedRequest } from "../../common/interfaces/authenticated-request";
import { CreateSchoolAdminDto } from "./dto/create-school-admin.dto";
import { SchoolAdminService } from "./school-admin.service";

@ApiTags("platform")
@ApiCookieAuth("accessCookie")
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller("platform/schools")
export class SchoolAdminController {
  constructor(private readonly admins: SchoolAdminService) {}

  @Post(":schoolId/admins")
  @Header("Cache-Control", "no-store")
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @RequirePermissions("platform.schools.read", "platform.school-admins.create")
  @ApiHeader({ name: "X-CSRF-Token", required: true })
  @ApiOperation({ summary: "Create a School Admin using the configured shared password" })
  @ApiCreatedResponse({ schema: { type: "object", required: ["id", "email", "schoolId"], properties: {
    id: { type: "string", format: "uuid" }, email: { type: "string", format: "email" },
    schoolId: { type: "string", format: "uuid" },
  } } })
  create(@Req() req: AuthenticatedRequest, @Param("schoolId", ParseUUIDPipe) schoolId: string,
    @Body() input: CreateSchoolAdminDto) {
    if (req.user.scope !== "platform") throw new ForbiddenException();
    return this.admins.create(req.user.id, schoolId, input);
  }
}
