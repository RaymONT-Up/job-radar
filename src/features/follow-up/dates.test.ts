import { describe, expect, it } from "vitest";
import { addBusinessDays } from "./dates";

describe("follow-up scheduling", () => {
  it("skips weekends", () => {
    const friday = new Date("2026-09-25T12:00:00Z");
    expect(addBusinessDays(friday, 3).toISOString().slice(0, 10)).toBe("2026-09-30");
  });
});
