import {
  Body,
  Controller,
  Get,
  Header,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBody,
  ApiCookieAuth,
  ApiHeader,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from "@nestjs/swagger";
import type { Request, Response } from "express";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { AuthenticatedRequest } from "../../common/interfaces/authenticated-request";
import { ConfigService } from "@nestjs/config";
import {
  clearAuthCookies,
  REFRESH_COOKIE,
  setAuthCookies,
} from "./auth-cookies";
import { AuthService } from "./auth.service";
import { LoginDto } from "./dto/login.dto";
import { SelectSchoolDto } from "./dto/select-school.dto";
import {
  AuthLoginResponseDto,
  AuthMembershipResponseDto,
  AuthSessionResponseDto,
} from "./dto/auth-response.dto";

type CookieRequest = Request & {
  cookies?: Record<string, string | undefined>;
};

@ApiTags("auth")
@Controller("auth")
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly config: ConfigService,
  ) {}

  @Post("login")
  @Header("Cache-Control", "no-store")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Authenticate a browser session" })
  @ApiBody({ type: LoginDto })
  @ApiOkResponse({ type: AuthLoginResponseDto })
  @ApiHeader({ name: "Origin", required: true })
  async login(
    @Req() request: CookieRequest,
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.auth.login(
      dto,
      request.cookies?.[REFRESH_COOKIE],
    );
    setAuthCookies(response, result.credentials, this.config);
    return result.body;
  }

  @Post("refresh")
  @Header("Cache-Control", "no-store")
  @HttpCode(HttpStatus.OK)
  @ApiCookieAuth("refreshCookie")
  @ApiOkResponse({ type: AuthSessionResponseDto })
  @ApiHeader({ name: "Origin", required: true })
  @ApiHeader({ name: "X-CSRF-Token", required: true })
  @ApiOperation({ summary: "Rotate the current browser session credentials" })
  async refresh(
    @Req() request: CookieRequest,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.auth.refresh(request.cookies?.[REFRESH_COOKIE]);
    setAuthCookies(response, result.credentials, this.config);
    return result.body;
  }

  @Post("logout")
  @Header("Cache-Control", "no-store")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiCookieAuth("refreshCookie")
  @ApiNoContentResponse()
  @ApiHeader({ name: "Origin", required: true })
  @ApiHeader({ name: "X-CSRF-Token", required: true })
  @ApiOperation({ summary: "Revoke the current browser session" })
  async logout(
    @Req() request: CookieRequest,
    @Res({ passthrough: true }) response: Response,
  ): Promise<void> {
    await this.auth.logout(request.cookies?.[REFRESH_COOKIE]);
    clearAuthCookies(response, this.config);
  }

  @ApiCookieAuth("accessCookie")
  @UseGuards(JwtAuthGuard)
  @Get("me")
  @Header("Cache-Control", "no-store")
  @ApiOperation({ summary: "Get the authenticated user and active context" })
  @ApiOkResponse({ type: AuthSessionResponseDto })
  me(@Req() request: AuthenticatedRequest) {
    return this.auth.currentSession(request.user.id, {
      activeSchoolId: request.user.activeSchoolId ?? null,
      membershipId: request.user.membershipId ?? null,
      activeWorkspaceRole: request.user.activeWorkspaceRole ?? null,
      permissionKeys: request.user.permissions ?? [],
    });
  }

  @ApiCookieAuth("accessCookie")
  @UseGuards(JwtAuthGuard)
  @Get("schools")
  @Header("Cache-Control", "no-store")
  @ApiOperation({ summary: "List active school memberships for the user" })
  @ApiOkResponse({ type: [AuthMembershipResponseDto] })
  schools(@Req() request: AuthenticatedRequest) {
    return this.auth.listSchools(request.user.id);
  }

  @ApiCookieAuth("accessCookie")
  @UseGuards(JwtAuthGuard)
  @Post("active-school")
  @HttpCode(HttpStatus.OK)
  @Header("Cache-Control", "no-store")
  @ApiHeader({ name: "Origin", required: true })
  @ApiHeader({ name: "X-CSRF-Token", required: true })
  @ApiOperation({ summary: "Select an active school and workspace role" })
  @ApiBody({ type: SelectSchoolDto })
  @ApiOkResponse({ type: AuthSessionResponseDto })
  async selectSchool(
    @Req() request: AuthenticatedRequest,
    @Body() dto: SelectSchoolDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.auth.selectSchool(
      request.user.id,
      request.user.sessionId,
      request.cookies?.[REFRESH_COOKIE],
      dto.schoolId,
      dto.workspaceRole,
    );
    setAuthCookies(response, result.credentials, this.config);
    return result.body;
  }
}
