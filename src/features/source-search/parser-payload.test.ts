import { describe, expect, it } from "vitest";
import { prepareParserPayload } from "./parser-payload";

describe("prepareParserPayload", () => {
  it("parses a URL even when an optional text field is too short", () => {
    expect(prepareParserPayload({ urlsText: "https://example.com/job/1", text: "Frontend", title: "", company: "", location: "" })).toEqual({ urls: ["https://example.com/job/1"], pasted: [] });
  });

  it("shows a human error for short text without a URL", () => {
    expect(() => prepareParserPayload({ urlsText: "", text: "Frontend", title: "", company: "", location: "" })).toThrow(/8 из 30/);
  });

  it("uses pasted text as fallback for the first URL without fetching it twice", () => {
    const result = prepareParserPayload({ urlsText: "https://example.com/1\nhttps://example.com/2", text: "Полное описание вакансии длиной больше тридцати символов", title: "Frontend", company: "Acme", location: "Remote" });
    expect(result.urls).toEqual(["https://example.com/2"]);
    expect(result.pasted[0].url).toBe("https://example.com/1");
  });

  it("accepts visible escaped newlines copied from a form", () => {
    const result = prepareParserPayload({ urlsText: "https://example.com/1\\nhttps://example.com/2", text: "", title: "", company: "", location: "" });
    expect(result.urls).toEqual(["https://example.com/1", "https://example.com/2"]);
  });
});
