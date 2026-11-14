import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  async rewrites() {
    const backendUrl = process.env.BACKEND_INTERNAL_URL;
    if (backendUrl === undefined) return [];

    let url: URL;
    try {
      url = new URL(backendUrl);
    } catch {
      throw new Error("BACKEND_INTERNAL_URL must be an HTTP(S) backend origin");
    }
    if (
      !["http:", "https:"].includes(url.protocol) ||
      url.username ||
      url.password ||
      url.pathname !== "/" ||
      url.search ||
      url.hash
    ) {
      throw new Error("BACKEND_INTERNAL_URL must be an HTTP(S) backend origin");
    }

    return [
      {
        source: "/api/v1/:path*",
        destination: `${url.origin}/api/v1/:path*`,
      },
    ];
  },
};

export default nextConfig;
