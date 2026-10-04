import type { CandidateProfile } from "./types";

export const DEFAULT_WEIGHTS = {
  titleMatch: 20,
  skillMatch: 25,
  domainMatch: 15,
  salaryMatch: 10,
  remoteMatch: 10,
  experienceMatch: 10,
  freshness: 5,
  languageMatch: 10,
} as const;

export const DEFAULT_PROFILE: CandidateProfile = {
  id: "profile-default",
  name: "Frontend Engineer",
  targetTitles: [
    "Frontend Engineer",
    "Senior Frontend Engineer",
    "Middle Frontend Engineer",
    "Middle+ Frontend Engineer",
    "React Developer",
    "TypeScript Engineer",
    "Frontend Software Engineer",
    "Product Engineer",
    // Russian/Cyrillic variants
    "Фронтенд-разработчик",
    "Фронтендер",
    "Фронтенд разработчик",
    "Веб-разработчик",
    "React разработчик",
  ],
  yearsExperience: 4,
  location: "Europe",
  remotePreference: "remote",
  salaryTarget: 3000,
  salaryFloor: 2500,
  salaryCurrency: "USD",
  strongSkills: ["JavaScript", "TypeScript", "React", "Next.js", "Jest", "Tailwind"],
  secondarySkills: ["Node.js", "Express", "React Native"],
  strongDomains: ["fintech", "B2B SaaS", "e-commerce"],
  proofPoints: [
    "Optimized performance of complex data-heavy interfaces",
    "Designed frontend architecture and conducted architectural reviews",
    "Mentored developers and improved team engineering practices",
  ],
  positiveKeywords: ["performance", "design system", "architecture", "mentoring"],
  negativeKeywords: ["6+ years", "relocation required", "backend-heavy", "people management"],
  hardStopKeywords: ["Angular-first", "Vue-only", "WordPress", "QA Engineer", "DevOps Engineer", "Java Backend", ".NET Backend", "office only"],
  preferredLocations: ["Remote", "Worldwide", "Europe"],
  allowedRemoteRegions: ["worldwide", "global", "europe", "emea", "cis"],
  languages: ["English", "Russian"],
  languagePolicy: "strict",
  weights: DEFAULT_WEIGHTS,
  isActive: true,
};

export const SOURCES = ["HH", "LinkedIn", "Telegram", "Getmatch", "Habr", "Direct", "Other"] as const;
