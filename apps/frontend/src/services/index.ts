import { ApiClient } from "@/services/api-client";
import type { AuthService } from "@/services/auth-service";
import type { SchoolService } from "@/services/school-service";
import { HttpAuthService } from "@/services/http/http-auth-service";
import { HttpSchoolService } from "@/services/http/http-school-service";
import { MockAuthService } from "@/services/mock/mock-auth-service";
import { MockSchoolService } from "@/services/mock/mock-school-service";
import { HttpPlatformAuditService } from "@/services/http/http-platform-audit-service";
import { HttpPlatformSettingsService } from "@/services/http/http-platform-settings-service";
import { HttpPlatformSupportService } from "@/services/http/http-platform-support-service";
import { HttpSchoolOnboardingService } from "@/services/http/http-school-onboarding-service";
import { HttpPlatformOnboardingSummaryService } from "@/services/http/http-platform-onboarding-summary-service";
import { HttpSchoolAdminService } from "@/services/http/http-school-admin-service";

export const isApiMode = process.env.NEXT_PUBLIC_DASHIFY_API_MODE === "api";
const configuredApiBaseUrl =
  process.env.NEXT_PUBLIC_DASHIFY_API_BASE_URL ?? "http://localhost:3001";
const normalizedApiBaseUrl = configuredApiBaseUrl.replace(/\/$/, "");
const apiBaseUrl = normalizedApiBaseUrl.endsWith("/api/v1")
  ? normalizedApiBaseUrl
  : `${normalizedApiBaseUrl}/api/v1`;
const apiClient = new ApiClient(apiBaseUrl);
export const platformAuditService = new HttpPlatformAuditService(apiClient);
export const platformSettingsService = new HttpPlatformSettingsService(apiClient);
export const platformSupportService = new HttpPlatformSupportService(apiClient);
export const schoolOnboardingService = new HttpSchoolOnboardingService(apiClient);
export const platformOnboardingSummaryService = new HttpPlatformOnboardingSummaryService(apiClient);
export const schoolAdminService = new HttpSchoolAdminService(apiClient);

export const authService: AuthService = isApiMode
  ? new HttpAuthService(apiClient)
  : new MockAuthService();

export const schoolService: SchoolService = isApiMode
  ? new HttpSchoolService(apiClient)
  : new MockSchoolService();
