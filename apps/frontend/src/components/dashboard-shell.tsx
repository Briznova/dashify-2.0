"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import styles from "./dashboard-shell.module.css";
import { useAuth, useAuthSession } from "@/hooks/use-auth";
import {
  getRoleNavigation,
  getRolePolicy,
  isCapabilityAvailable,
  isDashboardRouteAllowed,
  type WorkspaceNavigationItem,
} from "@/lib/access-policy";
import { getDashboardRoute } from "@/lib/dashboard-route";
import { isPlatformPage, platformPages } from "@/lib/platform-pages";
import { isApiMode } from "@/services";
import type { UserRole } from "@/types/auth";
import { Icon } from "./ui/icon";

function Logo() {
  return (
    <span className={styles.brand}>
      <span className={styles.logoMark} aria-hidden="true">
        <i />
        <i />
        <i />
        <i />
      </span>
      <span>dashify</span>
    </span>
  );
}

function formatRole(role: UserRole) {
  return role
    .split("_")
    .map((word) => word[0].toUpperCase() + word.slice(1))
    .join(" ");
}

const notificationsByRole: Record<
  UserRole,
  { title: string; detail: string; href: string; action: string }[]
> = {
  super_admin: [
    {
      title: "School setup needs attention",
      detail: "Summit Preparatory has onboarding steps to complete.",
      href: "/dashboard/schools",
      action: "Review school",
    },
    {
      title: "Network attendance improved",
      detail: "Average attendance is up 1.2% this term.",
      href: "/dashboard/analytics",
      action: "View analytics",
    },
  ],
  school_admin: [
    {
      title: "Attendance follow-up",
      detail: "Two students are below the 90% attendance target.",
      href: "/dashboard/attendance",
      action: "Review attendance",
    },
    {
      title: "Enrollment requests",
      detail: "Three student applications are waiting for review.",
      href: "/dashboard/students",
      action: "Review requests",
    },
    {
      title: "Fee collection",
      detail: "Open invoices need follow-up this week.",
      href: "/dashboard/fees",
      action: "View fees",
    },
  ],
  principal: [
    {
      title: "Attendance watch",
      detail: "Review this week’s school attendance trend.",
      href: "/dashboard/attendance",
      action: "View attendance",
    },
    {
      title: "Academic reports",
      detail: "Term performance reports are ready to review.",
      href: "/dashboard/analytics",
      action: "Open reports",
    },
  ],
  teacher: [
    {
      title: "Assignments to grade",
      detail: "18 submissions are waiting for review.",
      href: "/dashboard/academics",
      action: "Review work",
    },
    {
      title: "Class register incomplete",
      detail: "Grade 7 · Section B attendance is not complete.",
      href: "/dashboard/attendance",
      action: "Complete register",
    },
  ],
  accountant: [
    {
      title: "Receipts to reconcile",
      detail: "Seven payment receipts need to be matched.",
      href: "/dashboard/fees",
      action: "Reconcile receipts",
    },
    {
      title: "Overdue balances",
      detail: "Some family invoices need follow-up.",
      href: "/dashboard/fees",
      action: "Review balances",
    },
  ],
  parent: [
    {
      title: "Assignment due soon",
      detail: "Linear equations practice is due Nov 08.",
      href: "/dashboard/parent",
      action: "View child updates",
    },
    {
      title: "School update",
      detail: "A parent–teacher conference is coming up.",
      href: "/dashboard/parent",
      action: "View school updates",
    },
  ],
  student: [
    {
      title: "Assignment due soon",
      detail: "Linear equations practice is due Nov 08.",
      href: "/dashboard/student",
      action: "View assignments",
    },
    {
      title: "Next class",
      detail: "Science begins at 10:15 in Lab 2.",
      href: "/dashboard/student",
      action: "View timetable",
    },
  ],
};

