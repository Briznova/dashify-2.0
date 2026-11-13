import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ session: vi.fn(), list: vi.fn(), detail: vi.fn(), create: vi.fn(), act: vi.fn(), schools: vi.fn(), push: vi.fn() }));
vi.mock("@/hooks/use-auth", () => ({ useAuthSession: mocks.session }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: mocks.push }) }));
vi.mock("@/services", () => ({
  isApiMode: true,
  platformSupportService: { list: mocks.list, detail: mocks.detail, create: mocks.create, act: mocks.act },
  schoolService: { getPlatformSchools: mocks.schools },
}));
import { PlatformSupport } from "@/components/platform-support";

const ticket = {
  id: "ticket-1", schoolId: "school-1", school: { id: "school-1", name: "Example", code: "EX" },
  title: "Synthetic issue", description: "Synthetic details", status: "OPEN", priority: "NORMAL",
  createdById: "operator", assigneeId: null, version: 1, resolvedAt: null,
  createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z",
};

describe("platform support", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.session.mockReturnValue({
      session: { scope: "platform", user: { id: "operator", role: "super_admin" }, permissionKeys: ["platform.support.read", "platform.support.update"] },
      isLoading: false, error: null, refresh: vi.fn(),
    });
    mocks.schools.mockResolvedValue([{ id: "school-1", name: "Example", code: "EX" }]);
  });
  it("denies missing support read permission without fetching", () => {
    mocks.session.mockReturnValue({
      session: { scope: "platform", user: { id: "operator", role: "super_admin" }, permissionKeys: ["platform.schools.read"] },
      isLoading: false, error: null, refresh: vi.fn(),
    });
    render(<PlatformSupport />);
    expect(screen.getByRole("alert")).toHaveTextContent("unavailable");
    expect(mocks.list).not.toHaveBeenCalled();
  });
  it("creates a real ticket and navigates to its detail", async () => {
    mocks.list.mockResolvedValue({ data: [], nextCursor: null });
    mocks.create.mockResolvedValue(ticket);
    render(<PlatformSupport />);
    await screen.findByRole("option", { name: "Example (EX)" });
    fireEvent.change(screen.getByLabelText("School"), { target: { value: "school-1" } });
    fireEvent.change(screen.getByLabelText("Title"), { target: { value: "Synthetic issue" } });
    fireEvent.change(screen.getByLabelText("Description"), { target: { value: "Synthetic details" } });
    fireEvent.click(screen.getByRole("button", { name: "Create ticket" }));
    await waitFor(() => expect(mocks.create).toHaveBeenCalledWith({ schoolId: "school-1", title: "Synthetic issue", description: "Synthetic details", priority: "NORMAL" }));
    expect(mocks.push).toHaveBeenCalledWith("/dashboard/platform/support-detail?id=ticket-1");
  });
  it("hides write controls for read-only support access", async () => {
    mocks.session.mockReturnValue({
      session: { scope: "platform", user: { id: "operator", role: "super_admin" }, permissionKeys: ["platform.support.read"] },
      isLoading: false, error: null, refresh: vi.fn(),
    });
    mocks.list.mockResolvedValue({ data: [ticket], nextCursor: null });
    render(<PlatformSupport />);
    expect(await screen.findByRole("link", { name: "Synthetic issue" })).toHaveAttribute("href", "/dashboard/platform/support-detail?id=ticket-1");
    expect(screen.queryByRole("button", { name: "Create ticket" })).not.toBeInTheDocument();
    expect(mocks.schools).not.toHaveBeenCalled();
  });
  it("resolves with the current version and reloads the detail", async () => {
    mocks.detail.mockResolvedValue({ ...ticket, events: [] });
    mocks.act.mockResolvedValue({ ...ticket, status: "RESOLVED", version: 2 });
    render(<PlatformSupport ticketId="ticket-1" />);
    await screen.findByText("Synthetic details");
    fireEvent.click(screen.getByRole("button", { name: "Resolve" }));
    await waitFor(() => expect(mocks.act).toHaveBeenCalledWith("ticket-1", { action: "SET_STATUS", value: "RESOLVED", version: 1 }));
    await waitFor(() => expect(mocks.detail).toHaveBeenCalledTimes(2));
  });
  it("surfaces stale write failures and provides reload", async () => {
    mocks.detail.mockResolvedValue({ ...ticket, events: [] });
    mocks.act.mockRejectedValue(new Error("Ticket changed; reload and try again"));
    render(<PlatformSupport ticketId="ticket-1" />);
    await screen.findByText("Synthetic details");
    fireEvent.click(screen.getByRole("button", { name: "Claim ticket" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Ticket changed");
    fireEvent.click(screen.getByRole("button", { name: "Reload ticket" }));
    await waitFor(() => expect(mocks.detail).toHaveBeenCalledTimes(2));
  });
});
