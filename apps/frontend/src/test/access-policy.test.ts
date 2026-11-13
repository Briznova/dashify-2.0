import { describe, expect, it } from "vitest";
import {
  getRoleNavigation,
  getRolePolicy,
  getWorkspaceHomeKind,
  isDashboardRouteAllowed,
} from "@/lib/access-policy";
import { getDashboardRoute } from "@/lib/dashboard-route";
import type { UserRole } from "@/types/auth";

const expected: Record<
  UserRole,
  {
    home: string;
    kind: "school" | "portal";
    dataScope:
      | "platform"
      | "active-school"
      | "assigned-classes"
      | "linked-children"
      | "self";
    navigation: string[];
    settings: boolean;
  }
> = {
  super_admin: {
    home: "/dashboard",
    kind: "school",
    dataScope: "platform",
    navigation: [
      "Overview",
      "Schools",
      "School setup and CSV import",
      "Subscriptions",
      "Billing and invoices",
      "Platform users",
      "Support",
      "Audit log",
      "Platform settings",
    ],
    settings: false,
  },
  school_admin: {
    home: "/dashboard",
    kind: "school",
    dataScope: "active-school",
    navigation: [
      "Overview",
      "Students",
      "Staff",
      "Classes",
      "Attendance",
      "Fees",
      "Academics",
      "Analytics",
      "Reports",
      "Announcements",
    ],
    settings: true,
  },
  principal: {
    home: "/dashboard",
    kind: "school",
    dataScope: "active-school",
    navigation: [
      "Overview",
      "Students",
      "Staff",
      "Classes",
      "Attendance",
      "Fees",
      "Academics",
      "Analytics",
      "Reports",
      "Announcements",
    ],
    settings: true,
  },
  teacher: {
    home: "/dashboard/teacher",
    kind: "portal",
    dataScope: "assigned-classes",
    navigation: [
      "Overview",
      "My teaching day",
      "Classes",
      "Attendance",
      "Academics",
      "Announcements",
    ],
    settings: false,
  },
  accountant: {
    home: "/dashboard/accountant",
    kind: "portal",
    dataScope: "active-school",
    navigation: ["Overview", "Finance overview", "Fees", "Reports"],
    settings: false,
  },
  parent: {
    home: "/dashboard/parent",
    kind: "portal",
    dataScope: "linked-children",
    navigation: ["Overview", "My child"],
    settings: false,
  },
  student: {
    home: "/dashboard/student",
    kind: "portal",
    dataScope: "self",
    navigation: ["Overview", "My learning", "Academics"],
    settings: false,
  },
};

