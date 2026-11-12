import { ExecutionContext, ForbiddenException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { CsrfGuard } from "./csrf.guard";

describe("CsrfGuard", () => {
  function makeContext(request: {
    method: string;
    path: string;
    cookies?: Record<string, string>;
    headers: Record<string, string>;
  }) {
    return {
      switchToHttp: () => ({
        getRequest: () => ({
          ...request,
          get: (name: string) => request.headers[name.toLowerCase()],
        }),
      }),
    } as ExecutionContext;
  }

  const config = {
    get: jest.fn().mockReturnValue("http://localhost:3000"),
  } as unknown as ConfigService;

  it("allows same-origin state changes with a matching double-submit token", () => {
    const guard = new CsrfGuard(config);
    const context = makeContext({
      method: "POST",
      path: "/api/v1/auth/active-school",
      cookies: {
        dashify_access: "access",
        dashify_csrf: "csrf-value",
      },
      headers: {
        origin: "http://localhost:3000",
        "x-csrf-token": "csrf-value",
      },
    });

    expect(guard.canActivate(context)).toBe(true);
  });

  it("rejects cookie-authenticated state changes with a mismatched CSRF token", () => {
    const guard = new CsrfGuard(config);
    const context = makeContext({
      method: "POST",
      path: "/api/v1/auth/logout",
      cookies: {
        dashify_refresh: "refresh",
        dashify_csrf: "expected",
      },
      headers: {
        origin: "http://localhost:3000",
        "x-csrf-token": "wrong",
      },
    });

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it("requires an allowed Origin on login", () => {
    const guard = new CsrfGuard(config);
    const context = makeContext({
      method: "POST",
      path: "/api/v1/auth/login",
      headers: {},
    });

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });
});
