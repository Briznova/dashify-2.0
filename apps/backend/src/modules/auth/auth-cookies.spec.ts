import { ConfigService } from "@nestjs/config";
import type { Response } from "express";
import { clearAuthCookies, setAuthCookies } from "./auth-cookies";

describe("auth cookies", () => {
  function createResponse() {
    return {
      cookie: jest.fn(),
      clearCookie: jest.fn(),
    } as unknown as Response & {
      cookie: jest.Mock;
      clearCookie: jest.Mock;
    };
  }

  it("sets HttpOnly auth cookies and a readable CSRF cookie", () => {
    const response = createResponse();
    const config = {
      get: jest.fn((key: string, fallback: unknown) =>
        key === "API_PREFIX" ? "api/v1" : fallback,
      ),
    } as unknown as ConfigService;

    setAuthCookies(
      response,
      {
        accessToken: "access",
        refreshToken: "refresh",
        csrfToken: "csrf",
      },
      config,
    );

    expect(response.cookie).toHaveBeenNthCalledWith(
      1,
      "dashify_access",
      "access",
      expect.objectContaining({
        path: "/api/v1",
        httpOnly: true,
        sameSite: "lax",
        secure: false,
        maxAge: 900_000,
      }),
    );
    expect(response.cookie).toHaveBeenNthCalledWith(
      2,
      "dashify_refresh",
      "refresh",
      expect.objectContaining({
        path: "/api/v1",
        httpOnly: true,
        maxAge: 2_592_000_000,
      }),
    );
    expect(response.cookie).toHaveBeenNthCalledWith(
      3,
      "dashify_csrf",
      "csrf",
      expect.objectContaining({
        path: "/",
        httpOnly: false,
      }),
    );
  });

  it("clears cookies using the same API scope and enables Secure in production", () => {
    const response = createResponse();
    const config = {
      get: jest.fn((key: string, fallback: unknown) => {
        if (key === "API_PREFIX") return "api/v1";
        if (key === "NODE_ENV") return "production";
        return fallback;
      }),
    } as unknown as ConfigService;

    clearAuthCookies(response, config);

    expect(response.clearCookie).toHaveBeenNthCalledWith(
      1,
      "dashify_access",
      expect.objectContaining({
        path: "/api/v1",
        httpOnly: true,
        secure: true,
      }),
    );
    expect(response.clearCookie).toHaveBeenNthCalledWith(
      2,
      "dashify_refresh",
      expect.objectContaining({
        path: "/api/v1",
        httpOnly: true,
        secure: true,
      }),
    );
    expect(response.clearCookie).toHaveBeenNthCalledWith(
      3,
      "dashify_csrf",
      expect.objectContaining({
        path: "/",
        httpOnly: false,
        secure: true,
      }),
    );
  });
});
