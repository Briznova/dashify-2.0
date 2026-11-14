import {
  fireEvent,
  render,
  renderHook,
  screen,
  waitFor,
} from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AuthSession } from "@/types/auth";

const mocks = vi.hoisted(() => ({
  authService: {
    getSession: vi.fn(),
    signIn: vi.fn(),
    signUp: vi.fn(),
    selectSchool: vi.fn(),
    requestPasswordReset: vi.fn(),
    resetPassword: vi.fn(),
    changePassword: vi.fn(),
    signOut: vi.fn(),
  },
  router: {
    push: vi.fn(),
    refresh: vi.fn(),
    replace: vi.fn(),
  },
}));

vi.mock("@/services", () => ({
  authService: mocks.authService,
  isApiMode: true,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => mocks.router,
  usePathname: () => "/dashboard",
}));

vi.mock("next/link", async () => {
  const React = await import("react");
  return {
    default: React.forwardRef<
      HTMLAnchorElement,
      React.ComponentPropsWithoutRef<"a">
    >(function MockLink(props, ref) {
      return React.createElement("a", { ...props, ref });
    }),
  };
});

import { AuthFlow } from "@/components/auth-flow";
import { DashboardShell } from "@/components/dashboard-shell";
import { useAuthSession } from "@/hooks/use-auth";

function session(
  role: AuthSession["user"]["role"] = null,
  memberships: AuthSession["memberships"] = [
    {
      membershipId: "membership-1",
      school: { id: "school-1", name: "North School" },
      workspaceRoles: ["school_admin"],
    },
  ],
  permissionKeys: string[] = role ? ["school.read"] : [],
): AuthSession {
  return {
    user: {
      id: "user-1",
      name: "Avery Johnson",
      email: "avery@example.test",
      role,
      schoolName: role ? "North School" : null,
    },
    scope: role ? "school" : "school-selection",
    memberships,
    activeSchool: role ? { id: "school-1", name: "North School" } : null,
    workspaceRoles: role ? [role] : [],
    activeWorkspaceRole: role,
    permissionKeys,
  };
}

