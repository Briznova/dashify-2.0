import { Body, Controller, ForbiddenException, Get, Header, Patch, Post, Req, UseGuards } from "@nestjs/common";
import { ApiBody, ApiCookieAuth, ApiHeader, ApiOkResponse, ApiOperation, ApiTags } from "@nestjs/swagger";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RequirePermissions } from "../../common/decorators/permissions.decorator";
import { PermissionsGuard } from "../../common/guards/permissions.guard";
import { AuthenticatedRequest } from "../../common/interfaces/authenticated-request";
import { UpdateSchoolDto } from "./dto/update-school.dto";
import { UpdateAdmissionSettingsDto } from "./dto/update-admission-settings.dto";
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

  private onboardingSchool(req: AuthenticatedRequest): string {
    if (req.user.scope !== "school" || req.user.activeWorkspaceRole !== "school_admin" || !req.user.activeSchoolId) {
      throw new ForbiddenException();
    }
    return req.user.activeSchoolId;
  }

  @Get("current/admission-settings")
  @Header("Cache-Control", "no-store")
  @RequirePermissions("school.update")
  @ApiOperation({ summary: "Read the active School Admin's admission ID prefix" })
  @ApiOkResponse({ schema: { type: "object", required: ["prefix"], properties: { prefix: { type: "string" } } } })
  admissionSettings(@Req() req: AuthenticatedRequest) {
    return this.schools.getAdmissionSettings(this.onboardingSchool(req));
  }

  @Patch("current/admission-settings")
  @Header("Cache-Control", "no-store")
  @RequirePermissions("school.update")
  @ApiHeader({ name: "X-CSRF-Token", required: true })
  @ApiBody({ type: UpdateAdmissionSettingsDto })
  @ApiOperation({ summary: "Set the active School Admin's admission ID prefix" })
  @ApiOkResponse({ schema: { type: "object", required: ["prefix"], properties: { prefix: { type: "string" } } } })
  updateAdmissionSettings(@Req() req: AuthenticatedRequest, @Body() dto: UpdateAdmissionSettingsDto) {
    return this.schools.updateAdmissionSettings(this.onboardingSchool(req), req.user.id, dto.prefix);
  }

  @Get("current/onboarding")
  @Header("Cache-Control", "no-store")
  @RequirePermissions("school.update")
  @ApiOperation({ summary: "Read onboarding confirmation and prerequisites for the active School Admin workspace" })
  onboarding(@Req() req: AuthenticatedRequest) {
    return this.schools.getOnboarding(this.onboardingSchool(req));
  }

  @Post("current/onboarding/complete")
  @Header("Cache-Control", "no-store")
  @RequirePermissions("school.update")
  @ApiHeader({ name: "X-CSRF-Token", required: true })
  @ApiOperation({ summary: "Confirm onboarding once academic structure prerequisites exist" })
  completeOnboarding(@Req() req: AuthenticatedRequest) {
    return this.schools.completeOnboarding(this.onboardingSchool(req), req.user.id);
  }
}
