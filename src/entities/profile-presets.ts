import type { CandidateProfile } from "./types";
import { DEFAULT_WEIGHTS } from "./constants";

export type RolePresetKey = "frontend" | "product-design" | "web3" | "software-engineer";

export interface RolePreset extends Omit<CandidateProfile, "id" | "name" | "isActive"> {
  key: RolePresetKey;
  label: string;
  description: string;
}

const common = {
  yearsExperience: 3,
  location: "Remote",
  remotePreference: "remote" as const,
  salaryTarget: 3000,
  salaryFloor: 2500,
  salaryCurrency: "USD",
  proofPoints: [],
  negativeKeywords: ["relocation required", "office only", "people management"],
  preferredLocations: ["Remote", "Worldwide"],
  allowedRemoteRegions: ["worldwide", "global"],
  languages: ["English"],
  languagePolicy: "flexible" as const,
  weights: DEFAULT_WEIGHTS,
};

export const ROLE_PRESETS: Record<RolePresetKey, RolePreset> = {
  frontend: {
    ...common,
    key: "frontend",
    label: "Frontend / Web",
    description: "React, TypeScript, JavaScript, web interfaces and design systems.",
    targetTitles: ["Frontend Engineer", "Senior Frontend Engineer", "React Developer", "Frontend Software Engineer", "Web Developer", "Product Engineer"],
    strongSkills: ["JavaScript", "TypeScript", "React", "Next.js", "GraphQL", "WebSocket", "Redux", "Tailwind", "Storybook"],
    secondarySkills: ["Node.js", "Vue", "Angular", "React Native", "Jest", "Playwright"],
    strongDomains: ["B2B SaaS", "fintech", "trading", "crypto", "e-commerce", "data visualization", "dashboards"],
    positiveKeywords: ["performance", "design system", "architecture", "realtime", "charts", "accessibility"],
    hardStopKeywords: ["QA Engineer", "DevOps Engineer", "Java Backend", ".NET Backend", "Senior Backend", "Engineering Manager", "office only"],
  },
  "product-design": {
    ...common,
    key: "product-design",
    label: "Product Design",
    description: "Product, UX/UI and design-system roles with measurable product impact.",
    targetTitles: ["Product Designer", "Senior Product Designer", "UX Designer", "UI/UX Designer", "Product Design Lead", "UX Researcher"],
    strongSkills: ["Figma", "UX", "UI", "Product Design", "Design Systems", "User Research", "Prototyping", "Information Architecture"],
    secondarySkills: ["FigJam", "Usability Testing", "Motion Design", "HTML", "CSS", "Accessibility"],
    strongDomains: ["B2B SaaS", "fintech", "e-commerce", "mobile apps", "marketplaces", "developer tools"],
    positiveKeywords: ["design system", "discovery", "user research", "conversion", "activation", "usability"],
    hardStopKeywords: ["graphic designer only", "print designer", "3d artist", "office only"],
  },
  web3: {
    ...common,
    key: "web3",
    label: "Web3 / Crypto",
    description: "Frontend and product engineering for crypto, blockchain and dApps.",
    targetTitles: ["Web3 Frontend Engineer", "Blockchain Frontend Engineer", "Crypto Frontend Engineer", "Web3 Engineer", "DApp Developer", "Crypto Product Engineer"],
    strongSkills: ["JavaScript", "TypeScript", "React", "Next.js", "Web3", "Ethers", "Wagmi", "Viem", "WalletConnect", "GraphQL"],
    secondarySkills: ["Solidity", "Hardhat", "Foundry", "Rust", "Node.js", "The Graph"],
    strongDomains: ["crypto", "blockchain", "DeFi", "NFT", "DAO", "fintech", "trading", "wallets"],
    positiveKeywords: ["on-chain", "wallet", "smart contract", "token", "liquidity", "protocol"],
    hardStopKeywords: ["QA Engineer", "DevOps Engineer", "office only"],
  },
  "software-engineer": {
    ...common,
    key: "software-engineer",
    label: "Software Engineer",
    description: "Product and full-stack engineering with room to choose a specialization.",
    targetTitles: ["Software Engineer", "Full Stack Engineer", "Product Engineer", "Frontend Software Engineer", "Backend Engineer", "Web Engineer"],
    strongSkills: ["TypeScript", "JavaScript", "React", "Node.js", "Python", "SQL", "REST API", "Git", "Testing"],
    secondarySkills: ["Next.js", "GraphQL", "Docker", "PostgreSQL", "AWS", "Go"],
    strongDomains: ["B2B SaaS", "fintech", "e-commerce", "developer tools", "marketplaces", "AI products"],
    positiveKeywords: ["ownership", "architecture", "testing", "performance", "product thinking", "mentoring"],
    hardStopKeywords: ["office only", "people management", "unpaid"],
  },
};

const familyMatchers: Array<{ key: RolePresetKey; terms: RegExp }> = [
  { key: "product-design", terms: /product designer|\bux\b|\bui\b|figma|design system|user research|продуктов.*дизайн|дизайнер/i },
  { key: "web3", terms: /web3|blockchain|crypto|defi|smart contract|solidity|д[еэ]фи|блокчейн|крипто/i },
  { key: "frontend", terms: /front.?end|react|typescript|javascript|web developer|верстк|фронтенд/i },
  { key: "software-engineer", terms: /software engineer|full.?stack|backend|developer|engineer|разработчик|программист/i },
];

export function inferRolePreset(text: string): RolePresetKey {
  const scores = Object.fromEntries(familyMatchers.map(({ key }) => [key, 0])) as Record<RolePresetKey, number>;
  for (const { key, terms } of familyMatchers) if (terms.test(text)) scores[key] += 1;
  if (scores.frontend && /web3|blockchain|crypto|solidity|крипто/i.test(text)) scores.web3 += 2;
  return (Object.entries(scores).sort(([, a], [, b]) => b - a)[0]?.[0] as RolePresetKey) ?? "software-engineer";
}

export function profileFromResume(text: string, current: CandidateProfile) {
  const presetKey = inferRolePreset(text);
  const preset = ROLE_PRESETS[presetKey];
  const foundSkills = [...preset.strongSkills, ...preset.secondarySkills].filter((skill) => new RegExp(`\\b${skill.replace(/[.+#]/g, "\\$&")}\\b`, "i").test(text));
  const proofPoints = text.split(/\n+/).map((line) => line.trim().replace(/^[-*•]\s*/, "")).filter((line) => line.length >= 20 && /\d|%|сократ|увелич|запуст|разработ|built|improv|reduced|increased|launched/i.test(line)).slice(0, 8);
  const languages = [/русск|russian/i.test(text) ? "Russian" : "", /англ|english/i.test(text) ? "English" : ""].filter(Boolean);
  const profile = {
    ...current,
    ...preset,
    id: current.id,
    name: current.name,
    isActive: current.isActive,
    strongSkills: [...new Set([...foundSkills, ...current.strongSkills])].slice(0, 18),
    proofPoints: proofPoints.length ? proofPoints : current.proofPoints,
    languages: [...new Set([...(languages.length ? languages : []), ...current.languages])],
    languagePolicy: current.languagePolicy,
  } satisfies CandidateProfile;
  return { profile, presetKey };
}
