import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  create: vi.fn(),
  publish: vi.fn(),
  refresh: vi.fn(),
  announcements: [] as {
    id: string;
    title: string;
    body: string;
    status: "DRAFT" | "PUBLISHED";
    publishedAt: string | null;
    createdAt: string;
  }[],
  permissionKeys: [] as string[],
  useAnnouncements: vi.fn(),
}));

vi.mock("@/services", () => ({ isApiMode: true }));

vi.mock("@/hooks/use-auth", () => ({
  useAuthSession: () => ({
    session: { permissionKeys: mocks.permissionKeys },
    isLoading: false,
  }),
}));

vi.mock("@/hooks/use-school-data", () => ({
  useAnnouncements: (...args: unknown[]) => mocks.useAnnouncements(...args),
  useAnnouncementActions: () => ({
    create: mocks.create,
    publish: mocks.publish,
    isPending: false,
    error: null,
  }),
}));

import { AnnouncementsDirectory } from "@/components/announcements-directory";

describe("AnnouncementsDirectory", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.announcements = [];
    mocks.permissionKeys = ["announcements.read"];
    mocks.create.mockResolvedValue({ id: "draft-1" });
    mocks.publish.mockResolvedValue({ id: "draft-1" });
    mocks.useAnnouncements.mockReturnValue({
      data: mocks.announcements,
      isLoading: false,
      error: null,
      refresh: mocks.refresh,
    });
  });

  it("lets a School Admin create and publish a draft", async () => {
    mocks.permissionKeys = ["announcements.read", "announcements.manage"];
    mocks.announcements = [{
      id: "draft-1",
      title: "Term notice",
      body: "Classes begin Monday.",
      status: "DRAFT",
      publishedAt: null,
      createdAt: "2026-04-03T07:45:00.000Z",
    }];
    mocks.useAnnouncements.mockImplementation(() => ({
      data: mocks.announcements,
      isLoading: false,
      error: null,
      refresh: mocks.refresh,
    }));

    render(<AnnouncementsDirectory />);
    expect(mocks.useAnnouncements).toHaveBeenCalledWith(true);

    fireEvent.change(screen.getByLabelText("Title"), {
      target: { value: "Sports day" },
    });
    fireEvent.change(screen.getByLabelText("Message"), {
      target: { value: "Sports day is Friday." },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save draft" }));

    await waitFor(() => {
      expect(mocks.create).toHaveBeenCalledWith({
        title: "Sports day",
        body: "Sports day is Friday.",
      });
    });
    fireEvent.click(screen.getByRole("button", { name: "Publish" }));
    await waitFor(() => expect(mocks.publish).toHaveBeenCalledWith("draft-1"));
    expect(mocks.refresh).toHaveBeenCalled();
  });

  it("shows published messages without management actions to a reader", () => {
    mocks.announcements = [{
      id: "notice-1",
      title: "Term notice",
      body: "Classes begin Monday.",
      status: "PUBLISHED",
      publishedAt: "2026-04-03T08:00:00.000Z",
      createdAt: "2026-04-03T07:45:00.000Z",
    }];
    mocks.useAnnouncements.mockImplementation(() => ({
      data: mocks.announcements,
      isLoading: false,
      error: null,
      refresh: mocks.refresh,
    }));

    render(<AnnouncementsDirectory />);

    expect(screen.getByText("Term notice")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Save draft" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Publish" })).toBeNull();
    expect(mocks.useAnnouncements).toHaveBeenCalledWith(false);
  });
});
