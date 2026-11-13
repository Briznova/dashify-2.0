import { Body, Controller, ForbiddenException, Get, Header, Param, ParseUUIDPipe, Post, Query, Req, UseGuards } from "@nestjs/common";
import { ApiCookieAuth, ApiHeader, ApiOkResponse, ApiOperation, ApiTags } from "@nestjs/swagger";
import { RequirePermissions } from "../../common/decorators/permissions.decorator";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { PermissionsGuard } from "../../common/guards/permissions.guard";
import { AuthenticatedRequest } from "../../common/interfaces/authenticated-request";
import { CreateSupportTicketDto, ListSupportTicketsDto, SupportTicketActionDto } from "./dto/platform-support.dto";
import { PlatformSupportService } from "./platform-support.service";

@ApiTags("platform")
@ApiCookieAuth("accessCookie")
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller("platform/support-tickets")
export class PlatformSupportController {
  constructor(private readonly support: PlatformSupportService) {}

  @Get()
  @Header("Cache-Control", "no-store")
  @RequirePermissions("platform.support.read")
  @ApiOperation({ summary: "List internal support tickets" })
  list(@Req() req: AuthenticatedRequest, @Query() query: ListSupportTicketsDto) {
    if (req.user.scope !== "platform") throw new ForbiddenException();
    return this.support.list(query);
  }

  @Get("summary")
  @Header("Cache-Control", "no-store")
  @RequirePermissions("platform.support.read")
  @ApiOperation({ summary: "Count unresolved internal support tickets" })
  @ApiOkResponse({ schema: { type: "object", required: ["unresolved"], properties: { unresolved: { type: "integer", minimum: 0 } } } })
  summary(@Req() req: AuthenticatedRequest) {
    if (req.user.scope !== "platform") throw new ForbiddenException();
    return this.support.summary();
  }

  @Get(":id")
  @Header("Cache-Control", "no-store")
  @RequirePermissions("platform.support.read")
  @ApiOperation({ summary: "Read an internal support ticket and recent history" })
  detail(@Req() req: AuthenticatedRequest, @Param("id", ParseUUIDPipe) id: string) {
    if (req.user.scope !== "platform") throw new ForbiddenException();
    return this.support.detail(id);
  }

  @Post()
  @Header("Cache-Control", "no-store")
  @RequirePermissions("platform.support.read", "platform.support.update")
  @ApiHeader({ name: "X-CSRF-Token", required: true })
  @ApiOperation({ summary: "Create an internal support ticket" })
  create(@Req() req: AuthenticatedRequest, @Body() input: CreateSupportTicketDto) {
    if (req.user.scope !== "platform") throw new ForbiddenException();
    return this.support.create(req.user.id, input);
  }

  @Post(":id/actions")
  @Header("Cache-Control", "no-store")
  @RequirePermissions("platform.support.read", "platform.support.update")
  @ApiHeader({ name: "X-CSRF-Token", required: true })
  @ApiOperation({ summary: "Apply an optimistic-concurrency support ticket action" })
  act(@Req() req: AuthenticatedRequest, @Param("id", ParseUUIDPipe) id: string, @Body() input: SupportTicketActionDto) {
    if (req.user.scope !== "platform") throw new ForbiddenException();
    return this.support.act(req.user.id, id, input);
  }
}
