import { NextResponse } from "next/server";
import type { CandidateProfile, NormalizedVacancy, ScoreResult, VacancyInput } from "@/entities/types";
import { generateAiOfferPackage, getAiStatus } from "@/server/ai/offer-package";
import { getActiveProfile, getVacancyDetail } from "@/server/repository";

export async function GET() {
  return NextResponse.json(getAiStatus());
}

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const profile = await getActiveProfile();
    if (!profile) return NextResponse.json({ error: "Активный профиль не найден" }, { status: 400 });
    const row = await getVacancyDetail(id, profile.id);
    if (!row?.score || !row.normalized) return NextResponse.json({ error: "Вакансия или scoring не найдены" }, { status: 404 });
    const result = await generateAiOfferPackage({ profile: profile as CandidateProfile, vacancy: row.vacancy as VacancyInput, normalized: { ...row.normalized, descriptionLanguage: row.normalized.descriptionLanguage ?? "Unknown", requiredLanguages: row.normalized.requiredLanguages ?? [] } as NormalizedVacancy, score: row.score as ScoreResult });
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof Error && error.message === "AI_KEY_MISSING") return NextResponse.json({ error: "Добавьте OpenAI API key в Settings → API-ключи" }, { status: 412 });
    return NextResponse.json({ error: error instanceof Error ? error.message : "AI generation failed" }, { status: 502 });
  }
}
