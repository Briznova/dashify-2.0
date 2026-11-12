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
    permissionKeys: [],
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

      if (["super_admin", "school_admin", "principal"].includes(role)) {
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

  it("does not render mock dashboard data in API mode before an aggregate exists", () => {
    mocks.isApiMode = true;
    mocks.useAuthSession.mockReturnValue({
      session: session("school_admin"),
      isLoading: false,
      error: null,
      refresh: vi.fn(),
    });

    render(<DashboardHome />);

    expect(screen.getByRole("status")).toHaveTextContent(
      "dashboard data is not connected yet",
    );
    expect(screen.queryByTestId("school-workspace")).not.toBeInTheDocument();
    expect(screen.queryByTestId("portal-workspace")).not.toBeInTheDocument();
  });
});
