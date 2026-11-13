import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Header,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
import {
  ApiCookieAuth,
  ApiHeader,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from "@nestjs/swagger";
import { RequirePermissions } from "../../common/decorators/permissions.decorator";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { PermissionsGuard } from "../../common/guards/permissions.guard";
import { AuthenticatedRequest } from "../../common/interfaces/authenticated-request";
import { CreatePlatformSchoolDto } from "./dto/create-platform-school.dto";
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
    if (req.user.scope !== "platform") throw new ForbiddenException();
    return this.schools.list(req.user.id);
  }

  @Get("onboarding-summary")
  @Header("Cache-Control", "no-store")
  @RequirePermissions("platform.schools.read")
  @ApiOperation({ summary: "Count recorded school onboarding states" })
  @ApiOkResponse({ schema: { type: "object", required: ["notStarted", "completed", "unknown"], properties: {
    notStarted: { type: "integer", minimum: 0 },
    completed: { type: "integer", minimum: 0 },
    unknown: { type: "integer", minimum: 0 },
  } } })
  onboardingSummary(@Req() req: AuthenticatedRequest) {
    if (req.user.scope !== "platform") throw new ForbiddenException();
    return this.schools.onboardingSummary(req.user.id);
  }

  @Get(":id")
  @Header("Cache-Control", "no-store")
  @RequirePermissions("platform.schools.read")
  @ApiOperation({ summary: "Read school directory metadata and known onboarding state" })
  @ApiOkResponse({
    schema: {
      type: "object",
      required: ["id", "name", "code", "isActive", "createdAt", "onboardingState"],
      properties: {
        id: { type: "string", format: "uuid" },
        name: { type: "string" },
        code: { type: "string" },
        isActive: { type: "boolean" },
        createdAt: { type: "string", format: "date-time" },
        onboardingState: { type: "string", nullable: true, enum: ["NOT_STARTED", "COMPLETED"] },
      },
    },
  })
  detail(@Req() req: AuthenticatedRequest, @Param("id", ParseUUIDPipe) id: string) {
    if (req.user.scope !== "platform") throw new ForbiddenException();
    return this.schools.detail(req.user.id, id);
  }

  @Post()
  @Header("Cache-Control", "no-store")
  @RequirePermissions("platform.schools.create")
  @ApiHeader({ name: "X-CSRF-Token", required: true })
  @ApiOperation({
    summary: "Create a school directory entry with NOT_STARTED onboarding",
  })
  create(
    @Req() req: AuthenticatedRequest,
    @Body() dto: CreatePlatformSchoolDto,
  ) {
    if (req.user.scope !== "platform") throw new ForbiddenException();
    return this.schools.create(req.user.id, dto);
  }
}
