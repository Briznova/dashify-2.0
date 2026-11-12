import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getOverview: vi.fn(),
  isApiMode: true,
}));

vi.mock("@/services", () => ({
  get isApiMode() {
    return mocks.isApiMode;
  },
  schoolService: {
    getOverview: mocks.getOverview,
  },
}));

import { SchoolDashboardView } from "@/components/school-dashboard";

describe("API-mode school dashboard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getOverview.mockResolvedValue({
      role: "school_admin",
      schoolName: "Northstar School",
      metrics: [
        { label: "Active students", value: "24", icon: "users", tone: "blue" },
        { label: "Active staff", value: "5", icon: "graduationCap", tone: "violet" },
        { label: "Active classes", value: "4", icon: "book", tone: "green" },
        { label: "Active sections", value: "8", icon: "layoutDashboard", tone: "orange" },
      ],
      enrollment: [],
      pendingApprovals: [],
      upcomingEvents: [],
    });
  });

  it("renders API counts without mock-only operational panels or trends", async () => {
    render(<SchoolDashboardView role="school_admin" userName="Avery Johnson" />);

    expect(await screen.findByText("Active students")).toBeInTheDocument();
    expect(screen.getByText("24")).toBeInTheDocument();
    expect(screen.getAllByText("Current total")).toHaveLength(4);
    expect(screen.queryByText("Fee position")).not.toBeInTheDocument();
    expect(screen.queryByText(/from last month/i)).not.toBeInTheDocument();
  });

  it("renders the principal daily attendance snapshot without mock panels", async () => {
    mocks.getOverview.mockResolvedValue({
      role: "principal",
      schoolName: "Northstar School",
      localDate: "2026-04-03",
      metrics: [
        { label: "Present", value: "12", icon: "check", tone: "green" },
        { label: "Absent", value: "2", icon: "alert", tone: "orange" },
        { label: "Late", value: "1", icon: "clock", tone: "violet" },
        { label: "Excused", value: "1", icon: "info", tone: "blue" },
        { label: "Unmarked", value: "3", icon: "calendarCheck", tone: "orange" },
      ],
      enrollment: [],
      pendingApprovals: [],
      upcomingEvents: [],
    });

    render(<SchoolDashboardView role="principal" userName="Avery Johnson" />);

    expect(await screen.findByText("Present")).toBeInTheDocument();
    expect(screen.getByText("Daily attendance snapshot for 2026-04-03 (school local date).")).toBeInTheDocument();
    expect(screen.getByText("Unmarked")).toBeInTheDocument();
    expect(screen.queryByText("Fee position")).not.toBeInTheDocument();
    expect(screen.queryByText(/from last month/i)).not.toBeInTheDocument();
  });
});
