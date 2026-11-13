import { ApiError, type ApiClient } from "@/services/api-client";

export type PlatformSettings = {
  accessTokenTtlSeconds: number;
  refreshTokenTtlSeconds: number;
};

export class HttpPlatformSettingsService {
  constructor(private readonly api: ApiClient) {}

  async read(signal?: AbortSignal): Promise<PlatformSettings> {
    const response = await this.api.request<unknown>("/platform/settings", {}, signal);
    if (typeof response !== "object" || response === null ||
      !("accessTokenTtlSeconds" in response) ||
      !("refreshTokenTtlSeconds" in response) ||
      typeof response.accessTokenTtlSeconds !== "number" ||
      typeof response.refreshTokenTtlSeconds !== "number" ||
      !Number.isSafeInteger(response.accessTokenTtlSeconds) ||
      !Number.isSafeInteger(response.refreshTokenTtlSeconds) ||
      response.accessTokenTtlSeconds <= 0 || response.refreshTokenTtlSeconds <= 0) {
      throw new ApiError("The Dashify service returned invalid platform settings.", 502);
    }
    return {
      accessTokenTtlSeconds: response.accessTokenTtlSeconds,
      refreshTokenTtlSeconds: response.refreshTokenTtlSeconds,
    };
  }
}