describe("auth session and workspace UI", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("restores a browser session and exits the loading state", async () => {
    mocks.authService.getSession.mockResolvedValueOnce(session());

    const { result } = renderHook(() => useAuthSession());
    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    expect(result.current.session?.user.id).toBe("user-1");
    expect(result.current.error).toBeNull();
  });

  it("surfaces session restore failures and supports retry", async () => {
    mocks.authService.getSession
      .mockRejectedValueOnce(new Error("Session service unavailable"))
      .mockResolvedValueOnce(session());

    render(<AuthFlow mode="select-workspace" />);
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Session service unavailable",
    );

    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(
      await screen.findByRole("heading", { name: "Choose your workspace" }),
    ).toBeInTheDocument();
  });

  it("redirects an absent session to sign in", async () => {
    mocks.authService.getSession.mockResolvedValueOnce(null);

    render(<AuthFlow mode="select-workspace" />);

    await waitFor(() => {
      expect(mocks.router.replace).toHaveBeenCalledWith("/auth/sign-in");
    });
    expect(screen.getByRole("status")).toHaveTextContent(
      "Redirecting to sign in",
    );
  });

  it("selects the chosen school and workspace, then opens the role route", async () => {
    const memberships = [
      {
        membershipId: "membership-1",
        school: { id: "school-1", name: "North School" },
        workspaceRoles: ["school_admin"],
      },
      {
        membershipId: "membership-2",
        school: { id: "school-2", name: "South School" },
        workspaceRoles: ["teacher", "accountant"],
      },
    ];
    mocks.authService.getSession.mockResolvedValueOnce(
      session(null, memberships),
    );
    mocks.authService.selectSchool.mockResolvedValueOnce(session("teacher"));

    render(<AuthFlow mode="select-workspace" />);

    await screen.findByRole("heading", { name: "Choose your workspace" });
    fireEvent.change(screen.getByLabelText("School"), {
      target: { value: "membership-2" },
    });
    fireEvent.change(screen.getByLabelText("Workspace"), {
      target: { value: "teacher" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));

    await waitFor(() => {
      expect(mocks.authService.selectSchool).toHaveBeenCalledWith(
        "school-2",
        "teacher",
      );
      expect(mocks.router.push).toHaveBeenCalledWith("/dashboard/teacher");
      expect(mocks.router.refresh).toHaveBeenCalled();
    });
  });

  it("shows a school-selection failure without navigating", async () => {
    mocks.authService.getSession.mockResolvedValueOnce(session());
    mocks.authService.selectSchool.mockRejectedValueOnce(
      new Error("Workspace selection failed"),
    );

    render(<AuthFlow mode="select-workspace" />);
    await screen.findByRole("heading", { name: "Choose your workspace" });
    fireEvent.change(screen.getByLabelText("School"), {
      target: { value: "membership-1" },
    });
    fireEvent.change(screen.getByLabelText("Workspace"), {
      target: { value: "school_admin" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Workspace selection failed",
    );
    expect(mocks.router.push).not.toHaveBeenCalled();
  });

  it("auto-selects a single membership after API sign-in", async () => {
    mocks.authService.signIn.mockResolvedValueOnce(session());
    mocks.authService.selectSchool.mockResolvedValueOnce(
      session("school_admin"),
    );

    render(<AuthFlow mode="sign-in" />);
    fireEvent.change(screen.getByLabelText("Work email"), {
      target: { value: "avery@example.test" },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "example-password" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));

    await waitFor(() => {
      expect(mocks.authService.selectSchool).toHaveBeenCalledWith(
        "school-1",
        "school_admin",
      );
      expect(mocks.router.push).toHaveBeenCalledWith("/dashboard");
    });
  });

  it("fills configured local credentials when a development account is selected", () => {
    render(
      <AuthFlow
        mode="sign-in"
        devLoginAccounts={[
          {
            role: "School Admin (local)",
            email: "school-admin@local.test",
            password: "local-only-password",
          },
          {
            role: "Teacher (local)",
            email: "teacher@local.test",
            password: "teacher-only-password",
          },
        ]}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Teacher (local)" }));

    expect(screen.getByLabelText("Work email")).toHaveValue(
      "teacher@local.test",
    );
    expect(screen.getByLabelText("Password")).toHaveValue(
      "teacher-only-password",
    );
  });

  it("keeps the dashboard open and displays an error when logout fails", async () => {
    mocks.authService.getSession.mockResolvedValueOnce(session("school_admin"));
    mocks.authService.signOut.mockRejectedValueOnce(
      new Error("Could not revoke session"),
    );

    render(
      <DashboardShell>
        <p>Dashboard content</p>
      </DashboardShell>,
    );
    fireEvent.click(
      await screen.findByRole("button", { name: "Signed in as Avery Johnson" }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Sign out" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Could not revoke session",
    );
    expect(mocks.router.push).not.toHaveBeenCalledWith("/auth/sign-in");
    expect(screen.getByText("Dashboard content")).toBeInTheDocument();
  });

  it("validates and changes the password from the account popup", async () => {
    mocks.authService.getSession.mockResolvedValueOnce(session("school_admin"));
    mocks.authService.changePassword
      .mockRejectedValueOnce(new Error("Current password is incorrect."))
      .mockResolvedValueOnce(undefined);

    render(<DashboardShell><p>Dashboard content</p></DashboardShell>);
    fireEvent.click(await screen.findByRole("button", { name: "Open Avery Johnson profile" }));
    fireEvent.click(screen.getByRole("button", { name: "Change password" }));
    expect(screen.getByLabelText("Current password")).toHaveFocus();
    fireEvent.change(screen.getByLabelText("Current password"), { target: { value: "synthetic-old-password" } });
    fireEvent.change(screen.getByLabelText("New password"), { target: { value: "synthetic-new-password" } });
    fireEvent.change(screen.getByLabelText("Confirm new password"), { target: { value: "different-password" } });
    fireEvent.click(screen.getByRole("button", { name: "Change password" }));
    expect(screen.getByRole("alert")).toHaveTextContent("New passwords do not match.");
    expect(mocks.authService.changePassword).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText("Confirm new password"), { target: { value: "synthetic-new-password" } });
    fireEvent.click(screen.getByRole("button", { name: "Change password" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Current password is incorrect.");
    fireEvent.click(screen.getByRole("button", { name: "Change password" }));
    expect(await screen.findByRole("status")).toHaveTextContent("other sessions have been signed out");
    expect(mocks.authService.changePassword).toHaveBeenLastCalledWith({
      currentPassword: "synthetic-old-password",
      newPassword: "synthetic-new-password",
    });
    expect(screen.queryByLabelText("Current password")).not.toBeInTheDocument();
    expect(mocks.router.push).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Done" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Change password" })).toHaveFocus());
  });

  it("shows integrated API navigation and hides unintegrated navigation and demo notifications", async () => {
    mocks.authService.getSession.mockResolvedValueOnce(
      session("school_admin", undefined, [
        "students.read",
        "academic_structure.read",
        "attendance.read",
        "school.read",
        "school.update",
      ]),
    );

    render(
      <DashboardShell>
        <p>Dashboard content</p>
      </DashboardShell>,
    );

    expect(await screen.findByRole("link", { name: "Overview" })).toBeVisible();
    expect(screen.queryByText("23")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Students" })).toBeVisible();
    expect(screen.getByRole("link", { name: "Classes" })).toBeVisible();
    expect(screen.queryByRole("link", { name: "Attendance" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Academics" })).toBeVisible();
    expect(
      screen.queryByRole("link", { name: "Staff" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "Fees" }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Settings" })).toBeVisible();
    expect(
      screen.queryByRole("button", { name: "Notifications" }),
    ).not.toBeInTheDocument();
  });
});
