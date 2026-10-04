import { describe, expect, it } from "vitest";
import { calculateAnalytics } from "./calculate";

describe("calculateAnalytics", () => {
  it("calculates stage-to-stage conversions", () => {
    const result = calculateAnalytics([
      { source: "HH", bucket: "A", status: "OFFER" },
      { source: "HH", bucket: "B", status: "TECH" },
      { source: "LinkedIn", bucket: "A", status: "APPLIED" },
      { source: "LinkedIn", bucket: "B", status: "REJECTED" },
    ]);
    expect(result.funnel.map((item) => item.count)).toEqual([4, 2, 2, 2, 1, 1]);
    expect(result.funnel[1].conversion).toBe(50);
    expect(result.funnel[4].conversion).toBe(50);
  });

  it("marks small breakdown samples as insufficient", () => {
    const result = calculateAnalytics([{ source: "Direct", bucket: "A", status: "APPLIED" }]);
    expect(result.bySource[0]).toMatchObject({ applications: 1, insufficient: true, replyRate: 0 });
  });
});
