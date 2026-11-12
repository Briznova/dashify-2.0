import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { timingSafeEqual } from "crypto";
import type { Request } from "express";
import {
  ACCESS_COOKIE,
  CSRF_COOKIE,
  REFRESH_COOKIE,
} from "../../modules/auth/auth-cookies";

type CookieRequest = Request & {
  cookies?: Record<string, string | undefined>;
};

@Injectable()
export class CsrfGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<CookieRequest>();
    if (["GET", "HEAD", "OPTIONS"].includes(request.method)) return true;

    const origin = request.get("origin");
    const allowedOrigins = this.config
      .get<string>("WEB_APP_ORIGIN", "http://localhost:5173")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);
    const isLogin = request.path.endsWith("/auth/login");

    if (isLogin) {
      if (!origin || !allowedOrigins.includes(origin)) {
        throw new ForbiddenException("Origin is not allowed");
      }
      return true;
    }

    const hasAuthCookie =
      Boolean(request.cookies?.[ACCESS_COOKIE]) ||
      Boolean(request.cookies?.[REFRESH_COOKIE]);
    if (!hasAuthCookie) return true;

    const csrfCookie = request.cookies?.[CSRF_COOKIE];
    const csrfHeader = request.get("X-CSRF-Token");
    if (
      !origin ||
      !allowedOrigins.includes(origin) ||
      !csrfCookie ||
      !csrfHeader
    ) {
      throw new ForbiddenException("Origin or CSRF token is invalid");
    }

    const cookieBuffer = Buffer.from(csrfCookie);
    const headerBuffer = Buffer.from(csrfHeader);
    if (
      cookieBuffer.length !== headerBuffer.length ||
      !timingSafeEqual(cookieBuffer, headerBuffer)
    ) {
      throw new ForbiddenException("Origin or CSRF token is invalid");
    }
    return true;
  }
}
