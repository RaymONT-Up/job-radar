import type { VacancyInput } from "@/entities/types";

export function canonicalizeUrl(value?: string | null) {
  if (!value) return null;
  try {
    const url = new URL(value);
    ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "ref", "trk"].forEach((key) => url.searchParams.delete(key));
    url.hash = "";
    return url.toString().replace(/\/$/, "").toLowerCase();
  } catch {
    return value.trim().toLowerCase();
  }
}

export function normalizeIdentity(value: string) {
  return value.toLowerCase()
    .replace(/\b(senior|middle\+?|mid.level|junior)\b/g, "")
    .replace(/[^a-zа-я0-9]+/gi, " ")
    .trim()
    .replace(/\b(incorporated|inc|llc|ltd|limited|gmbh|corp(?:oration)?|company|co)\b$/g, "")
    .replace(/\s+/g, " ").trim();
}

export function dedupeKey(vacancy: VacancyInput) {
  if (vacancy.sourceId) return `source:${vacancy.source.toLowerCase()}:${vacancy.sourceId}`;
  const url = canonicalizeUrl(vacancy.url);
  if (url) return `url:${url}`;
  return `identity:${normalizeIdentity(vacancy.company)}:${normalizeIdentity(vacancy.title)}`;
}
