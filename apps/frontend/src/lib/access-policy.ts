import type { UserRole } from "@/types/auth";
import type { IconName } from "@/components/ui/icon";

export type UiCapability =
  | "overview"
  | "schools"
  | "students"
  | "staff"
  | "announcements"
  | "classes"
  | "attendance"
  | "fees"
  | "academics"
  | "analytics"
  | "reports"
  | "teaching-day"
  | "finance-overview"
  | "child"
  | "learning"
  | "settings";

export type WorkspaceNavigationItem = {
  label: string;
  href: string;
  icon: IconName;
  capability: UiCapability;
};

export type RolePolicy = {
  homePath: string;
  homeKind: "school" | "portal";
  dataScope:
    | "platform"
    | "active-school"
    | "assigned-classes"
    | "linked-children"
    | "self";
  capabilities: readonly UiCapability[];
  navigation: readonly WorkspaceNavigationItem[];
  settingsEnabled: boolean;
};

const apiAccessByCapability: Record<
  UiCapability,
  { permissions: readonly string[]; adapterReady: boolean } | null
> = {
  overview: { permissions: [], adapterReady: true },
  schools: { permissions: ["platform.schools.read"], adapterReady: true },
  students: { permissions: ["students.read"], adapterReady: true },
  staff: { permissions: ["staff.read"], adapterReady: true },
  announcements: { permissions: ["announcements.read"], adapterReady: true },
  classes: {
    permissions: ["academic_structure.read"],
    adapterReady: true,
  },
  attendance: {
    permissions: ["attendance.read", "school.read"],
    adapterReady: true,
  },
  fees: null,
  academics: { permissions: ["academic_structure.read"], adapterReady: true },
  analytics: null,
  reports: { permissions: ["reports.read"], adapterReady: true },
  "teaching-day": {
    permissions: ["dashboard.teacher.read"],
    adapterReady: true,
  },
  "finance-overview": null,
  child: null,
  learning: null,
  settings: { permissions: ["school.read"], adapterReady: true },
};

const overview: WorkspaceNavigationItem = {
  label: "Overview",
  href: "/dashboard",
  icon: "layoutDashboard",
  capability: "overview",
};
const schools: WorkspaceNavigationItem = {
  label: "Schools",
  href: "/dashboard/schools",
  icon: "building",
  capability: "schools",
};
const students: WorkspaceNavigationItem = {
  label: "Students",
  href: "/dashboard/students",
  icon: "users",
  capability: "students",
};
const staff: WorkspaceNavigationItem = {
  label: "Staff",
  href: "/dashboard/staff",
  icon: "user",
  capability: "staff",
};
const announcements: WorkspaceNavigationItem = {
  label: "Announcements",
  href: "/dashboard/announcements",
  icon: "bell",
  capability: "announcements",
};
const classes: WorkspaceNavigationItem = {
  label: "Classes",
  href: "/dashboard/classes",
  icon: "book",
  capability: "classes",
};
const attendance: WorkspaceNavigationItem = {
  label: "Attendance",
  href: "/dashboard/attendance",
  icon: "calendarCheck",
  capability: "attendance",
};
const fees: WorkspaceNavigationItem = {
  label: "Fees",
  href: "/dashboard/fees",
  icon: "wallet",
  capability: "fees",
};
const academics: WorkspaceNavigationItem = {
  label: "Academics",
  href: "/dashboard/academics",
  icon: "graduationCap",
  capability: "academics",
};
const analytics: WorkspaceNavigationItem = {
  label: "Analytics",
  href: "/dashboard/analytics",
  icon: "chart",
  capability: "analytics",
};
const reports: WorkspaceNavigationItem = {
  label: "Reports",
  href: "/dashboard/reports",
  icon: "file",
  capability: "reports",
};

const schoolAdminNavigation = [
  overview,
  students,
  staff,
  classes,
  attendance,
  fees,
  academics,
  analytics,
  reports,
  announcements,
];

