import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiClient } from "@/services/api-client";
import { HttpAuthService } from "@/services/http/http-auth-service";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(status === 204 ? null : JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

const apiSession = {
  user: {
    id: "user-1",
    email: "admin@example.test",
    firstName: "Avery",
    lastName: "Johnson",
  },
  scope: "school",
  memberships: [
    {
      membershipId: "membership-1",
      school: { id: "school-1", name: "Example School" },
      workspaceRoles: ["school_admin"],
    },
  ],
  activeSchool: { id: "school-1", name: "Example School" },
  workspaceRoles: ["school_admin"],
  activeWorkspaceRole: "school_admin",
  permissionKeys: ["school.read"],
};

describe("HTTP auth service", () => {
  const fetchMock = vi.fn<typeof fetch>();
  const service = new HttpAuthService(new ApiClient("http://localhost:3001/api/v1"));

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
    document.cookie = "dashify_csrf=csrf-token; path=/";
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    document.cookie = "dashify_csrf=; Max-Age=0; path=/";
  });

  it("maps login/session responses and sends browser credentials without rememberMe", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(apiSession));

    const result = await service.signIn({
      email: "admin@example.test",
      password: "example-password",
      rememberMe: false,
    });

    expect(result.user).toMatchObject({
      id: "user-1",
      name: "Avery Johnson",
      role: "school_admin",
      schoolName: "Example School",
    });
    expect(result.permissionKeys).toEqual(["school.read"]);
    const [url, options] = fetchMock.mock.calls[0]!;
    expect(url).toBe("http://localhost:3001/api/v1/auth/login");
    expect(options).toMatchObject({ method: "POST", credentials: "include" });
    expect(JSON.parse(String(options?.body))).toEqual({
      email: "admin@example.test",
      password: "example-password",
    });
    expect(new Headers(options?.headers).get("X-CSRF-Token")).toBe("csrf-token");
  });

  it("returns an unauthenticated session after failed restore and refresh", async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ message: "Unauthorized" }, 401))
      .mockResolvedValueOnce(jsonResponse({ message: "Unauthorized" }, 401));

    await expect(service.getSession()).resolves.toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[1]?.[0]).toBe(
      "http://localhost:3001/api/v1/auth/refresh",
    );
  });

  it("retries protected requests after a cookie refresh", async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ message: "Unauthorized" }, 401))
      .mockResolvedValueOnce(jsonResponse(apiSession))
      .mockResolvedValueOnce(jsonResponse({ id: "school-1" }));

    const result = await new ApiClient("http://localhost:3001/api/v1").request<{
      id: string;
    }>("/schools/current");

    expect(result).toEqual({ id: "school-1" });
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
      "http://localhost:3001/api/v1/schools/current",
      "http://localhost:3001/api/v1/auth/refresh",
      "http://localhost:3001/api/v1/schools/current",
    ]);
    for (const [, options] of fetchMock.mock.calls) {
      expect(options?.credentials).toBe("include");
    }
  });

  it("keeps signup and password reset unavailable in API mode", async () => {
    await expect(service.signUp()).rejects.toMatchObject({ status: 501 });
    await expect(
      service.requestPasswordReset(),
    ).rejects.toMatchObject({ status: 501 });
    await expect(service.resetPassword()).rejects.toMatchObject({
      status: 501,
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("surfaces logout API failures", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ message: "Session revocation failed" }, 503),
    );

    await expect(service.signOut()).rejects.toMatchObject({
        name: "ApiError",
        message: "Session revocation failed",
        status: 503,
    });
  });
});
