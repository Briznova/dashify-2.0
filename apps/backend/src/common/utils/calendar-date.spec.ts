import { BadRequestException } from "@nestjs/common";
import { parseCalendarDate, schoolLocalDate } from "./calendar-date";

describe("calendar date utilities", () => {
  it("parses only valid YYYY-MM-DD dates", () => {
    expect(parseCalendarDate("2026-04-15")).toEqual(
      new Date("2026-04-15T00:00:00.000Z"),
    );
    expect(() => parseCalendarDate("2026-02-30")).toThrow(
      BadRequestException,
    );
  });

  it("derives calendar dates in the school's timezone", () => {
    const now = new Date("2026-04-14T20:00:00.000Z");
    expect(schoolLocalDate(now, "Asia/Kolkata")).toBe("2026-04-15");
    expect(schoolLocalDate(now, "America/Los_Angeles")).toBe("2026-04-14");
  });
});
