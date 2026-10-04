import { describe, expect, it } from "vitest";
import { DEFAULT_PROFILE } from "@/entities/constants";
import { normalizeVacancy } from "@/features/vacancy-scoring/normalize";
import { scoreVacancy } from "@/features/vacancy-scoring/score";
import { buildOfferSprint } from "./build";

const vacancy = {
  source: "HH", title: "Senior Frontend Engineer", company: "FinTech",
  description: "Ищем frontend-разработчика: React, TypeScript, GraphQL, WebSocket. Удалённо. Опыт от 4 лет.", location: "Remote",
};

describe("buildOfferSprint", () => {
  it("builds a proof-based outreach pack", () => {
    const normalized = normalizeVacancy(vacancy);
    const score = scoreVacancy(vacancy, normalized, DEFAULT_PROFILE);
    const sprint = buildOfferSprint({ vacancy, normalized, score, profile: DEFAULT_PROFILE, status: "FOUND", verificationStatus: "active" });
    expect(sprint.verdict).toBe("go");
    expect(sprint.matchedSkills).toContain("React");
    expect(sprint.recruiterMessage).toContain("FinTech");
    expect(sprint.proofPoints[0]).toMatch(/performance|architecture/i);
  });

  it("stops when the vacancy is unavailable", () => {
    const normalized = normalizeVacancy(vacancy);
    const score = scoreVacancy(vacancy, normalized, DEFAULT_PROFILE);
    const sprint = buildOfferSprint({ vacancy, normalized, score, profile: DEFAULT_PROFILE, status: "FOUND", verificationStatus: "unavailable" });
    expect(sprint.verdict).toBe("stop");
    expect(sprint.nextAction).toMatch(/закрыта/i);
  });

  it("shows every hard stop and recognizes Node.js as Node", () => {
    const nodeVacancy = { ...vacancy, description: "React, TypeScript and Node. Office only, must be based in Poland. English C1 required." };
    const normalized = normalizeVacancy(nodeVacancy);
    const score = scoreVacancy(nodeVacancy, normalized, DEFAULT_PROFILE);
    const sprint = buildOfferSprint({ vacancy: nodeVacancy, normalized, score, profile: DEFAULT_PROFILE, status: "FOUND", verificationStatus: "active" });
    expect(sprint.matchedSkills).toContain("Node");
    expect(sprint.missingSkills).not.toContain("Node");
    for (const stop of score.hardStops) expect(sprint.nextAction).toContain(stop);
  });
});
