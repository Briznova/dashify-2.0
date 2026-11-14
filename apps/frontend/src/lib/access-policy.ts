import type { UserRole } from "@/types/auth";
import type { IconName } from "@/components/ui/icon";
import { isPlatformPage, platformPages } from "@/lib/platform-pages";

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
  | "settings"
  | "platform-preview"
  | "teacher-attendance"
  | "teacher-results"
  | "teacher-assessments";

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
  "teacher-attendance": {
    permissions: ["teacher.attendance.read"],
    adapterReady: true,
  },
  "teacher-results": {
    permissions: ["teacher.results.read"],
    adapterReady: true,
  },
  "teacher-assessments": {
    permissions: ["teacher.assessments.read"],
    adapterReady: true,
  },
  "finance-overview": null,
  child: null,
  learning: null,
  settings: { permissions: ["school.read"], adapterReady: true },
  "platform-preview": { permissions: [], adapterReady: true },
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
const teacherAttendance: WorkspaceNavigationItem = {
  label: "Attendance",
  href: "/dashboard/teacher/attendance",
  icon: "calendarCheck",
  capability: "teacher-attendance",
};
const teacherResults: WorkspaceNavigationItem = {
  label: "Results",
  href: "/dashboard/teacher/results",
  icon: "graduationCap",
  capability: "teacher-results",
};
const teacherAssessments: WorkspaceNavigationItem = {
  label: "Assignments / Exam",
  href: "/dashboard/teacher/assessments",
  icon: "book",
  capability: "teacher-assessments",
};
const teacherNotices: WorkspaceNavigationItem = {
  label: "School notices",
  href: "/dashboard/announcements",
  icon: "bell",
  capability: "announcements",
};

const schoolNavigation = [
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

const platformNavigation: WorkspaceNavigationItem[] = [
  overview,
  schools,
  ...(["school-setup", "subscriptions", "billing", "users", "support", "audit-log", "settings"] as const).map(
    (key) => ({
      label: platformPages[key].title,
      href: `/dashboard/platform/${key}`,
      icon: platformPages[key].icon,
      capability: "platform-preview" as const,
    }),
  ),
];

export const rolePolicies = {
  super_admin: {
    homePath: "/dashboard",
    homeKind: "school",
    dataScope: "platform",
    capabilities: ["overview", "schools", "platform-preview"],
    navigation: platformNavigation,
    settingsEnabled: false,
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
      "fees",
      "academics",
      "analytics",
      "reports",
      "settings",
    ],
    navigation: schoolNavigation.filter((item) => item.capability !== "attendance"),
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
    navigation: schoolNavigation,
    settingsEnabled: true,
  },
  teacher: {
    homePath: "/dashboard/teacher",
    homeKind: "portal",
    dataScope: "assigned-classes",
    capabilities: [
      "teaching-day",
      "teacher-attendance",
      "teacher-results",
      "teacher-assessments",
      "announcements",
    ],
    navigation: [
      {
        label: "Home",
        href: "/dashboard/teacher",
        icon: "home",
        capability: "teaching-day",
      },
      teacherAttendance,
      teacherResults,
      teacherAssessments,
      teacherNotices,
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
  if (pathname === "/dashboard/schools/new") {
    return role === "super_admin" &&
      permissionKeys !== undefined &&
      permissionKeys.includes("platform.schools.read") &&
      permissionKeys.includes("platform.schools.create") &&
      permissionKeys.includes("platform.school-admins.create");
  }
  if (pathname.startsWith("/dashboard/platform/")) {
    const section = pathname.slice("/dashboard/platform/".length);
    return role === "super_admin" && isPlatformPage(section);
  }
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
  const homeHasChildRoutes = policy.navigation.some(({ href }) =>
    href.startsWith(`${policy.homePath}/`),
  );
  const matchingNavigation = policy.navigation.filter(
    ({ href }) =>
      normalizedPath === href ||
      (href !== "/dashboard" &&
        !(homeHasChildRoutes && href === policy.homePath) &&
        normalizedPath.startsWith(`${href}/`)),
  );
  const longestMatch = matchingNavigation.reduce(
    (longest, item) => Math.max(longest, item.href.length),
    0,
  );
  return matchingNavigation.some(
    (item) =>
      item.href.length === longestMatch &&
      isCapabilityAvailable(item.capability, permissionKeys),
  );
}

export function getWorkspaceHomeKind(
  role: unknown,
): RolePolicy["homeKind"] | undefined {
  return getRolePolicy(role)?.homeKind;
}
