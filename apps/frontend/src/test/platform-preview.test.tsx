import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PlatformPreview } from "@/components/platform-preview";
import { platformPages, type PlatformPage } from "@/lib/platform-pages";
import { isDashboardRouteAllowed } from "@/lib/access-policy";

describe("Super Admin previews", () => {
  it.each(Object.keys(platformPages) as PlatformPage[])(
    "labels %s as dummy and restricts navigation to Super Admin",
    (page) => {
      render(<PlatformPreview page={page} />);
      expect(screen.getByRole("heading", { name: platformPages[page].title, level: 1 })).toBeInTheDocument();
      expect(screen.getByRole("status")).toHaveTextContent("Dummy page");
      for (const button of screen.queryAllByRole("button")) {
        expect(button).toBeDisabled();
      }
      expect(isDashboardRouteAllowed(`/dashboard/platform/${page}`, "super_admin", [])).toBe(true);
      expect(isDashboardRouteAllowed(`/dashboard/platform/${page}`, "school_admin", ["platform.schools.read"])).toBe(false);
    },
  );

  it("provides navigation through setup, plans, and support previews", () => {
    const { rerender } = render(<PlatformPreview page="school-setup" />);
    expect(screen.queryByRole("link", { name: /create.*admin/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/csv|bulk import/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /upload|download template/i })).not.toBeInTheDocument();
    rerender(<PlatformPreview page="subscriptions" />);
    expect(screen.getByRole("link", { name: /manage plans preview/i })).toHaveAttribute("href", "/dashboard/platform/plans");
    rerender(<PlatformPreview page="support" />);
    expect(screen.getByRole("link", { name: /ticket detail preview/i })).toHaveAttribute("href", "/dashboard/platform/support-detail");
  });
});
