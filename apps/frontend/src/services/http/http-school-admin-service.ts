import { ApiError, type ApiClient } from "@/services/api-client";

export class HttpSchoolAdminService {
  constructor(private readonly api: ApiClient) {}

  async create(schoolId: string, input: { firstName: string; lastName?: string; email: string }) {
    const value = await this.api.request<unknown>(`/platform/schools/${encodeURIComponent(schoolId)}/admins`,
      { method: "POST", body: JSON.stringify(input) });
    if (typeof value !== "object" || value === null ||
      !("id" in value) || typeof value.id !== "string" ||
      !("schoolId" in value) || value.schoolId !== schoolId ||
      !("email" in value) || typeof value.email !== "string" || value.email !== input.email.trim().toLowerCase()) {
      throw new ApiError("The Dashify service returned invalid administrator data.", 502);
    }
    return { id: value.id, schoolId: value.schoolId, email: value.email };
  }
}
