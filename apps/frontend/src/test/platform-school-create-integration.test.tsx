import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/hooks/use-auth", () => ({
  useAuthSession: () => ({
    session: {
      scope: "platform",
      user: { id: "operator", role: "super_admin" },
      permissionKeys: ["platform.schools.read", "platform.schools.create", "platform.school-admins.create"],
    },
    isLoading: false, error: null, refresh: vi.fn(),
  }),
}));
vi.mock("@/services", async () => {
  const { ApiClient } = await import("@/services/api-client");
  const { HttpSchoolService } = await import("@/services/http/http-school-service");
  const { HttpSchoolAdminService } = await import("@/services/http/http-school-admin-service");
  const client = new ApiClient("https://dashify.test/api/v1");
  return {
    isApiMode: true,
    schoolService: new HttpSchoolService(client),
    schoolAdminService: new HttpSchoolAdminService(client),
  };
});

import { PlatformSchoolCreate } from "@/components/platform-school-create";

describe("school creation adapter integration", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("uses the school response ID for the subsequent administrator request", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({
        id: "school-1", name: "Synthetic School", code: "SYN",
        isActive: true, createdAt: "2026-01-01T00:00:00.000Z", onboardingState: "NOT_STARTED",
      }), { status: 201 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        id: "admin-1", schoolId: "school-1", email: "admin@example.test",
      }), { status: 201 }));
    vi.stubGlobal("fetch", fetchMock);
    render(<PlatformSchoolCreate />);
    fireEvent.change(screen.getByLabelText("School name"), { target: { value: "Synthetic School" } });
    fireEvent.change(screen.getByLabelText("School code"), { target: { value: "SYN" } });
    fireEvent.click(screen.getByRole("button", { name: "Continue to administrator" }));
    fireEvent.change(screen.getByLabelText("First name"), { target: { value: "Synthetic" } });
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "admin@example.test" } });
    fireEvent.click(screen.getByRole("button", { name: "Create school and administrator" }));
    expect(await screen.findByRole("heading", { name: "School and administrator created" })).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[0][0]).toBe("https://dashify.test/api/v1/platform/schools");
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ name: "Synthetic School", code: "SYN" });
    expect(fetchMock.mock.calls[1][0]).toBe("https://dashify.test/api/v1/platform/schools/school-1/admins");
    expect(JSON.parse(fetchMock.mock.calls[1][1].body)).toEqual({ firstName: "Synthetic", email: "admin@example.test" });
  });
});