describe("role access policy", () => {
  it.each(
    Object.entries(expected) as [UserRole, (typeof expected)[UserRole]][],
  )("keeps %s on its approved baseline workspace", (role, baseline) => {
    const policy = getRolePolicy(role);
    expect(policy).toBeDefined();
    expect(getDashboardRoute(role)).toBe(baseline.home);
    expect(getWorkspaceHomeKind(role)).toBe(baseline.kind);
    expect(policy?.dataScope).toBe(baseline.dataScope);
    expect(isDashboardRouteAllowed(baseline.home, role)).toBe(true);
    expect(policy?.navigation.map((item) => item.label)).toEqual(
      baseline.navigation,
    );
    expect(
      policy?.navigation.every((item) =>
        policy.capabilities.includes(item.capability),
      ),
    ).toBe(true);
    expect(policy?.settingsEnabled).toBe(baseline.settings);
  });

  it.each([
    ["teacher", "/dashboard/teacher"],
    ["teacher", "/dashboard/academics/assignments"],
    ["accountant", "/dashboard/fees/invoices"],
    ["parent", "/dashboard/parent/attendance"],
    ["student", "/dashboard/student/assignments"],
  ] as const)("allows %s to use permitted nested route %s", (role, path) => {
    expect(isDashboardRouteAllowed(path, role)).toBe(true);
  });

  it.each([
    ["teacher", "/dashboard/settings"],
    ["student", "/dashboard/fees"],
    ["parent", "/dashboard/students"],
    ["accountant", "/dashboard/attendance"],
    ["principal", "/dashboard/schools"],
    ["teacher", "/dashboard/settings/profile"],
  ] as const)("denies %s the unlisted route %s", (role, path) => {
    expect(isDashboardRouteAllowed(path, role)).toBe(false);
  });

  it.each(["school_admin", "principal"] as const)(
    "allows %s to open workspace settings",
    (role) => {
      expect(isDashboardRouteAllowed("/dashboard/settings", role)).toBe(true);
    },
  );

  it.each(["super_admin", "teacher", "accountant", "parent", "student"] as const)(
    "denies %s access to workspace settings",
    (role) => {
      expect(isDashboardRouteAllowed("/dashboard/settings", role)).toBe(false);
    },
  );

  it.each([
    ["school_admin", "/dashboard/customers"],
    ["teacher", "/dashboard/projects"],
  ] as const)("preserves the %s compatibility alias %s", (role, path) => {
    expect(isDashboardRouteAllowed(path, role)).toBe(true);
  });

  it("fails closed for unknown or malformed roles", () => {
    expect(getRolePolicy("unknown")).toBeUndefined();
    expect(getRolePolicy(null)).toBeUndefined();
    expect(isDashboardRouteAllowed("/dashboard", "unknown")).toBe(false);
    expect(getDashboardRoute("unknown")).toBe("/auth/sign-in");
    expect(getWorkspaceHomeKind("unknown")).toBeUndefined();
  });

  it("preserves mock navigation when no API permission set is supplied", () => {
    expect(getRoleNavigation("school_admin").map((item) => item.label)).toEqual(
      expected.school_admin.navigation,
    );
    expect(isDashboardRouteAllowed("/dashboard/settings", "school_admin")).toBe(
      true,
    );
  });

  it("exposes only implemented API capabilities with their required permissions", () => {
    const permissionKeys = [
      "students.read",
      "academic_structure.read",
      "attendance.read",
      "school.read",
    ];

    expect(
      getRoleNavigation("school_admin", permissionKeys).map(
        (item) => item.capability,
      ),
    ).toEqual(["overview", "students", "classes", "attendance", "academics"]);
    expect(
      getRoleNavigation("school_admin", [...permissionKeys, "staff.read"]).map(
        (item) => item.capability,
      ),
    ).toContain("staff");
    expect(
      isDashboardRouteAllowed(
        "/dashboard/staff",
        "school_admin",
        [...permissionKeys, "staff.read"],
      ),
    ).toBe(true);
    expect(
      isDashboardRouteAllowed(
        "/dashboard/classes/sections",
        "school_admin",
        permissionKeys,
      ),
    ).toBe(true);
    expect(isDashboardRouteAllowed("/dashboard/students", "school_admin", permissionKeys)).toBe(true);
    expect(isDashboardRouteAllowed("/dashboard/students/new", "school_admin", permissionKeys)).toBe(false);
    expect(isDashboardRouteAllowed("/dashboard/students/new", "school_admin", [
      ...permissionKeys,
      "students.create",
    ])).toBe(true);
    expect(isDashboardRouteAllowed("/dashboard/students/new", "school_admin", [
      "students.read",
      "students.create",
    ])).toBe(false);
    expect(
      isDashboardRouteAllowed("/dashboard/classes", "school_admin", [
        "students.read",
      ]),
    ).toBe(false);
    expect(
      isDashboardRouteAllowed(
        "/dashboard/attendance",
        "school_admin",
        permissionKeys,
      ),
    ).toBe(true);
    expect(
      isDashboardRouteAllowed(
        "/dashboard/fees",
        "school_admin",
        permissionKeys,
      ),
    ).toBe(false);
    expect(
      isDashboardRouteAllowed("/dashboard/settings", "school_admin", [
        ...permissionKeys,
        "school.update",
      ]),
    ).toBe(true);
  });

  it("limits platform navigation to the platform-school permission", () => {
    expect(getRoleNavigation("super_admin", []).map((item) => item.capability))
      .toEqual(["overview", ...Array(7).fill("platform-preview")]);
    expect(
      getRoleNavigation("super_admin", ["platform.schools.read"]).map(
        (item) => item.capability,
      ),
    ).toEqual(["overview", "schools", ...Array(7).fill("platform-preview")]);
    expect(
      isDashboardRouteAllowed(
        "/dashboard/schools",
        "super_admin",
        ["platform.schools.read"],
      ),
    ).toBe(true);
    expect(
      isDashboardRouteAllowed(
        "/dashboard/students",
        "super_admin",
        ["platform.schools.read"],
      ),
    ).toBe(false);
    expect(isDashboardRouteAllowed("/dashboard/platform/support-detail", "super_admin", [])).toBe(true);
    expect(isDashboardRouteAllowed("/dashboard/platform/support-detail", "school_admin", ["platform.schools.read"])).toBe(false);
    expect(isDashboardRouteAllowed("/dashboard/platform/unknown", "super_admin", [])).toBe(false);
    expect(isDashboardRouteAllowed("/dashboard/platform/support/detail", "super_admin", [])).toBe(false);
    expect(
      isDashboardRouteAllowed(
        "/dashboard/schools",
        "school_admin",
        ["platform.schools.read"],
      ),
    ).toBe(false);
  });

  it("keeps the assigned workspace home reachable when its aggregate API is unavailable", () => {
    expect(
      getRoleNavigation("teacher", []).map((item) => item.capability),
    ).toEqual(["overview"]);
    expect(isDashboardRouteAllowed("/dashboard/teacher", "teacher", [])).toBe(
      true,
    );
    expect(
      isDashboardRouteAllowed("/dashboard/teacher/assignments", "teacher", []),
    ).toBe(false);
  });

  it("shows the Teacher teaching-day navigation only with its dashboard permission", () => {
    expect(
      getRoleNavigation("teacher", []).map((item) => item.capability),
    ).not.toContain("teaching-day");
    expect(
      getRoleNavigation("teacher", ["dashboard.teacher.read"]).map(
        (item) => item.capability,
      ),
    ).toContain("teaching-day");
  });

  it("exposes reports in API mode only when reports.read is granted", () => {
    expect(
      getRoleNavigation("school_admin", ["reports.read"]).map(
        (item) => item.capability,
      ),
    ).toContain("reports");
    expect(
      isDashboardRouteAllowed("/dashboard/reports", "school_admin", [
        "reports.read",
      ]),
    ).toBe(true);
    expect(
      isDashboardRouteAllowed("/dashboard/reports", "school_admin", []),
    ).toBe(false);
  });

  it("exposes announcements only when announcements.read is granted", () => {
    expect(
      getRoleNavigation("school_admin", []).map((item) => item.capability),
    ).not.toContain("announcements");
    expect(
      getRoleNavigation("school_admin", ["announcements.read"]).map(
        (item) => item.capability,
      ),
    ).toContain("announcements");
    expect(
      getRoleNavigation("teacher", ["announcements.read"]).map(
        (item) => item.capability,
      ),
    ).toContain("announcements");
  });

  it("requires student permissions for list, create, and edit pages", () => {
    const readOnlyPermissions = ["students.read"];
    expect(
      isDashboardRouteAllowed(
        "/dashboard/students/123",
        "school_admin",
        readOnlyPermissions,
      ),
    ).toBe(true);
    expect(
      isDashboardRouteAllowed("/dashboard/students/new", "school_admin", [
        ...readOnlyPermissions,
        "students.create",
        "academic_structure.read",
      ]),
    ).toBe(true);
    expect(
      isDashboardRouteAllowed("/dashboard/students/123/edit", "school_admin", [
        ...readOnlyPermissions,
        "students.update",
      ]),
    ).toBe(false);
    expect(
      isDashboardRouteAllowed("/dashboard/students/new", "school_admin"),
    ).toBe(true);
  });
});
