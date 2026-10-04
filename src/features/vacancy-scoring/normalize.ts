import type { NormalizedVacancy, VacancyInput } from "@/entities/types";

const SKILLS: Record<string, RegExp> = {
  // Frontend
  React: /\breact(?:\.js)?\b/i,
  TypeScript: /\btypescript\b|\bts\b/i,
  JavaScript: /\bjavascript\b|\bjs\b/i,
  "Next.js": /\bnext(?:\.js|js)?\b/i,
  GraphQL: /\bgraphql\b/i,
  Apollo: /\bapollo\b/i,
  WebSocket: /\bwebsockets?\b|\bsocket\.io\b/i,
  SSE: /\bserver.sent events?\b|\bsse\b/i,
  "TanStack Query": /\btanstack(?: query)?\b|\breact query\b/i,
  Redux: /\bredux(?: toolkit)?\b/i,
  Zustand: /\bzustand\b/i,
  Tailwind: /\btailwind\b/i,
  Storybook: /\bstorybook\b/i,
  Jest: /\bjest\b/i,
  Angular: /\bangular\b/i,
  Vue: /\bvue(?:\.js)?\b/i,
  // Backend & infra
  Node: /\bnode(?:\.js|js)?\b/i,
  Python: /\bpython\b/i,
  Java: /\bjava\b(?!script)/i,
  Go: /\bgolang\b|\bgo\b(?!ogle)/i,
  Rust: /\brust\b/i,
  PostgreSQL: /\bpostgresql\b|\bpostgres\b/i,
  Docker: /\bdocker\b/i,
  Kubernetes: /\bkubernetes\b|\bk8s\b/i,
  AWS: /\baws\b|amazon web services/i,
  // Design
  Figma: /\bfigma\b/i,
  // Web3
  Solidity: /\bsolidity\b/i,
  "Web3.js": /\bweb3\.js\b|\bwagmi\b|\bethers\.js\b/i,
};

const DOMAINS: Record<string, RegExp> = {
  trading: /\btrading\b|\bexchange\b|\bcapital markets?\b/i,
  fintech: /\bfintech\b|\bpayments?\b|\bbanking\b/i,
  crypto: /\bcrypto\b|\bblockchain\b|\bweb3\b/i,
  "market data": /\bmarket data\b|\bquotes?\b|\border book\b/i,
  "data visualization": /\bdata visuali[sz]ation\b|\bcharts?\b|\bd3\.js\b/i,
  "B2B SaaS": /\bb2b\b|\bsaas\b/i,
  CRM: /\bcrm\b|customer relationship/i,
  "e-commerce": /\be.?commerce\b|\bmarketplace\b/i,
};

function matches(text: string, dictionary: Record<string, RegExp>) {
  return Object.entries(dictionary).filter(([, rx]) => rx.test(text)).map(([name]) => name);
}

function detectTextLanguage(text: string): NormalizedVacancy["descriptionLanguage"] {
  const cyrillic = (text.match(/[а-яё]/gi) ?? []).length;
  const latin = (text.match(/[a-z]/gi) ?? []).length;
  if (cyrillic < 30 && latin < 30) return "Unknown";
  if (cyrillic > 30 && latin > 30 && Math.min(cyrillic, latin) / Math.max(cyrillic, latin) > 0.22) return "Mixed";
  return cyrillic > latin ? "Russian" : "English";
}

function detectRequiredLanguages(text: string, descriptionLanguage: NormalizedVacancy["descriptionLanguage"]) {
  const required: string[] = [];
  const englishRequirement = /(?:english|английск(?:ий|ого|ом)?)[^.!\n]{0,55}(?:a2|b1|b2|c1|c2|fluent|advanced|upper.?intermediate|professional|обязател|требу)|(?:a2|b1|b2|c1|c2|fluent|advanced|upper.?intermediate)[^.!\n]{0,30}(?:english|английск)/i;
  const englishNegated = /(?:english|английск\w*)[^.!\n]{0,35}(?:не\s+(?:обязател\w*|требу\w*)|not\s+required|optional)|(?:no|без)\s+(?:english|английск\w*)/i;
  const russianRequirement = /(?:russian|русск(?:ий|ого|ом)?)[^.!\n]{0,55}(?:fluent|native|professional|обязател|требу|свободн)|(?:fluent|native|professional|свободн)[^.!\n]{0,30}(?:russian|русск)/i;
  // A short English title/snippet is not enough to conclude that English is the working language.
  // Require either an explicit language requirement or a substantive English description.
  const positiveEnglishRequirement = englishRequirement.test(text) && !englishNegated.test(text);
  if (positiveEnglishRequirement || (descriptionLanguage === "English" && text.length > 180 && !englishNegated.test(text))) required.push("English");
  if (russianRequirement.test(text) || descriptionLanguage === "Russian") required.push("Russian");
  return required;
}

