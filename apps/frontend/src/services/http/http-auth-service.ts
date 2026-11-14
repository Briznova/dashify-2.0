import type {
  AuthMembership,
  AuthSession,
  ChangePasswordInput,
  SignInInput,
  UserRole,
} from "@/types/auth";
import type { ApiClient } from "@/services/api-client";
import { ApiError } from "@/services/api-client";
import type { AuthService } from "@/services/auth-service";

type AuthApiResponse = {
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string | null;
  };
  scope: "platform" | "school-selection" | "school";
  memberships: AuthMembership[];
  activeSchool: { id: string; name: string } | null;
  workspaceRoles?: string[];
  activeWorkspaceRole?: string | null;
  permissionKeys?: string[];
};

const userRoles: readonly UserRole[] = [
  "school_admin",
  "principal",
  "teacher",
  "accountant",
  "parent",
  "student",
];

function mapRole(role: string): UserRole {
  const normalized = role.toLowerCase();
  const mappedRole = userRoles.find((candidate) => candidate === normalized);
  if (mappedRole) return mappedRole;
  throw new Error(`The API returned an unsupported workspace role: ${role}`);
}

function mapSession(response: AuthApiResponse): AuthSession {
  const activeRole =
    response.scope === "platform"
      ? "super_admin"
      : response.activeWorkspaceRole
        ? mapRole(response.activeWorkspaceRole)
        : null;

  return {
    user: {
      id: response.user.id,
      email: response.user.email,
      name: [response.user.firstName, response.user.lastName]
        .filter(Boolean)
        .join(" "),
      role: activeRole,
      schoolName: response.activeSchool?.name ?? null,
    },
    scope: response.scope,
    memberships: response.memberships,
    activeSchool: response.activeSchool,
    workspaceRoles: response.workspaceRoles ?? [],
    activeWorkspaceRole: response.activeWorkspaceRole ?? null,
    permissionKeys: response.permissionKeys ?? [],
  };
}

function unavailableFeature(feature: string): ApiError {
  return new ApiError(`${feature} is unavailable in API mode.`, 501);
}

export class HttpAuthService implements AuthService {
  constructor(private readonly api: ApiClient) {}

  async getSession(): Promise<AuthSession | null> {
    try {
      return mapSession(await this.api.request<AuthApiResponse>("/auth/me"));
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) return null;
      throw error;
    }
  }

  async signIn(input: SignInInput): Promise<AuthSession> {
    const response = await this.api.request<AuthApiResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: input.email, password: input.password }),
    });
    return mapSession(response);
  }

  signUp(): Promise<AuthSession> {
    return Promise.reject(unavailableFeature("Sign-up"));
  }

  async selectSchool(
    schoolId: string,
    workspaceRole: string,
  ): Promise<AuthSession> {
    const response = await this.api.request<AuthApiResponse>(
      "/auth/active-school",
      {
        method: "POST",
        body: JSON.stringify({ schoolId, workspaceRole }),
      },
    );
    return mapSession(response);
  }

  requestPasswordReset(): Promise<{ previewToken?: string }> {
    return Promise.reject(unavailableFeature("Password reset"));
  }

  resetPassword(): Promise<void> {
    return Promise.reject(unavailableFeature("Password reset"));
  }

  changePassword(input: ChangePasswordInput): Promise<void> {
    return this.api.request("/auth/change-password", {
      method: "POST",
      body: JSON.stringify(input),
    });
  }

  signOut(): Promise<void> {
    return this.api.request("/auth/logout", { method: "POST" });
  }
}
