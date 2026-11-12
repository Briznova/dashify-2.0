import type {
  AuthSession,
  AuthUser,
  PasswordResetInput,
  SignInInput,
  SignUpInput,
  UserRole,
} from "@/types/auth";
import type { AuthService } from "@/services/auth-service";

const SESSION_KEY = "dashify.mock.session";
const RESET_TOKEN_PREFIX = "dashify.mock.reset.";
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DEMO_ACCOUNTS: Record<string, { name: string; role: UserRole }> = {
  "superadmin@school.edu": { name: "Dashify Admin", role: "super_admin" },
  "admin@school.edu": { name: "Jordan Davis", role: "school_admin" },
  "principal@school.edu": { name: "Avery Johnson", role: "principal" },
  "teacher@school.edu": { name: "Mia Robinson", role: "teacher" },
  "accountant@school.edu": { name: "Finance Team", role: "accountant" },
  "parent@school.edu": { name: "Morgan Bennett", role: "parent" },
  "student@school.edu": { name: "Olivia Bennett", role: "student" },
};

function delay(signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException("The request was cancelled.", "AbortError"));
      return;
    }

    const onAbort = () => {
      window.clearTimeout(timer);
      reject(new DOMException("The request was cancelled.", "AbortError"));
    };
    const timer = window.setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, 300);
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

function createSession(
  name: string,
  email: string,
  schoolName: string | null,
  rememberMe = true,
  role: UserRole = "school_admin",
): AuthSession {
  const user: AuthUser = {
    id: `mock-${email.toLowerCase().replace(/[^a-z0-9]/g, "-")}`,
    name,
    email,
    role,
    schoolName,
  };

  const isPlatform = role === "super_admin";
  const membershipId = `mock-membership-${email.toLowerCase().replace(/[^a-z0-9]/g, "-")}`;
  const session: AuthSession = {
    user,
    scope: isPlatform ? "platform" : "school",
    memberships: isPlatform || !schoolName
      ? []
      : [{
          membershipId,
          school: { id: `mock-school-${membershipId}`, name: schoolName },
          workspaceRoles: [role],
        }],
    activeSchool: !isPlatform && schoolName
      ? { id: `mock-school-${membershipId}`, name: schoolName }
      : null,
    workspaceRoles: isPlatform ? [] : [role],
    activeWorkspaceRole: isPlatform ? null : role,
    permissionKeys: [],
  };

  const storage = rememberMe ? window.localStorage : window.sessionStorage;
  const otherStorage = rememberMe ? window.sessionStorage : window.localStorage;
  otherStorage.removeItem(SESSION_KEY);
  storage.setItem(SESSION_KEY, JSON.stringify(session));
  return session;
}

function isAuthSession(value: unknown): value is AuthSession {
  if (typeof value !== "object" || value === null || !("user" in value)) return false;
  const user = value.user;
  return typeof user === "object" &&
    user !== null &&
    "id" in user && typeof user.id === "string" &&
    "name" in user && typeof user.name === "string" &&
    "email" in user && typeof user.email === "string" &&
    "role" in user &&
    (user.role === null || isUserRole(user.role)) &&
    "schoolName" in user &&
    (typeof user.schoolName === "string" || user.schoolName === null) &&
    "scope" in value &&
    (value.scope === "platform" || value.scope === "school-selection" || value.scope === "school") &&
    "memberships" in value && Array.isArray(value.memberships) &&
    "activeSchool" in value &&
    (value.activeSchool === null || typeof value.activeSchool === "object") &&
    "workspaceRoles" in value && Array.isArray(value.workspaceRoles) &&
    "activeWorkspaceRole" in value &&
    (typeof value.activeWorkspaceRole === "string" || value.activeWorkspaceRole === null) &&
    "permissionKeys" in value && Array.isArray(value.permissionKeys);
}

function isUserRole(value: unknown): value is UserRole {
  return value === "super_admin" ||
    value === "school_admin" ||
    value === "principal" ||
    value === "teacher" ||
    value === "accountant" ||
    value === "parent" ||
    value === "student";
}

function upgradeLegacySession(value: unknown): AuthSession | null {
  if (typeof value !== "object" || value === null || !("user" in value)) {
    return null;
  }
  const user = value.user;
  if (
    typeof user !== "object" ||
    user === null ||
    !("id" in user) ||
    typeof user.id !== "string" ||
    !("name" in user) ||
    typeof user.name !== "string" ||
    !("email" in user) ||
    typeof user.email !== "string" ||
    !("role" in user) ||
    !isUserRole(user.role) ||
    !("schoolName" in user) ||
    (typeof user.schoolName !== "string" && user.schoolName !== null)
  ) {
    return null;
  }

  const isPlatform = user.role === "super_admin";
  const membershipId = `mock-membership-${user.id}`;
  const school = user.schoolName
    ? { id: `mock-school-${membershipId}`, name: user.schoolName }
    : null;
  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      schoolName: user.schoolName,
    },
    scope: isPlatform ? "platform" : "school",
    memberships: !isPlatform && school
      ? [{ membershipId, school, workspaceRoles: [user.role] }]
      : [],
    activeSchool: !isPlatform ? school : null,
    workspaceRoles: isPlatform ? [] : [user.role],
    activeWorkspaceRole: isPlatform ? null : user.role,
    permissionKeys: [],
  };
}

