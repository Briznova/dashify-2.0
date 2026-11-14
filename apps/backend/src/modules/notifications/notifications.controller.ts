import {
  BadRequestException,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Req,
  UseGuards,
} from "@nestjs/common";
import {
  ApiCookieAuth,
  ApiHeader,
  ApiNotFoundResponse,
  ApiOperation,
  ApiTags,
} from "@nestjs/swagger";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { AuthenticatedRequest } from "../../common/interfaces/authenticated-request";
import { NotificationsService } from "./notifications.service";

@ApiTags("notifications")
@ApiCookieAuth("accessCookie")
@UseGuards(JwtAuthGuard)
@Controller("notifications")
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: "List the authenticated user's school notifications" })
  list(@Req() req: AuthenticatedRequest) {
    return this.notifications.list(this.school(req), req.user.id);
  }

  @Patch("read-all")
  @ApiHeader({ name: "Origin", required: true })
  @ApiHeader({ name: "X-CSRF-Token", required: true })
  @ApiOperation({ summary: "Mark all of the authenticated user's notifications read" })
  markAllRead(@Req() req: AuthenticatedRequest) {
    return this.notifications.markAllRead(this.school(req), req.user.id);
  }

  @Patch(":id/read")
  @ApiHeader({ name: "Origin", required: true })
  @ApiHeader({ name: "X-CSRF-Token", required: true })
  @ApiOperation({ summary: "Mark one of the authenticated user's notifications read" })
  @ApiNotFoundResponse({ description: "Notification not found" })
  markRead(
    @Req() req: AuthenticatedRequest,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    return this.notifications.markRead(this.school(req), req.user.id, id);
  }

  private school(req: AuthenticatedRequest) {
    if (!req.user.activeSchoolId) {
      throw new BadRequestException("Select an active school first");
    }
    return req.user.activeSchoolId;
  }
}
