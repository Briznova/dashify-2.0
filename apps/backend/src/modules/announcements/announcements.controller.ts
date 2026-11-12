import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBody,
  ApiCookieAuth,
  ApiHeader,
  ApiOperation,
  ApiTags,
} from "@nestjs/swagger";
import { AuthenticatedRequest } from "../../common/interfaces/authenticated-request";
import { RequirePermissions } from "../../common/decorators/permissions.decorator";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { PermissionsGuard } from "../../common/guards/permissions.guard";
import { CreateAnnouncementDto } from "./dto/create-announcement.dto";
import { AnnouncementsService } from "./announcements.service";

@ApiTags("announcements")
@ApiCookieAuth("accessCookie")
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller("announcements")
export class AnnouncementsController {
  constructor(private readonly announcements: AnnouncementsService) {}

  private school(req: AuthenticatedRequest): string {
    if (!req.user.activeSchoolId) {
      throw new BadRequestException("Select an active school first");
    }
    return req.user.activeSchoolId;
  }

  @Get()
  @RequirePermissions("announcements.read")
  @ApiOperation({ summary: "List published school-wide announcements" })
  list(@Req() req: AuthenticatedRequest) {
    return this.announcements.listPublished(this.school(req));
  }

  @Get("manage")
  @RequirePermissions("announcements.manage")
  @ApiOperation({ summary: "List school-wide announcements for management" })
  manageList(@Req() req: AuthenticatedRequest) {
    return this.announcements.listForManagement(this.school(req));
  }

  @Post()
  @RequirePermissions("announcements.manage")
  @ApiHeader({ name: "Origin", required: true })
  @ApiHeader({ name: "X-CSRF-Token", required: true })
  @ApiOperation({ summary: "Create a draft school-wide announcement" })
  @ApiBody({ type: CreateAnnouncementDto })
  create(@Req() req: AuthenticatedRequest, @Body() dto: CreateAnnouncementDto) {
    return this.announcements.createDraft(this.school(req), req.user.id, dto);
  }

  @Post(":id/publish")
  @RequirePermissions("announcements.manage")
  @ApiHeader({ name: "Origin", required: true })
  @ApiHeader({ name: "X-CSRF-Token", required: true })
  @ApiOperation({ summary: "Publish a draft school-wide announcement" })
  publish(
    @Req() req: AuthenticatedRequest,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    return this.announcements.publish(this.school(req), req.user.id, id);
  }
}
