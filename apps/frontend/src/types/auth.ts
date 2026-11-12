export type UserRole =
  | "super_admin"
  | "school_admin"
  | "principal"
  | "teacher"
  | "accountant"
  | "parent"
  | "student";

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  role: UserRole | null;
  schoolName: string | null;
};

export type AuthMembership = {
  membershipId: string;
  school: {
    id: string;
    name: string;
  };
  workspaceRoles: string[];
};

export type AuthSession = {
  user: AuthUser;
  scope: "platform" | "school-selection" | "school";
  memberships: AuthMembership[];
  activeSchool: { id: string; name: string } | null;
  workspaceRoles: string[];
  activeWorkspaceRole: string | null;
  permissionKeys: string[];
};

export type SignInInput = {
  email: string;
  password: string;
  rememberMe: boolean;
};

export type SignUpInput = {
  name: string;
  email: string;
  password: string;
  schoolName: string;
};

export type PasswordResetInput = {
  token: string;
  email: string;
  password: string;
};
