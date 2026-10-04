import { afterEach, describe, expect, it, vi } from "vitest";
import { fixMojibake, isFrontendRelevant, JoobleAdapter } from "./public-adapters";
import { isRoleRelevant } from "./relevance";

describe("public adapter text cleanup", () => {
  const originalJoobleKey = process.env.JOOBLE_API_KEY;

  afterEach(() => {
    if (originalJoobleKey) process.env.JOOBLE_API_KEY = originalJoobleKey;
    else delete process.env.JOOBLE_API_KEY;
    vi.unstubAllGlobals();
  });
  it("repairs UTF-8 text decoded as latin1", () => {
    expect(fixMojibake("Weâre hiring ð")).toBe("We’re hiring 🚀");
  });

  it("leaves healthy text unchanged", () => {
    expect(fixMojibake("Ищем React-разработчика")) .toBe("Ищем React-разработчика");
  });

  it("filters noisy matches from broad remote feeds", () => {
    expect(isFrontendRelevant("Senior .NET Software Engineer", "React appears once")).toBe(false);
    expect(isFrontendRelevant("Freelance Designer", "React website")).toBe(false);
    expect(isFrontendRelevant("Product Engineer", "Build interfaces with React and TypeScript")).toBe(true);
  });

  it("supports profile-driven design and web3 relevance", () => {
    expect(isRoleRelevant("Senior Product Designer", "Figma and design systems", ["Product Designer", "Figma"])).toBe(true);
    expect(isRoleRelevant("Blockchain Frontend Engineer", "React, wallets and Solidity", ["Web3 Frontend", "Blockchain"])).toBe(true);
    expect(isRoleRelevant("Accountant", "React dashboard", ["Frontend Engineer", "React"])).toBe(false);
  });

  it("normalizes official Jooble jobs into the common vacancy shape", () => {
    const vacancy = new JoobleAdapter().normalize({
      id: "jooble-1",
      title: "Senior Frontend Engineer",
      company: "Acme",
      location: "Remote",
      snippet: "<p>React, TypeScript and accessibility.</p>",
      link: "https://jooble.org/desc/1",
      updated: "2026-10-02T10:00:00Z",
    });
    expect(vacancy).toMatchObject({ source: "Jooble", title: "Senior Frontend Engineer", company: "Acme", location: "Remote", remoteType: "remote" });
    expect(vacancy.description).toContain("React, TypeScript");
  });

  it("uses the official Jooble REST endpoint with the profile queries", async () => {
    process.env.JOOBLE_API_KEY = "test-key";
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ totalCount: 1, jobs: [{ id: "1", title: "Frontend Engineer", company: "Acme", location: "Remote", snippet: "React", link: "https://jooble.org/job/1" }] }) });
    vi.stubGlobal("fetch", fetchMock);
    const result = await new JoobleAdapter().fetch({ queries: ["Frontend Engineer", "React"], limit: 25 });
    expect(fetchMock).toHaveBeenCalledWith("https://jooble.org/api/test-key", expect.objectContaining({ method: "POST" }));
    expect(result).toMatchObject({ fetched: 1, vacancies: [{ source: "Jooble", title: "Frontend Engineer" }] });
  });
});
