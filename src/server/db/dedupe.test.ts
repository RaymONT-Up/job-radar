import { describe, expect, it } from "vitest";
import { canonicalizeUrl, dedupeKey, normalizeIdentity } from "./dedupe";

describe("vacancy deduplication", () => {
  it("prefers source and source id", () => expect(dedupeKey({ source: "HH", sourceId: "42", title: "X", company: "Y", description: "" })).toBe("source:hh:42"));
  it("removes tracking parameters from URLs", () => expect(canonicalizeUrl("https://example.com/job/1?utm_source=x&ref=home")).toBe("https://example.com/job/1"));
  it("removes seniority noise without collapsing role identity", () => {
    expect(normalizeIdentity("Senior Frontend Engineer")).toBe("frontend engineer");
    expect(normalizeIdentity("Senior Backend Engineer")).not.toBe(normalizeIdentity("Senior Frontend Engineer"));
  });
  it("removes legal company suffixes across sources", () => {
    expect(normalizeIdentity("Sanctuary Computer Inc.")).toBe(normalizeIdentity("Sanctuary Computer"));
  });
});
