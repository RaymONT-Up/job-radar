import { NextResponse } from "next/server";
import { z } from "zod";
import type { CandidateProfile } from "@/entities/types";
import { detectSource, normalizeVacancy } from "@/features/vacancy-scoring/normalize";
import { scoreVacancy } from "@/features/vacancy-scoring/score";
import { getActiveProfile } from "@/server/repository";

const schema = z.object({
  url: z.string().trim().optional().default(""),
  title: z.string().trim().min(2),
  company: z.string().trim().min(2),
  description: z.string().trim().min(30),
  location: z.string().trim().optional().default(""),
  source: z.string().trim().optional(),
});

export async function POST(request: Request) {
  try {
    const value = schema.parse(await request.json());
    const profile = await getActiveProfile();
    if (!profile) return NextResponse.json({ error: "No active profile" }, { status: 400 });
    const vacancy = { ...value, url: value.url || null, source: value.source || detectSource(value.url), location: value.location || null };
    const normalized = normalizeVacancy(vacancy);
    const score = scoreVacancy(vacancy, normalized, profile as CandidateProfile);
    return NextResponse.json({ vacancy, normalized, score });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not analyze vacancy" }, { status: 400 });
  }
}
