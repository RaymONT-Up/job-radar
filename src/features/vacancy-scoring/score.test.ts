import { describe, expect, it } from "vitest";
import { DEFAULT_PROFILE } from "@/entities/constants";
import type { VacancyInput } from "@/entities/types";
import { normalizeVacancy } from "./normalize";
import { scoreVacancy } from "./score";

function evaluate(overrides: Partial<VacancyInput>) {
  const vacancy: VacancyInput = {
    source: "Test", title: "Frontend Engineer", company: "Example", description: "React TypeScript role. 4+ years. Remote worldwide. $3500 USD.", location: "Remote", publishedAt: new Date(), ...overrides,
  };
  return scoreVacancy(vacancy, normalizeVacancy(vacancy), DEFAULT_PROFILE);
}

describe("deterministic vacancy scoring", () => {
  it("ranks an ideal fintech React vacancy as A", () => {
    const result = evaluate({ title: "Senior React Engineer — Fintech", description: "React TypeScript Next.js GraphQL WebSocket realtime charts for a fintech SaaS product. 4+ years. Remote worldwide. $4500 USD." });
    expect(result.bucket).toBe("A");
    expect(result.score).toBeGreaterThanOrEqual(80);
    expect(result.positiveReasons.join(" ")).toMatch(/fintech/i);
  });

  it("ranks a generic but relevant React vacancy as B", () => {
    const result = evaluate({ title: "React Developer", description: "React TypeScript Next.js Redux. 3+ years. Remote. Salary not disclosed." });
    expect(result.bucket).toBe("B");
    expect(result.hardStops).toHaveLength(0);
  });

  it("caps an Angular-first vacancy", () => {
    const result = evaluate({ title: "Angular Frontend Developer", description: "Angular-first enterprise product. 4+ years. Remote. $4000 USD." });
    expect(result.score).toBeLessThanOrEqual(30);
    expect(result.hardStops.join(" ")).toMatch(/Angular-first/i);
  });

  it("hard-stops incompatible onsite work", () => {
    const result = evaluate({ location: "Warsaw, Poland", remoteType: "onsite", description: "React TypeScript. 4+ years. Office only, must be based in Poland. $4000 USD." });
    expect(result.hardStops.length).toBeGreaterThan(0);
    expect(result.score).toBeLessThanOrEqual(30);
  });

  it("keeps a strong 5+ year stretch in A or B", () => {
    const result = evaluate({ description: "React TypeScript Next.js GraphQL WebSocket for fintech trading charts. 5+ years. Remote worldwide. $4500 USD." });
    expect(["A", "B"]).toContain(result.bucket);
    expect(result.negativeReasons.join(" ")).toMatch(/5\+ years/i);
  });

  it("ranks a backend role as C", () => {
    const result = evaluate({ title: "Senior Backend Engineer", description: "Node.js PostgreSQL Kafka backend services. 5+ years. Remote worldwide. $5000 USD." });
    expect(result.bucket).toBe("C");
  });

  it("does not treat a negated English requirement as a hard stop", () => {
    const result = evaluate({ title: "Фронтенд-разработчик", description: "Ищем фронтенд-разработчика. React и TypeScript. Английский не обязателен. Удалённая работа." });
    expect(result.hardStops.join(" ")).not.toMatch(/язык/i);
    expect(result.breakdown.title).toBe(DEFAULT_PROFILE.weights.titleMatch);
  });

  it("prefers explicit annual API salary over an hourly number in text", () => {
    const result = evaluate({ salaryMin: 80_000, salaryMax: 250_000, salaryCurrency: "USD", description: "React TypeScript. Remote worldwide. Contract rate can be $40/hr to $120/hr." });
    expect(result.hardStops.join(" ")).not.toMatch(/salary below/i);
    expect(result.breakdown.salary).toBe(DEFAULT_PROFILE.weights.salaryMatch);
  });

  it("converts an hourly salary to a monthly estimate", () => {
    const result = evaluate({ description: "React TypeScript. Remote worldwide. Compensation $40/hr to $120/hr." });
    expect(result.hardStops.join(" ")).not.toMatch(/salary below/i);
    expect(result.breakdown.salary).toBe(DEFAULT_PROFILE.weights.salaryMatch);
  });
});
