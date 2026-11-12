import { Body, Controller, Get, Patch, Req, UseGuards } from "@nestjs/common";
import { ApiBody, ApiCookieAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RequirePermissions } from "../../common/decorators/permissions.decorator";
import { PermissionsGuard } from "../../common/guards/permissions.guard";
import { AuthenticatedRequest } from "../../common/interfaces/authenticated-request";
import { UpdateSchoolDto } from "./dto/update-school.dto";
import { SchoolsService } from "./schools.service";

@ApiTags("schools")
@ApiCookieAuth("accessCookie")
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller("schools")
export class SchoolsController {
  constructor(private readonly schools: SchoolsService) {}

  @Get("current")
  @RequirePermissions("school.read")
  @ApiOperation({ summary: "Get the active school profile" })
  get(@Req() req: AuthenticatedRequest) {
    if (!req.user.activeSchoolId)
      throw new Error("Select an active school first");
    return this.schools.getCurrent(req.user.activeSchoolId);
  }

  @Patch("current")
  @RequirePermissions("school.update")
  @ApiOperation({ summary: "Update the active school profile" })
  @ApiBody({ type: UpdateSchoolDto })
  update(@Req() req: AuthenticatedRequest, @Body() dto: UpdateSchoolDto) {
    if (!req.user.activeSchoolId)
      throw new Error("Select an active school first");
    return this.schools.updateCurrent(req.user.activeSchoolId, dto);
  }
}
