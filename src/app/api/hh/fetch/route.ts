import { NextResponse } from "next/server";
import { z } from "zod";
import type { CandidateProfile } from "@/entities/types";
import { normalizeVacancy } from "@/features/vacancy-scoring/normalize";
import { scoreVacancy } from "@/features/vacancy-scoring/score";
import { HHAdapter, DEFAULT_HH_QUERIES } from "@/server/integrations/hh/adapter";
import { getActiveProfile, saveVacancy, updateVacancyVerification } from "@/server/repository";

const schema = z.object({ queries: z.array(z.string().min(2)).min(1).max(12).optional(), limit: z.number().int().min(5).max(100).optional() });

export async function POST(request: Request) {
  try {
    const input = schema.parse(await request.json());
    const profile = await getActiveProfile();
    if (!profile) return NextResponse.json({ error: "No active profile" }, { status: 400 });
    const adapter = new HHAdapter();
    const result = await adapter.fetch({ queries: input.queries ?? DEFAULT_HH_QUERIES, limit: input.limit ?? 60 });
    let duplicates = 0; let hardFiltered = 0; let languageFiltered = 0; let aFit = 0; let bFit = 0; let saved = 0;
    for (const vacancy of result.vacancies) {
      const normalized = normalizeVacancy(vacancy);
      const score = scoreVacancy(vacancy, normalized, profile as CandidateProfile);
      if (score.hardStops.length) hardFiltered += 1;
      if (score.hardStops.some((reason) => reason.startsWith("Рабочий язык"))) languageFiltered += 1;
      if (score.bucket === "A") aFit += 1;
      if (score.bucket === "B") bFit += 1;
      const stored = await saveVacancy(vacancy, profile.id);
      if (stored.duplicate) duplicates += 1; else saved += 1;
      await updateVacancyVerification(stored.id, { status: "active", reason: "Подтверждено официальным API HeadHunter", checkedAt: new Date() });
    }
    return NextResponse.json({ fetched: result.fetched, uniqueFetched: result.vacancies.length, duplicates, saved, hardFiltered, languageFiltered, aFit, bFit });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "HH sync failed" }, { status: 502 });
  }
}
