import type { ConfigService } from "@nestjs/config";
import type { Response } from "express";

export const ACCESS_COOKIE = "dashify_access";
export const REFRESH_COOKIE = "dashify_refresh";
export const CSRF_COOKIE = "dashify_csrf";

export type AuthCredentials = {
  accessToken: string;
  refreshToken: string;
  csrfToken: string;
};

function cookieOptions(config: ConfigService) {
  const apiPrefix = config
    .get<string>("API_PREFIX", "api/v1")
    .replace(/^\/|\/$/g, "");
  return {
    path: `/${apiPrefix}`,
    sameSite: "lax" as const,
    secure: config.get<string>("NODE_ENV") === "production",
  };
}

export function setAuthCookies(
  response: Response,
  credentials: AuthCredentials,
  config: ConfigService,
): void {
  const baseOptions = cookieOptions(config);
  const accessTtl = Number(config.get("ACCESS_TOKEN_TTL_SECONDS", 900));
  const refreshTtl = Number(config.get("REFRESH_TOKEN_TTL_SECONDS", 2_592_000));

  response.cookie(ACCESS_COOKIE, credentials.accessToken, {
    ...baseOptions,
    httpOnly: true,
    maxAge: accessTtl * 1000,
  });
  response.cookie(REFRESH_COOKIE, credentials.refreshToken, {
    ...baseOptions,
    httpOnly: true,
    maxAge: refreshTtl * 1000,
  });
  response.cookie(CSRF_COOKIE, credentials.csrfToken, {
    ...baseOptions,
    path: "/",
    httpOnly: false,
    maxAge: refreshTtl * 1000,
  });
}

export function clearAuthCookies(
  response: Response,
  config: ConfigService,
): void {
  const baseOptions = cookieOptions(config);
  response.clearCookie(ACCESS_COOKIE, { ...baseOptions, httpOnly: true });
  response.clearCookie(REFRESH_COOKIE, { ...baseOptions, httpOnly: true });
  response.clearCookie(CSRF_COOKIE, {
    ...baseOptions,
    path: "/",
    httpOnly: false,
  });
}
