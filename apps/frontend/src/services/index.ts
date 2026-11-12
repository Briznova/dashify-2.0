import { ApiClient } from "@/services/api-client";
import type { AuthService } from "@/services/auth-service";
import type { SchoolService } from "@/services/school-service";
import { HttpAuthService } from "@/services/http/http-auth-service";
import { HttpSchoolService } from "@/services/http/http-school-service";
import { MockAuthService } from "@/services/mock/mock-auth-service";
import { MockSchoolService } from "@/services/mock/mock-school-service";

export const isApiMode = process.env.NEXT_PUBLIC_DASHIFY_API_MODE === "api";
const configuredApiBaseUrl =
  process.env.NEXT_PUBLIC_DASHIFY_API_BASE_URL ?? "http://localhost:3001";
const normalizedApiBaseUrl = configuredApiBaseUrl.replace(/\/$/, "");
const apiBaseUrl = normalizedApiBaseUrl.endsWith("/api/v1")
  ? normalizedApiBaseUrl
  : `${normalizedApiBaseUrl}/api/v1`;
const apiClient = new ApiClient(apiBaseUrl);

export const authService: AuthService = isApiMode
  ? new HttpAuthService(apiClient)
  : new MockAuthService();

export const schoolService: SchoolService = isApiMode
  ? new HttpSchoolService(apiClient)
  : new MockSchoolService();
