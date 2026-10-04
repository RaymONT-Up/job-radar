import type { CandidateProfile, NormalizedVacancy, ScoreResult, VacancyInput } from "@/entities/types";
import { normalizeVacancy } from "./normalize";

type RuleContext = { vacancy: VacancyInput; normalized: NormalizedVacancy; profile: CandidateProfile; text: string };
type RuleResult = { points: number; positive?: string; negative?: string; hardStop?: string };
interface ScoringRule { key: string; evaluate(context: RuleContext): RuleResult }

const canonical = (value: string) => value.toLowerCase().replace(/[+.#]/g, "").replace(/[^a-z0-9а-я]+/gi, " ").trim();
const includesLoose = (text: string, needle: string) => canonical(text).includes(canonical(needle));
const languageName = (value: string) => /рус|russian/i.test(value) ? "Russian" : /англ|english/i.test(value) ? "English" : canonical(value);

// Named scoring constants — avoids magic numbers scattered across rules
const HARD_STOP_SCORE_CAP = 30;
const BUCKET_A_THRESHOLD = 80;
const BUCKET_B_THRESHOLD = 60;
/** Above this number, USD/EUR/GBP salaries are auto-detected as annual rather than monthly */
const ANNUAL_AUTO_DETECT_FLOOR = 24_000;
/** Hourly rate → monthly conversion factor (avg ~173 working hours/month) */
const HOURLY_TO_MONTHLY = 173;

function monthlySalary(vacancy: VacancyInput, normalized: NormalizedVacancy) {
  const salary = vacancy.salaryMin != null || vacancy.salaryMax != null
    ? { min: vacancy.salaryMin ?? null, max: vacancy.salaryMax ?? null, currency: vacancy.salaryCurrency ?? "USD" }
    : normalized.detectedSalary;
  if (!salary) return null;
  const text = `${vacancy.title}\n${vacancy.description}`;
  const highest = Math.max(salary.min ?? 0, salary.max ?? 0);
  const hourly = /(?:\/\s*(?:h|hr|hour)|per\s+hour|hourly|в\s+час)/i.test(text);
  // Only auto-detect annual when: explicit keyword OR (major currency AND in the 24k–200k range)
  // Avoids misclassifying high monthly salaries like €30k/month in Zurich as annual
  const annual = /(?:\/\s*(?:yr|year)|per\s+year|annual|annually|в\s+год)/i.test(text)
    || (["USD", "EUR", "GBP"].includes(salary.currency.toUpperCase()) && highest >= ANNUAL_AUTO_DETECT_FLOOR && highest <= 200_000);
  const factor = hourly ? HOURLY_TO_MONTHLY : annual ? 1 / 12 : 1;
  return { min: salary.min == null ? null : salary.min * factor, max: salary.max == null ? null : salary.max * factor, currency: salary.currency };
}

const rules: ScoringRule[] = [
  {
    key: "title",
    // FIX: Previously hardcoded "frontend" regexes — now purely profile-driven.
    // Any role (Backend, QA, Designer, Mobile) gets correct scoring based on their targetTitles.
    evaluate: ({ vacancy, profile }) => {
      const title = canonical(vacancy.title);
      const targetTokens = profile.targetTitles.map(canonical);
      // Strong match: title contains or is contained by a target
      const exactish = targetTokens.some((target) => title.includes(target) || target.includes(title));
      // Secondary: any strong skill keyword appears in the job title
      const skillInTitle = profile.strongSkills.some((skill) => includesLoose(title, skill));
      if (exactish || skillInTitle) {
        return { points: profile.weights.titleMatch, positive: "Title matches your target roles" };
      }
      // Partial: at least one meaningful token (3+ chars) from any target title appears in the vacancy title
      const partialMatch = targetTokens.some((target) =>
        target.split(" ").filter((t) => t.length >= 3).some((token) => title.includes(token))
      );
      return partialMatch
        ? { points: Math.round(profile.weights.titleMatch * 0.6), negative: "Partial title match" }
        : { points: 3, negative: "Title is outside your target roles" };
    },
  },
  {
    key: "skills",
    evaluate: ({ normalized, profile }) => {
      const strong = normalized.skills.filter((skill) => profile.strongSkills.some((item) => includesLoose(item, skill) || includesLoose(skill, item)));
      const secondary = normalized.skills.filter((skill) => profile.secondarySkills.some((item) => includesLoose(item, skill) || includesLoose(skill, item)));
      const points = Math.min(profile.weights.skillMatch, strong.length * 5 + secondary.length * 2);
      return points ? { points, positive: `${strong.slice(0, 4).join(" + ") || secondary.slice(0, 3).join(" + ")} match` } : { points: 0, negative: "Few matching technologies" };
    },
  },
  {
    key: "domain",
    evaluate: ({ normalized, profile }) => {
      const domains = normalized.domains.filter((domain) => profile.strongDomains.some((item) => includesLoose(item, domain) || includesLoose(domain, item)));
      const points = Math.min(profile.weights.domainMatch, domains.length * 7.5);
      return points ? { points, positive: `${domains.slice(0, 3).join(" + ")} domain` } : { points: 0 };
    },
  },
  {
    key: "experience",
    evaluate: ({ normalized, profile }) => {
      const required = normalized.detectedYearsMin;
      if (!required) return { points: profile.weights.experienceMatch * 0.6, positive: "No rigid experience barrier" };
      if (required <= profile.yearsExperience) return { points: profile.weights.experienceMatch, positive: `${required}+ years fits your experience` };
      if (required <= profile.yearsExperience + 0.5) return { points: profile.weights.experienceMatch * 0.65, negative: `Asks ${required}+ years; close stretch` };
      if (required <= 6) return { points: profile.weights.experienceMatch * 0.25, negative: `Asks ${required}+ years` };
      return { points: 0, negative: `Asks ${required}+ years` };
    },
  },
  {
    key: "remote",
    evaluate: ({ vacancy, normalized, profile }) => {
      if (normalized.locationRestrictions.length && !normalized.locationRestrictions.some((item) => includesLoose(profile.location, item))) {
        return { points: 0, hardStop: `Location restricted to ${normalized.locationRestrictions.join(", ")}` };
      }
      if (normalized.detectedRemote === "onsite" && !includesLoose(vacancy.location ?? "", profile.location.split(",")[0])) {
        return { points: 0, hardStop: `Onsite in ${vacancy.location || "another location"}` };
      }
      if (normalized.detectedRemote === "worldwide") return { points: profile.weights.remoteMatch, positive: "Remote worldwide" };
      if (normalized.detectedRemote === "remote") return { points: profile.weights.remoteMatch * 0.8, positive: "Remote format" };
      if (includesLoose(vacancy.location ?? "", profile.location.split(",")[0])) return { points: profile.weights.remoteMatch, positive: "Location compatible" };
      return { points: profile.weights.remoteMatch * 0.3, negative: "Location compatibility is unclear" };
    },
  },
  {
    key: "salary",
    evaluate: ({ vacancy, normalized, profile }) => {
      const salary = monthlySalary(vacancy, normalized);
      if (!salary) return { points: profile.weights.salaryMatch * 0.4, negative: "Salary not disclosed" };
      if (salary.currency.toUpperCase() !== profile.salaryCurrency.toUpperCase()) return { points: profile.weights.salaryMatch * 0.4, negative: `Salary is in ${salary.currency}; no exchange rate assumed` };
      const upper = salary.max ?? salary.min ?? 0;
      if (upper < profile.salaryFloor) return { points: 0, hardStop: `Salary below ${profile.salaryFloor} ${profile.salaryCurrency} floor` };
      if (upper >= profile.salaryTarget) return { points: profile.weights.salaryMatch, positive: "Compensation meets target" };
      return { points: profile.weights.salaryMatch * 0.5, negative: "Compensation is below target" };
    },
  },
  {
    key: "language",
    evaluate: ({ normalized, profile }) => {
      const allowed = new Set(profile.languages.map(languageName));
      const required = normalized.requiredLanguages.map(languageName);
      const blocked = required.filter((language) => !allowed.has(language));
      const weight = profile.weights.languageMatch ?? 10;
      if (blocked.length && profile.languagePolicy === "strict") {
        return { points: 0, hardStop: `Рабочий язык не подходит: ${blocked.join(", ")}` };
      }
      if (blocked.length) return { points: 0, negative: `Проверьте рабочий язык: ${blocked.join(", ")}` };
      if (required.length) return { points: weight, positive: `Рабочий язык: ${required.join(" + ")}` };
      return { points: weight * 0.4, negative: "Рабочий язык не указан" };
    },
  },
  {
    key: "freshness",
    evaluate: ({ vacancy, profile }) => {
      const date = vacancy.publishedAt ? new Date(vacancy.publishedAt) : new Date(vacancy.createdAt ?? Date.now());
      const ageDays = Math.max(0, (Date.now() - date.getTime()) / 86_400_000);
      const ratio = ageDays <= 3 ? 1 : ageDays <= 7 ? 0.75 : ageDays <= 14 ? 0.4 : 0.1;
      return { points: profile.weights.freshness * ratio, ...(ageDays <= 3 ? { positive: "Fresh — under 72 hours" } : {}) };
    },
  },
  {
    key: "signals",
    evaluate: ({ text, profile }) => {
      const positives = profile.positiveKeywords.filter((word) => includesLoose(text, word));
      const negatives = profile.negativeKeywords.filter((word) => includesLoose(text, word));
      const points = Math.min(5, positives.length * 1.5) - Math.min(8, negatives.length * 2.5);
      return { points, ...(positives.length ? { positive: positives.slice(0, 3).join(" + ") } : {}), ...(negatives.length ? { negative: negatives.slice(0, 2).join(", ") } : {}) };
    },
  },
];

export function scoreVacancy(vacancy: VacancyInput, normalized: NormalizedVacancy, profile: CandidateProfile): ScoreResult {
  const text = `${vacancy.title}\n${vacancy.description}\n${vacancy.location ?? ""}`;
  const hardKeyword = profile.hardStopKeywords.find((keyword) => includesLoose(text, keyword));
  const results = rules.map((rule) => ({ key: rule.key, ...rule.evaluate({ vacancy, normalized, profile, text }) }));
  const positiveReasons = results.flatMap((result) => result.positive ? [result.positive] : []);
  const negativeReasons = results.flatMap((result) => result.negative ? [result.negative] : []);
  const hardStops = results.flatMap((result) => result.hardStop ? [result.hardStop] : []);
  if (hardKeyword) hardStops.push(`Blocked keyword: ${hardKeyword}`);
  const raw = results.reduce((sum, result) => sum + result.points, 0);
  const score = Math.round(Math.max(0, Math.min(hardStops.length ? HARD_STOP_SCORE_CAP : 100, raw)));
  const bucket = score >= BUCKET_A_THRESHOLD ? "A" : score >= BUCKET_B_THRESHOLD ? "B" : "C";
  const recommendation = hardStops.length ? "SKIP — HARD STOP" : score >= 85 ? "APPLY + DIRECT OUTREACH" : score >= 70 ? "APPLY" : score >= 55 ? "REVIEW" : "SKIP";
  return { score, bucket, positiveReasons, negativeReasons, hardStops, breakdown: Object.fromEntries(results.map((result) => [result.key, Math.round(result.points)])), recommendation };
}

export function analyzeVacancy(vacancy: VacancyInput, profile: CandidateProfile) {
  const normalized = normalizeVacancy(vacancy);
  return { normalized, score: scoreVacancy(vacancy, normalized, profile) };
}