export const rolePolicies = {
  super_admin: {
    homePath: "/dashboard",
    homeKind: "school",
    dataScope: "platform",
    capabilities: [
      "overview",
      "schools",
      "students",
      "staff",
      "classes",
      "attendance",
      "fees",
      "academics",
      "analytics",
      "reports",
      "settings",
    ],
    navigation: [
      overview,
      schools,
      students,
      staff,
      classes,
      attendance,
      fees,
      academics,
      analytics,
      reports,
    ],
    settingsEnabled: true,
  },
  school_admin: {
    homePath: "/dashboard",
    homeKind: "school",
    dataScope: "active-school",
    capabilities: [
      "overview",
      "students",
      "staff",
      "announcements",
      "classes",
      "attendance",
      "fees",
      "academics",
      "analytics",
      "reports",
      "settings",
    ],
    navigation: schoolAdminNavigation,
    settingsEnabled: true,
  },
  principal: {
    homePath: "/dashboard",
    homeKind: "school",
    dataScope: "active-school",
    capabilities: [
      "overview",
      "students",
      "staff",
      "announcements",
      "classes",
      "attendance",
      "fees",
      "academics",
      "analytics",
      "reports",
      "settings",
    ],
    navigation: schoolAdminNavigation,
    settingsEnabled: true,
  },
  teacher: {
    homePath: "/dashboard/teacher",
    homeKind: "portal",
    dataScope: "assigned-classes",
    capabilities: [
      "overview",
      "teaching-day",
      "announcements",
      "classes",
      "attendance",
      "academics",
    ],
    navigation: [
      overview,
      {
        label: "My teaching day",
        href: "/dashboard/teacher",
        icon: "user",
        capability: "teaching-day",
      },
      classes,
      attendance,
      academics,
      announcements,
    ],
    settingsEnabled: false,
  },
  accountant: {
    homePath: "/dashboard/accountant",
    homeKind: "portal",
    dataScope: "active-school",
    capabilities: ["overview", "finance-overview", "fees", "reports"],
    navigation: [
      overview,
      {
        label: "Finance overview",
        href: "/dashboard/accountant",
        icon: "wallet",
        capability: "finance-overview",
      },
      fees,
      reports,
    ],
    settingsEnabled: false,
  },
  parent: {
    homePath: "/dashboard/parent",
    homeKind: "portal",
    dataScope: "linked-children",
    capabilities: ["overview", "child"],
    navigation: [
      overview,
      {
        label: "My child",
        href: "/dashboard/parent",
        icon: "home",
        capability: "child",
      },
    ],
    settingsEnabled: false,
  },
  student: {
    homePath: "/dashboard/student",
    homeKind: "portal",
    dataScope: "self",
    capabilities: ["overview", "learning", "academics"],
    navigation: [
      overview,
      {
        label: "My learning",
        href: "/dashboard/student",
        icon: "graduationCap",
        capability: "learning",
      },
      academics,
    ],
    settingsEnabled: false,
  },
} satisfies Record<UserRole, RolePolicy>;

const dashboardAliases: Readonly<Record<string, string>> = {
  "/dashboard/customers": "/dashboard/students",
  "/dashboard/projects": "/dashboard/classes",
};

export function getRolePolicy(role: unknown): RolePolicy | undefined {
  if (
    typeof role !== "string" ||
    !Object.prototype.hasOwnProperty.call(rolePolicies, role)
  ) {
    return undefined;
  }
  return rolePolicies[role as UserRole];
}

export function isCapabilityAvailable(
  capability: UiCapability,
  permissionKeys?: readonly string[],
): boolean {
  if (permissionKeys === undefined) return true;
  const apiAccess = apiAccessByCapability[capability];
  return (
    apiAccess !== null &&
    apiAccess.adapterReady &&
    apiAccess.permissions.every((permission) =>
      permissionKeys.includes(permission),
    )
  );
}

export function getRoleNavigation(
  role: unknown,
  permissionKeys?: readonly string[],
): readonly WorkspaceNavigationItem[] {
  const policy = getRolePolicy(role);
  return (
    policy?.navigation.filter(({ capability }) =>
      isCapabilityAvailable(capability, permissionKeys),
    ) ?? []
  );
}

export function getDashboardRoute(role: unknown): string {
  return getRolePolicy(role)?.homePath ?? "/auth/sign-in";
}

export function isDashboardRouteAllowed(
  pathname: string,
  role: unknown,
  permissionKeys?: readonly string[],
): boolean {
  const policy = getRolePolicy(role);
  if (!policy) return false;
  if (
    permissionKeys !== undefined &&
    /^\/dashboard\/students\/[^/]+\/edit$/.test(pathname)
  ) {
    return false;
  }
  if (
    permissionKeys !== undefined &&
    pathname === "/dashboard/students/new" &&
    (!isCapabilityAvailable("students", permissionKeys) ||
      !permissionKeys.includes("students.create") ||
      !permissionKeys.includes("academic_structure.read"))
  ) {
    return false;
  }
  if (pathname === policy.homePath) return true;
  if (pathname === "/dashboard/settings") {
    return (
      policy.settingsEnabled &&
      isCapabilityAvailable("settings", permissionKeys)
    );
  }

  const normalizedPath = dashboardAliases[pathname] ?? pathname;
  return getRoleNavigation(role, permissionKeys).some(
    ({ href }) =>
      normalizedPath === href ||
      (href !== "/dashboard" && normalizedPath.startsWith(`${href}/`)),
  );
}

export function getWorkspaceHomeKind(
  role: unknown,
): RolePolicy["homeKind"] | undefined {
  return getRolePolicy(role)?.homeKind;
}