export function normalizeVacancy(vacancy: VacancyInput): NormalizedVacancy {
  const text = `${vacancy.title}\n${vacancy.description}\n${vacancy.location ?? ""}`;
  const yearMatches = [...text.matchAll(/(?:at least|min(?:imum)?\s*)?(\d{1,2})(?:\s*[–—-]\s*(\d{1,2}))?\+?\s*(?:years?|yrs?|лет|года?)/gi)];
  const years = yearMatches.map((match) => ({ min: Number(match[1]), max: match[2] ? Number(match[2]) : null }));
  const salaryMatch = text.match(/(?:\$|USD\s*)(\d[\d\s,]{1,})(?:\s*(?:[–—-]|to)\s*(?:\$|USD\s*)?(\d[\d\s,]{1,}))?/i);
  const salary = vacancy.salaryMin != null || vacancy.salaryMax != null ? {
    min: vacancy.salaryMin ?? null,
    max: vacancy.salaryMax ?? null,
    currency: vacancy.salaryCurrency ?? "USD",
  } : salaryMatch ? {
    min: Number(salaryMatch[1].replace(/[\s,]/g, "")),
    max: salaryMatch[2] ? Number(salaryMatch[2].replace(/[\s,]/g, "")) : null,
    currency: "USD",
  } : null;
  const remote = /remote worldwide|anywhere|global remote/i.test(text)
    ? "worldwide"
    : /remote|удален/i.test(text)
      ? "remote"
      : /hybrid|гибрид/i.test(text)
        ? "hybrid"
        : /on.?site|office only|в офисе/i.test(text)
          ? "onsite"
          : vacancy.remoteType ?? null;
  const seniority = /\blead\b|tech lead/i.test(vacancy.title) ? "lead" : /\bsenior\b/i.test(vacancy.title) ? "senior" : /\bmiddle\+?\b|mid.level/i.test(vacancy.title) ? "middle" : /\bjunior\b/i.test(vacancy.title) ? "junior" : null;
  const descriptionLanguage = detectTextLanguage(text);
  const requiredLanguages = detectRequiredLanguages(text, descriptionLanguage);
  const detectedLanguage = /(?:english|английск)[^.!\n]{0,25}\bC1\b|\bC1\b[^.!\n]{0,25}(?:english|английск)/i.test(text) ? "English C1" : /(?:english|английск)[^.!\n]{0,25}\bB2\b|\bB2\b[^.!\n]{0,25}(?:english|английск)/i.test(text) ? "English B2" : /fluent english|advanced english/i.test(text) ? "English advanced" : requiredLanguages.join(" + ") || null;
  const restrictions = ["Poland", "Germany", "USA", "United States", "UK", "Russia"].filter((country) => new RegExp(`(?:only|must be|based in|located in)[^.!]{0,35}${country}`, "i").test(text));

  return {
    skills: matches(text, SKILLS),
    domains: matches(text, DOMAINS),
    detectedLanguage,
    descriptionLanguage,
    requiredLanguages,
    detectedRemote: remote,
    detectedSeniority: seniority,
    // FIX: Use Math.min — we want the lowest bar mentioned (e.g. "1-3 years React, 5+ total" → 1 is the relevant floor).
    // Math.max was previously used, incorrectly treating the highest mention as the requirement.
    detectedYearsMin: vacancy.experienceMin ?? (years.length ? Math.min(...years.map((item) => item.min)) : null),
    detectedYearsMax: vacancy.experienceMax ?? (years.find((item) => item.max)?.max ?? null),
    detectedSalary: salary,
    locationRestrictions: restrictions,
    rawSignals: { source: vacancy.source, matchedSkills: matches(text, SKILLS), matchedDomains: matches(text, DOMAINS) },
  };
}

export function detectSource(url: string): string {
  if (/linkedin\.com/i.test(url)) return "LinkedIn";
  if (/hh\.ru|hh\.kz/i.test(url)) return "HH";
  if (/t\.me|telegram/i.test(url)) return "Telegram";
  if (/getmatch/i.test(url)) return "Getmatch";
  if (/career\.habr|habr\.com/i.test(url)) return "Habr";
  return "Other";
}
