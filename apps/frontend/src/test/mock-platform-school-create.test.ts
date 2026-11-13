import { describe, expect, it } from "vitest";
import { MockSchoolService } from "@/services/mock/mock-school-service";

describe("mock platform school creation", () => {
  it("does not simulate a successful school creation", async () => {
    await expect(new MockSchoolService().createPlatformSchool()).rejects.toThrow();
  });
});
