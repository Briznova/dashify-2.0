import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiClient } from "@/services/api-client";
import { HttpPlatformSettingsService } from "@/services/http/http-platform-settings-service";

describe("platform settings HTTP adapter", () => {
  afterEach(() => vi.unstubAllGlobals());
  it("returns only valid effective token lifetimes", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({
      accessTokenTtlSeconds: 900, refreshTokenTtlSeconds: 2592000, unexpected: "ignored",
    }), { status: 200 })));
    const service = new HttpPlatformSettingsService(new ApiClient("https://dashify.test/api/v1"));
    await expect(service.read()).resolves.toEqual({ accessTokenTtlSeconds: 900, refreshTokenTtlSeconds: 2592000 });
  });
  it("rejects malformed or non-positive settings", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({
      accessTokenTtlSeconds: 0, refreshTokenTtlSeconds: 2592000,
    }), { status: 200 })));
    const service = new HttpPlatformSettingsService(new ApiClient("https://dashify.test/api/v1"));
    await expect(service.read()).rejects.toThrow("invalid platform settings");
  });
});
