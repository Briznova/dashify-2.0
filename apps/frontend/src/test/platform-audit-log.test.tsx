import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ list: vi.fn(), session: vi.fn() }));
vi.mock("@/hooks/use-auth", () => ({ useAuthSession: mocks.session }));
vi.mock("@/services", () => ({ isApiMode: true, platformAuditService: { list: mocks.list } }));
import { PlatformAuditLog } from "@/components/platform-audit-log";

describe("platform audit log", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.session.mockReturnValue({
      session: { scope: "platform", user: { id: "operator-1", role: "super_admin" }, permissionKeys: ["platform.audit.read"] },
      isLoading: false, error: null, refresh: vi.fn(),
    });
  });

  it("denies access without the explicit audit permission", () => {
    mocks.session.mockReturnValue({
      session: { scope: "platform", user: { id: "operator-1", role: "super_admin" }, permissionKeys: ["platform.schools.read"] },
      isLoading: false, error: null, refresh: vi.fn(),
    });
    render(<PlatformAuditLog />);
    expect(screen.getByRole("alert")).toHaveTextContent("unavailable");
    expect(mocks.list).not.toHaveBeenCalled();
  });

  it("renders redacted events and follows a cursor with the active filter", async () => {
    mocks.list.mockResolvedValueOnce({
      data: [{ id: "event-1", createdAt: "2026-01-02T00:00:00Z", action: "PLATFORM_SCHOOL_CREATED", actorUserId: null }],
      nextCursor: "next-cursor",
    }).mockResolvedValueOnce({ data: [], nextCursor: null });
    render(<PlatformAuditLog />);
    expect(await screen.findByRole("cell", { name: "PLATFORM SCHOOL CREATED" })).toBeInTheDocument();
    expect(screen.getByText("System")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(await screen.findByText("No platform events match this filter.")).toBeInTheDocument();
    expect(mocks.list).toHaveBeenLastCalledWith(expect.objectContaining({ cursor: "next-cursor" }), expect.any(AbortSignal));
    expect(screen.getByRole("button", { name: "Next" })).toBeDisabled();
  });

  it("shows a retryable failure and validates date ordering", async () => {
    mocks.list.mockRejectedValueOnce(new Error("Audit unavailable")).mockResolvedValue({ data: [], nextCursor: null });
    render(<PlatformAuditLog />);
    expect(await screen.findByText("Audit unavailable")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /try again/i }));
    expect(await screen.findByText("No platform events match this filter.")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("From date (UTC)"), { target: { value: "2026-02-01" } });
    fireEvent.change(screen.getByLabelText("To date (UTC)"), { target: { value: "2026-01-01" } });
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("start date"));
  });

  it("requests action and UTC date filters", async () => {
    mocks.list.mockResolvedValue({ data: [], nextCursor: null });
    render(<PlatformAuditLog />);
    expect(await screen.findByText("No platform events match this filter.")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Event type"), { target: { value: "PLATFORM_SCHOOL_CREATED" } });
    fireEvent.change(screen.getByLabelText("From date (UTC)"), { target: { value: "2026-01-01" } });
    fireEvent.change(screen.getByLabelText("To date (UTC)"), { target: { value: "2026-01-31" } });
    await waitFor(() => expect(mocks.list).toHaveBeenLastCalledWith({
      action: "PLATFORM_SCHOOL_CREATED",
      cursor: undefined,
      from: "2026-01-01T00:00:00Z",
      to: "2026-01-31T23:59:59.999Z",
    }, expect.any(AbortSignal)));
  });
});
