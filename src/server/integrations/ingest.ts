import type { CandidateProfile, VacancyInput } from "@/entities/types";
import { normalizeVacancy } from "@/features/vacancy-scoring/normalize";
import { scoreVacancy } from "@/features/vacancy-scoring/score";
import { saveVacancy, updateVacancyVerification } from "@/server/repository";

export type IngestItem = { id: string; title: string; company: string; url: string | null; score: number; bucket: string; saved: boolean; duplicate: boolean; hardStops: string[]; descriptionLanguage: string; requiredLanguages: string[] };
export type IngestResult = { source: string; fetched: number; uniqueFetched: number; saved: number; duplicates: number; compatible: number; hardFiltered: number; languageFiltered: number; items: IngestItem[]; error?: string };

export async function ingestVacancies(source: string, vacancies: VacancyInput[], fetched: number, profile: CandidateProfile): Promise<IngestResult> {
  let duplicates = 0; let saved = 0; let hardFiltered = 0; let languageFiltered = 0;
  const items: IngestItem[] = [];
  for (const vacancy of vacancies) {
    const normalized = normalizeVacancy(vacancy);
    const score = scoreVacancy(vacancy, normalized, profile);
    if (score.hardStops.length) hardFiltered += 1;
    if (score.hardStops.some((reason) => reason.startsWith("Рабочий язык"))) languageFiltered += 1;
    const stored = await saveVacancy(vacancy, profile.id);
    if (stored.duplicate) duplicates += 1;
    else saved += 1;
    await updateVacancyVerification(stored.id, { status: "active", reason: `Получено через ${source}`, checkedAt: new Date() });
    items.push({ id: stored.id, title: vacancy.title, company: vacancy.company, url: vacancy.url ?? null, score: score.score, bucket: score.bucket, saved: !stored.duplicate, duplicate: stored.duplicate, hardStops: score.hardStops, descriptionLanguage: normalized.descriptionLanguage, requiredLanguages: normalized.requiredLanguages });
  }
  return { source, fetched, uniqueFetched: vacancies.length, saved, duplicates, compatible: vacancies.length - hardFiltered, hardFiltered, languageFiltered, items };
}
