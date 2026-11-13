import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ read: vi.fn(), session: vi.fn() }));
vi.mock("@/hooks/use-auth", () => ({ useAuthSession: mocks.session }));
vi.mock("@/services", () => ({ isApiMode: true, platformSettingsService: { read: mocks.read } }));
import { PlatformSettings } from "@/components/platform-settings";

describe("platform settings", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.session.mockReturnValue({
      session: { scope: "platform", user: { id: "operator-1", role: "super_admin" }, permissionKeys: ["platform.settings.read"] },
      isLoading: false, error: null, refresh: vi.fn(),
    });
  });

  it("denies access without the separate settings permission", () => {
    mocks.session.mockReturnValue({
      session: { scope: "platform", user: { id: "operator-1", role: "super_admin" }, permissionKeys: ["platform.schools.read"] },
      isLoading: false, error: null, refresh: vi.fn(),
    });
    render(<PlatformSettings />);
    expect(screen.getByRole("alert")).toHaveTextContent("unavailable");
    expect(mocks.read).not.toHaveBeenCalled();
  });

  it("shows effective values without editable controls", async () => {
    mocks.read.mockResolvedValue({ accessTokenTtlSeconds: 900, refreshTokenTtlSeconds: 2592000 });
    render(<PlatformSettings />);
    expect(await screen.findByText("900 seconds")).toBeInTheDocument();
    expect(screen.getByText("2,592,000 seconds")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /save/i })).not.toBeInTheDocument();
  });

  it("shows errors and retries without using placeholder settings", async () => {
    mocks.read.mockRejectedValueOnce(new Error("Settings unavailable")).mockResolvedValue({
      accessTokenTtlSeconds: 1200, refreshTokenTtlSeconds: 7200,
    });
    render(<PlatformSettings />);
    expect(await screen.findByText("Settings unavailable")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByText("1,200 seconds")).toBeInTheDocument();
  });
});
