import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiClient } from "@/services/api-client";
import { HttpSchoolAdminService } from "@/services/http/http-school-admin-service";

describe("school administrator HTTP adapter", () => {
  afterEach(() => vi.unstubAllGlobals());
  it("posts account details and validates the target school in the response", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: "user-1", schoolId: "school-1", email: "admin@example.test" }), { status: 201 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: "user-2", schoolId: "other-school", email: "admin@example.test" }), { status: 201 }));
    vi.stubGlobal("fetch", fetchMock);
    const service = new HttpSchoolAdminService(new ApiClient("https://dashify.test/api/v1"));
    const input = { firstName: "Synthetic", email: "admin@example.test" };
    await expect(service.create("school-1", input)).resolves.toMatchObject({ schoolId: "school-1" });
    expect(fetchMock.mock.calls[0][0]).toBe("https://dashify.test/api/v1/platform/schools/school-1/admins");
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual(input);
    await expect(service.create("school-1", input)).rejects.toThrow("invalid administrator data");
  });
});
