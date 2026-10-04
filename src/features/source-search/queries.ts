import type { CandidateProfile } from "@/entities/types";

const familyQueries = (profile: CandidateProfile) => {
  const targetText = profile.targetTitles.join(" ");
  const text = [...profile.targetTitles, ...profile.strongSkills, ...profile.strongDomains].join(" ");
  if (/product designer|\bux\b|\bui\b|figma|design system|дизайн/i.test(targetText)) return ["Product Designer", "UX Designer", "UI/UX Designer", "Product Design", "Figma", "Design System", "Продуктовый дизайнер"];
  if (/web3|blockchain|crypto|defi|solidity|крипто|блокчейн/i.test(targetText)) return ["Web3 Frontend", "Blockchain Frontend", "Crypto Product Engineer", "Web3", "React crypto", "Blockchain", "Frontend крипто"];
  if (/front.?end|react|typescript|javascript|web developer|фронтенд/i.test(targetText)) return ["Frontend Engineer", "React Developer", "Web Developer", "Frontend TypeScript", "Фронтенд разработчик"];
  if (/product designer|\bux\b|\bui\b|figma|design system|дизайн/i.test(text)) return ["Product Designer", "UX Designer", "UI/UX Designer", "Product Design", "Figma", "Design System", "Продуктовый дизайнер"];
  if (/web3|blockchain|crypto|defi|solidity|крипто|блокчейн/i.test(text)) return ["Web3 Frontend", "Blockchain Frontend", "Crypto Product Engineer", "Web3", "React crypto", "Blockchain", "Frontend крипто"];
  if (/front.?end|react|typescript|javascript|web developer|фронтенд/i.test(text)) return ["Frontend Engineer", "React Developer", "Web Developer", "Frontend TypeScript", "Фронтенд разработчик"];
  return ["Software Engineer", "Full Stack Engineer", "Product Engineer", "Web Engineer", "Разработчик ПО"];
};

export function buildSearchQueries(profile: CandidateProfile) {
  const titles = profile.targetTitles.slice(0, 6);
  const skills = profile.strongSkills.filter((skill) => /react|typescript|next|javascript|vue|angular|figma|ux|ui|web3|blockchain|solidity|node|python|java|go/i.test(skill)).slice(0, 6);
  const combined = titles.slice(0, 2).flatMap((title) => skills.slice(0, 2).map((skill) => `${title} ${skill}`));
  return [...new Set([...familyQueries(profile), ...titles, ...combined, ...skills])].slice(0, 12);
}