export function DashboardShell({
  children,
}: Readonly<{ children: ReactNode }>) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [notificationsRead, setNotificationsRead] = useState(false);
  const { signOut, isPending, error: signOutError } = useAuth();
  const {
    session,
    isLoading: isSessionLoading,
    error: sessionError,
    refresh,
  } = useAuthSession();
  const userRole = session?.user.role;
  const rolePolicy = getRolePolicy(userRole);
  const permissionKeys = isApiMode ? session?.permissionKeys : undefined;
  const navigation: readonly WorkspaceNavigationItem[] = getRoleNavigation(
    userRole,
    permissionKeys,
  );
  const settingsAvailable =
    rolePolicy?.settingsEnabled &&
    isCapabilityAvailable("settings", permissionKeys);
  const platformSection = pathname.startsWith("/dashboard/platform/")
    ? pathname.slice("/dashboard/platform/".length)
    : "";
  const breadcrumbLabel =
    pathname === "/dashboard/settings"
      ? "Settings"
      : pathname === "/dashboard/customers"
        ? "Students"
        : pathname === "/dashboard/projects"
          ? "Classes"
          : isPlatformPage(platformSection)
            ? platformPages[platformSection].title
            : (navigation.find(
              (item) =>
                pathname === item.href ||
                (item.href !== "/dashboard" &&
                  pathname.startsWith(`${item.href}/`)),
            )?.label ?? "Overview");

  useEffect(() => {
    if (!isSessionLoading && !session && !sessionError) {
      router.replace("/auth/sign-in");
    } else if (session && !session.user.role) {
      router.replace("/auth/select-workspace");
    } else if (
      session?.user.role &&
      !isDashboardRouteAllowed(
        pathname,
        session.user.role,
        isApiMode ? session.permissionKeys : undefined,
      )
    ) {
      router.replace(getDashboardRoute(session.user.role));
    }
  }, [isSessionLoading, pathname, router, session, sessionError]);

  useEffect(() => {
    function handleShortcut(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setNotificationsOpen(false);
        setProfileOpen(false);
      }
    }

    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, []);

  async function handleSignOut() {
    const succeeded = await signOut();
    if (succeeded) router.push("/auth/sign-in");
  }

  if (isSessionLoading) {
    return (
      <main className={styles.sessionState} role="status">
        Checking your school session…
      </main>
    );
  }

  if (sessionError) {
    return (
      <main className={styles.sessionState}>
        <p role="alert">{sessionError}</p>
        <button type="button" onClick={refresh}>
          Try again
        </button>
      </main>
    );
  }

  if (!session) {
    return (
      <main className={styles.sessionState} role="status">
        Redirecting to sign in…
      </main>
    );
  }

  if (!session.user.role) {
    return (
      <main className={styles.sessionState} role="status">
        Choose a school workspace to continue…
      </main>
    );
  }

  const role = session.user.role;
  if (
    !isDashboardRouteAllowed(
      pathname,
      role,
      isApiMode ? session.permissionKeys : undefined,
    )
  ) {
    return (
      <main className={styles.sessionState} role="status">
        Opening your role workspace…
      </main>
    );
  }

  const user = session.user;
  const roleNotifications = notificationsByRole[role];
  const initials = user.name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  return (
    <div className={styles.app}>
      {sidebarOpen && (
        <button
          className={styles.backdrop}
          aria-label="Close navigation"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      <aside
        className={`${styles.sidebar} ${sidebarOpen ? styles.sidebarOpen : ""}`}
      >
        <Link href="/" className={styles.logoLink} aria-label="Dashify home">
          <Logo />
        </Link>
        <div className={styles.workspace}>
          <span className={styles.workspaceIcon}>
            {(role === "super_admin" ? "D" : (user.schoolName ?? "S")).slice(0, 1)}
          </span>
          <span className={styles.workspaceText}>
            <strong>{role === "super_admin" ? "Platform administration" : (user.schoolName ?? "All schools")}</strong>
            <small>{role.replaceAll("_", " ")}</small>
          </span>
          {role !== "super_admin" && <span className={styles.workspaceChevron}>
            <Icon name="chevronDown" size={16} />
          </span>}
        </div>
        <div className={styles.navLabel}>WORKSPACE</div>
        <nav className={styles.navigation} aria-label="Dashboard navigation">
          {navigation.map((item) => {
            const active =
              pathname === item.href ||
              (item.href !== "/dashboard" &&
                pathname.startsWith(`${item.href}/`));
            return (
              <Link
                className={`${styles.navLink} ${active ? styles.navLinkActive : ""}`}
                href={item.href}
                key={item.href}
                aria-current={active ? "page" : undefined}
                onClick={() => {
                  setSidebarOpen(false);
                  setNotificationsOpen(false);
                }}
              >
                <span className={styles.navIcon}>
                  <Icon name={item.icon} size={18} />
                </span>
                <span>{item.label}</span>
                {item.label === "Students" && !isApiMode && (
                  <span className={styles.navCount}>23</span>
                )}
              </Link>
            );
          })}
        </nav>
        {settingsAvailable && (
          <>
            <div className={styles.navLabel}>PREFERENCES</div>
            <Link
              className={`${styles.navLink} ${pathname === "/dashboard/settings" ? styles.navLinkActive : ""}`}
              href="/dashboard/settings"
              aria-current={
                pathname === "/dashboard/settings" ? "page" : undefined
              }
              onClick={() => {
                setSidebarOpen(false);
                setProfileOpen(false);
              }}
            >
              <span className={styles.navIcon}>
                <Icon name="settings" size={18} />
              </span>
              <span>Settings</span>
            </Link>
          </>
        )}
        <div className={styles.sidebarSpacer} />
        <div className={styles.helpCard}>
          <span className={styles.helpIcon}>
            <Icon name="sparkles" size={17} />
          </span>
          <strong>Need a hand?</strong>
          <p>Visit our help center to get the most out of Dashify.</p>
          <a href="mailto:hello@dashify.app">
            Visit help center <Icon name="arrowUpRight" size={14} />
          </a>
        </div>
        <div className={styles.profileWrap}>
          <button
            className={styles.profileButton}
            aria-label={`Signed in as ${user.name}`}
            aria-expanded={profileOpen}
            onClick={() => setProfileOpen(!profileOpen)}
          >
            <span className={styles.profileAvatar}>{initials}</span>
            <span className={styles.profileText}>
              <strong>{user.name}</strong>
              <small>{formatRole(role)}</small>
            </span>
            <span className={styles.profileMore} aria-hidden="true">
              <Icon name="chevronDown" size={16} />
            </span>
          </button>
          {profileOpen && (
            <div className={styles.profileMenu}>
              <div className={styles.profileDetails}>
                <strong>{user.name}</strong>
                <span>{user.email}</span>
                <small>{formatRole(role)}</small>
              </div>
              {settingsAvailable && (
                <Link
                  href="/dashboard/settings"
                  onClick={() => setProfileOpen(false)}
                >
                  Workspace settings
                </Link>
              )}
              <button
                type="button"
                onClick={handleSignOut}
                disabled={isPending}
              >
                {isPending ? "Signing out..." : "Sign out"}
              </button>
              {signOutError && (
                <p className={styles.signOutError} role="alert">
                  {signOutError}
                </p>
              )}
            </div>
          )}
        </div>
      </aside>

      <div className={styles.mainColumn}>
        <header className={styles.topbar}>
          <button
            className={styles.mobileMenu}
            aria-label="Open navigation"
            aria-expanded={sidebarOpen}
            onClick={() => setSidebarOpen(true)}
          >
            <Icon name="menu" size={19} />
          </button>
          <div className={styles.breadcrumb}>
            <span>
              {role === "super_admin"
                ? "Dashify"
                : (user.schoolName ?? "School workspace")}
            </span>
            <span aria-hidden="true">/</span>
            <strong>{breadcrumbLabel}</strong>
          </div>
          <div className={styles.topbarActions}>
            {!isApiMode && role !== "super_admin" && (
              <div className={styles.notificationWrap}>
                <button
                  className={styles.iconButton}
                  aria-label="Notifications"
                  aria-expanded={notificationsOpen}
                  aria-controls="dashboard-notifications"
                  onClick={() => {
                    setNotificationsOpen(!notificationsOpen);
                  }}
                >
                  <Icon name="bell" size={19} />
                  {!notificationsRead && <i />}
                </button>
                {notificationsOpen && (
                  <div
                    className={styles.notificationPanel}
                    id="dashboard-notifications"
                    role="region"
                    aria-label="Notifications"
                  >
                    <div className={styles.notificationHeader}>
                      <div>
                        <strong>Notifications</strong>
                        <span>
                          {notificationsRead
                            ? "You’re all caught up"
                            : `${roleNotifications.length} updates for you`}
                        </span>
                      </div>
                      {!notificationsRead && (
                        <button
                          type="button"
                          onClick={() => setNotificationsRead(true)}
                        >
                          Mark all read
                        </button>
                      )}
                    </div>
                    {!notificationsRead ? (
                      roleNotifications.map((notification) => (
                        <Link
                          className={styles.notificationItem}
                          href={notification.href}
                          key={notification.title}
                          onClick={() => {
                            setNotificationsOpen(false);
                            setNotificationsRead(true);
                          }}
                        >
                          <span
                            className={styles.notificationDot}
                            aria-hidden="true"
                          />
                          <span>
                            <strong>{notification.title}</strong>
                            <small>{notification.detail}</small>
                            <em>
                              {notification.action}{" "}
                              <Icon name="arrowUpRight" size={13} />
                            </em>
                          </span>
                        </Link>
                      ))
                    ) : (
                      <p className={styles.notificationsEmpty}>
                        You’re up to date. New activity for your role will
                        appear here.
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
            <button
              className={styles.topAvatar}
              aria-label={`Open ${user.name} profile`}
              aria-expanded={profileOpen}
              onClick={() => setProfileOpen(!profileOpen)}
            >
              {initials}
            </button>
          </div>
        </header>
        <main className={styles.content}>{children}</main>
      </div>
    </div>
  );
}

export function DashboardShellFallback() {
  return (
    <main className={styles.sessionState} role="status">
      Loading school workspace…
    </main>
  );
}
