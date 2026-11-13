import type { ConfigService } from "@nestjs/config";

export function getAuthTokenTtls(config: ConfigService) {
  return {
    accessTokenTtlSeconds: Number(config.get("ACCESS_TOKEN_TTL_SECONDS", 900)),
    refreshTokenTtlSeconds: Number(config.get("REFRESH_TOKEN_TTL_SECONDS", 2_592_000)),
  };
}
