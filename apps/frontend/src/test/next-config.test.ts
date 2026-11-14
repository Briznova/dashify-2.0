import { afterEach, describe, expect, it, vi } from "vitest";
import nextConfig from "../../next.config";

async function rewrites() {
  if (!nextConfig.rewrites) throw new Error("Next.js rewrites are not configured");
  return nextConfig.rewrites();
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("API proxy configuration", () => {
  it("preserves existing direct API behavior when no backend origin is configured", async () => {
    vi.stubEnv("BACKEND_INTERNAL_URL", undefined);

    await expect(rewrites()).resolves.toEqual([]);
  });

  it("routes API paths to the configured backend origin", async () => {
    vi.stubEnv("BACKEND_INTERNAL_URL", "http://backend.railway.internal:3001/");

    await expect(rewrites()).resolves.toEqual([
      {
        source: "/api/v1/:path*",
        destination: "http://backend.railway.internal:3001/api/v1/:path*",
      },
    ]);
  });

  it.each([
    "",
    "not-a-url",
    "ftp://backend.example.test",
    "http://user:password@backend.example.test",
    "http://backend.example.test/api/v1",
    "http://backend.example.test/?query=1",
    "http://backend.example.test/#fragment",
  ])("rejects an invalid backend origin", async (backendUrl) => {
    vi.stubEnv("BACKEND_INTERNAL_URL", backendUrl);

    await expect(rewrites()).rejects.toThrow(
      "BACKEND_INTERNAL_URL must be an HTTP(S) backend origin",
    );
  });
});
