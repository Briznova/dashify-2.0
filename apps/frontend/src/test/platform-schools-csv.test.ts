import { describe, expect, it } from "vitest";
import { createPlatformSchoolsCsv } from "@/lib/platform-schools-csv";

describe("school directory CSV", () => {
  it("exports directory metadata with CSV escaping and spreadsheet formula protection", () => {
    const csv = createPlatformSchoolsCsv([
      {
        id: "school-1",
        name: ' =Example, "School"',
        code: "@EXAMPLE",
        isActive: false,
        createdAt: "2026-01-01T00:00:00.000Z",
      },
      {
        id: "school-2",
        name: "\tExample",
        code: "NORMAL",
        isActive: true,
        createdAt: "2026-01-02T00:00:00.000Z",
      },
    ]);

    expect(csv).toBe(
      '"id","name","code","status","created_at"\r\n' +
      '"school-1","\' =Example, ""School""","\'@EXAMPLE","Inactive","2026-01-01T00:00:00.000Z"\r\n' +
      '"school-2","\'\tExample","NORMAL","Active","2026-01-02T00:00:00.000Z"\r\n',
    );
  });
});
