import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AuthSession, UserRole } from "@/types/auth";

const mocks = vi.hoisted(() => ({
  useAuthSession: vi.fn(),
  isApiMode: false,
}));

vi.mock("@/hooks/use-auth", () => ({
  useAuthSession: mocks.useAuthSession,
}));

vi.mock("@/services", () => ({
  get isApiMode() {
    return mocks.isApiMode;
  },
}));

vi.mock("next/link", async () => {
  const React = await import("react");
  return {
    default: ({ children, ...props }: React.ComponentPropsWithoutRef<"a">) =>
      React.createElement("a", props, children),
  };
});

vi.mock("@/components/school-extras", async () => {
  const React = await import("react");
  return {
    PortalDashboard: ({ role }: { role: string }) =>
      React.createElement("div", {
        "data-testid": "portal-workspace",
        "data-role": role,
      }),
  };
});

vi.mock("@/components/school-dashboard", async () => {
  const React = await import("react");
  return {
    SchoolDashboardView: ({
      role,
      userName,
    }: {
      role: string;
      userName: string;
    }) =>
      React.createElement("div", {
        "data-testid": "school-workspace",
        "data-role": role,
        "data-user-name": userName,
      }),
  };
});

vi.mock("@/components/teacher-dashboard", async () => {
  const React = await import("react");
  return {
    TeacherDashboardView: ({ userName }: { userName: string }) =>
      React.createElement("div", {
        "data-testid": "teacher-workspace",
        "data-user-name": userName,
      }),
  };
});

vi.mock("@/components/platform-schools-directory", async () => {
  const React = await import("react");
  return {
    PlatformSchoolsDirectory: () =>
      React.createElement("div", { "data-testid": "platform-schools" }),
  };
});

import { DashboardHome } from "@/components/dashboard-home";

const roles: UserRole[] = [
  "super_admin",
  "school_admin",
  "principal",
  "teacher",
  "accountant",
  "parent",
  "student",
];

function session(role: UserRole): AuthSession {
  return {
    user: {
      id: "user-1",
      name: "Avery Johnson",
      email: "avery@example.test",
      role,
      schoolName: role === "super_admin" ? null : "North School",
    },
    scope: role === "super_admin" ? "platform" : "school",
    memberships: [],
    activeSchool:
      role === "super_admin" ? null : { id: "school-1", name: "North School" },
    workspaceRoles: [role],
    activeWorkspaceRole: role,
    permissionKeys: role === "super_admin" ? ["platform.schools.read"] : [],
  };
}

describe("dashboard home composition", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.isApiMode = false;
  });

  it.each(roles)(
    "renders the approved dashboard composition for %s",
    (role) => {
      mocks.useAuthSession.mockReturnValue({
        session: session(role),
        isLoading: false,
        error: null,
        refresh: vi.fn(),
      });

      render(<DashboardHome />);

      if (role === "super_admin") {
        expect(screen.getByTestId("platform-schools")).toBeInTheDocument();
      } else if (["school_admin", "principal"].includes(role)) {
        expect(screen.getByTestId("school-workspace")).toHaveAttribute(
          "data-role",
          role,
        );
        expect(screen.getByTestId("school-workspace")).toHaveAttribute(
          "data-user-name",
          "Avery Johnson",
        );
      } else {
        expect(screen.getByTestId("portal-workspace")).toHaveAttribute(
          "data-role",
          role,
        );
      }
    },
  );

  it("renders the school-admin dashboard in API mode", () => {
    mocks.isApiMode = true;
    mocks.useAuthSession.mockReturnValue({
      session: session("school_admin"),
      isLoading: false,
      error: null,
      refresh: vi.fn(),
    });

    render(<DashboardHome />);

    expect(screen.getByTestId("school-workspace")).toHaveAttribute(
      "data-role",
      "school_admin",
    );
    expect(screen.queryByTestId("portal-workspace")).not.toBeInTheDocument();
  });

  it("renders the principal dashboard in API mode", () => {
    mocks.isApiMode = true;
    mocks.useAuthSession.mockReturnValue({
      session: session("principal"),
      isLoading: false,
      error: null,
      refresh: vi.fn(),
    });

    render(<DashboardHome />);

    expect(screen.getByTestId("school-workspace")).toHaveAttribute(
      "data-role",
      "principal",
    );
    expect(screen.queryByTestId("portal-workspace")).not.toBeInTheDocument();
  });

  it("renders the teacher dashboard in API mode", () => {
    mocks.isApiMode = true;
    mocks.useAuthSession.mockReturnValue({
      session: session("teacher"),
      isLoading: false,
      error: null,
      refresh: vi.fn(),
    });

    render(<DashboardHome />);

    expect(screen.getByTestId("teacher-workspace")).toHaveAttribute(
      "data-user-name",
      "Avery Johnson",
    );
    expect(screen.queryByTestId("portal-workspace")).not.toBeInTheDocument();
  });

  it("renders the platform school directory in API mode", () => {
    mocks.isApiMode = true;
    mocks.useAuthSession.mockReturnValue({
      session: session("super_admin"),
      isLoading: false,
      error: null,
      refresh: vi.fn(),
    });

    render(<DashboardHome />);

    expect(screen.getByTestId("platform-schools")).toBeInTheDocument();
    expect(screen.queryByTestId("school-workspace")).not.toBeInTheDocument();
    expect(screen.queryByTestId("portal-workspace")).not.toBeInTheDocument();
  });

  it("does not render the platform directory without its server permission", () => {
    mocks.isApiMode = true;
    const platformSession = session("super_admin");
    platformSession.permissionKeys = [];
    mocks.useAuthSession.mockReturnValue({
      session: platformSession,
      isLoading: false,
      error: null,
      refresh: vi.fn(),
    });

    render(<DashboardHome />);

    expect(screen.getByRole("alert")).toHaveTextContent(
      "This platform session does not have school-directory access.",
    );
    expect(screen.queryByTestId("platform-schools")).not.toBeInTheDocument();
  });
});
