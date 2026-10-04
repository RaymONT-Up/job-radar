import { describe, expect, it } from "vitest";
import { DEFAULT_PROFILE } from "@/entities/constants";
import { buildSearchQueries } from "./queries";

describe("buildSearchQueries", () => {
  it("uses the active profile and adds a Russian frontend alias", () => {
    const queries = buildSearchQueries(DEFAULT_PROFILE);
    expect(queries.some((query) => /frontend/i.test(query))).toBe(true);
    expect(queries).toContain("Фронтенд разработчик");
    expect(queries.length).toBeLessThanOrEqual(12);
  });
});
