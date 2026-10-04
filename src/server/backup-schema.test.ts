import { describe, expect, it } from "vitest";
import { backupSchema } from "./backup-schema";

const backup = { profiles: [{}], vacancies: [], normalized: [], scores: [], applications: [], events: [] };

describe("backup schema", () => {
  it("accepts both historical and current backup versions", () => {
    expect(backupSchema.safeParse({ version: 1, ...backup }).success).toBe(true);
    expect(backupSchema.safeParse({ version: 2, ...backup }).success).toBe(true);
    expect(backupSchema.safeParse({ version: 3, ...backup, outreach: [] }).success).toBe(true);
  });
});
