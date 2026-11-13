import { ApiError, type ApiClient } from "@/services/api-client";

export type PlatformOnboardingSummary = { notStarted: number; completed: number; unknown: number };

export class HttpPlatformOnboardingSummaryService {
  constructor(private readonly api: ApiClient) {}

  async get(signal?: AbortSignal): Promise<PlatformOnboardingSummary> {
    const value = await this.api.request<unknown>("/platform/schools/onboarding-summary", {}, signal);
    if (typeof value !== "object" || value === null ||
      !("notStarted" in value) || !("completed" in value) || !("unknown" in value) ||
      typeof value.notStarted !== "number" || !Number.isSafeInteger(value.notStarted) || value.notStarted < 0 ||
      typeof value.completed !== "number" || !Number.isSafeInteger(value.completed) || value.completed < 0 ||
      typeof value.unknown !== "number" || !Number.isSafeInteger(value.unknown) || value.unknown < 0) {
      throw new ApiError("The Dashify service returned invalid onboarding summary data.", 502);
    }
    return { notStarted: value.notStarted, completed: value.completed, unknown: value.unknown };
  }
}