export class MockAuthService implements AuthService {
  async getSession(): Promise<AuthSession | null> {
    const localSession = window.localStorage.getItem(SESSION_KEY);
    const storage = localSession ? window.localStorage : window.sessionStorage;
    const raw = localSession ?? window.sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;

    let value: unknown;
    try {
      value = JSON.parse(raw);
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new Error("The preview session is invalid. Sign out and sign in again.");
      }
      throw error;
    }

    if (!isAuthSession(value)) {
      const upgraded = upgradeLegacySession(value);
      if (upgraded) {
        storage.setItem(SESSION_KEY, JSON.stringify(upgraded));
        return upgraded;
      }
      throw new Error("The preview session is invalid. Sign out and sign in again.");
    }
    return value;
  }

  async signIn(input: SignInInput): Promise<AuthSession> {
    await delay();
    if (!EMAIL_PATTERN.test(input.email) || input.password.length < 8) {
      throw new Error("Enter a valid email address and a password of at least 8 characters.");
    }

    const email = input.email.trim().toLowerCase();
    const account = DEMO_ACCOUNTS[email];
    const name = account?.name ?? email.split("@")[0].replace(/[._-]/g, " ");
    return createSession(
      account?.name ?? name.replace(/\b\w/g, (letter) => letter.toUpperCase()),
      email,
      "Northstar Academy",
      input.rememberMe,
      account?.role ?? "school_admin",
    );
  }

  async signUp(input: SignUpInput): Promise<AuthSession> {
    await delay();
    if (!input.name.trim() || !EMAIL_PATTERN.test(input.email) || !input.schoolName.trim()) {
      throw new Error("Complete all fields with a valid email address.");
    }
    if (input.password.length < 8) {
      throw new Error("Your password must be at least 8 characters.");
    }
    return createSession(input.name.trim(), input.email.trim(), input.schoolName.trim());
  }

  async selectSchool(
    schoolId: string,
    workspaceRole: string,
  ): Promise<AuthSession> {
    await delay();
    const session = await this.getSession();
    if (!session) throw new Error("Sign in before choosing a workspace.");
    const membership = session.memberships.find(
      (item) => item.school.id === schoolId,
    );
    if (!membership || !membership.workspaceRoles.includes(workspaceRole)) {
      throw new Error("That workspace role is not available for this school.");
    }

    const roles: Record<string, UserRole> = {
      super_admin: "super_admin",
      school_admin: "school_admin",
      principal: "principal",
      teacher: "teacher",
      accountant: "accountant",
      parent: "parent",
      student: "student",
    };
    const role = roles[workspaceRole.toLowerCase()];
    if (!role) throw new Error("That workspace role is not supported in preview mode.");
    const updatedSession: AuthSession = {
      ...session,
      user: { ...session.user, role, schoolName: membership.school.name },
      scope: "school",
      activeSchool: membership.school,
      workspaceRoles: membership.workspaceRoles,
      activeWorkspaceRole: role,
    };
    const storage = window.localStorage.getItem(SESSION_KEY)
      ? window.localStorage
      : window.sessionStorage;
    storage.setItem(SESSION_KEY, JSON.stringify(updatedSession));
    return updatedSession;
  }

  async requestPasswordReset(email: string): Promise<{ previewToken: string }> {
    await delay();
    if (!EMAIL_PATTERN.test(email)) {
      throw new Error("Enter a valid email address.");
    }
    const previewToken = window.crypto.randomUUID();
    window.localStorage.setItem(`${RESET_TOKEN_PREFIX}${email.toLowerCase()}`, previewToken);
    return { previewToken };
  }

  async resetPassword(input: PasswordResetInput): Promise<void> {
    await delay();
    const tokenKey = `${RESET_TOKEN_PREFIX}${input.email.toLowerCase()}`;
    if (!EMAIL_PATTERN.test(input.email) || input.password.length < 8 || !input.token) {
      throw new Error("Enter a valid email address and a password of at least 8 characters.");
    }
    if (window.localStorage.getItem(tokenKey) !== input.token) {
      throw new Error("This password reset link is invalid or has expired. Request a new link.");
    }
    window.localStorage.removeItem(tokenKey);
  }

  async signOut(): Promise<void> {
    window.localStorage.removeItem(SESSION_KEY);
    window.sessionStorage.removeItem(SESSION_KEY);
  }
}
