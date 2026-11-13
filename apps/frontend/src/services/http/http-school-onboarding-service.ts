import { ApiError, type ApiClient } from "@/services/api-client";

export type SchoolOnboarding = {
  status: "NOT_STARTED" | "COMPLETED" | null;
  prerequisites: { academicYear: boolean; classWithSection: boolean };
};

function parse(value: unknown): SchoolOnboarding {
  if (typeof value !== "object" || value === null ||
    !("status" in value) || !(value.status === null || value.status === "NOT_STARTED" || value.status === "COMPLETED") ||
    !("prerequisites" in value) || typeof value.prerequisites !== "object" || value.prerequisites === null ||
    !("academicYear" in value.prerequisites) || typeof value.prerequisites.academicYear !== "boolean" ||
    !("classWithSection" in value.prerequisites) || typeof value.prerequisites.classWithSection !== "boolean") {
    throw new ApiError("The Dashify service returned invalid onboarding data.", 502);
  }
  return {
    status: value.status,
    prerequisites: {
      academicYear: value.prerequisites.academicYear,
      classWithSection: value.prerequisites.classWithSection,
    },
  };
}

export class HttpSchoolOnboardingService {
  constructor(private readonly api: ApiClient) {}

  async get(signal?: AbortSignal): Promise<SchoolOnboarding> {
    return parse(await this.api.request<unknown>("/schools/current/onboarding", {}, signal));
  }

  async complete(): Promise<SchoolOnboarding> {
    return parse(await this.api.request<unknown>("/schools/current/onboarding/complete", { method: "POST" }));
  }
}
