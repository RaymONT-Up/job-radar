import { NextResponse } from "next/server";
import { candidateProfileSchema } from "@/entities/candidate/schema";
import type { CandidateProfile } from "@/entities/types";
import { deleteProfile, getProfiles, saveProfile, setActiveProfile } from "@/server/repository";

export async function POST(request: Request) {
  try { const profile = candidateProfileSchema.parse(await request.json()); await saveProfile(profile); return NextResponse.json({ id: profile.id }); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Could not save profile" }, { status: 400 }); }
}

export async function PATCH(request: Request) {
  try {
    const value = await request.json() as { id?: string; languages?: string[]; languagePolicy?: "strict" | "flexible" };
    if (!value.id) throw new Error("Profile id required");
    if (value.languages || value.languagePolicy) {
      const profile = (await getProfiles()).find((item) => item.id === value.id);
      if (!profile) throw new Error("Profile not found");
      await saveProfile({ ...profile, languages: value.languages ?? profile.languages, languagePolicy: value.languagePolicy ?? profile.languagePolicy } as CandidateProfile);
    } else await setActiveProfile(value.id);
    return NextResponse.json({ ok: true });
  }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Could not activate profile" }, { status: 400 }); }
}

export async function DELETE(request: Request) {
  try { const id = new URL(request.url).searchParams.get("id"); if (!id) throw new Error("Profile id required"); await deleteProfile(id); return NextResponse.json({ ok: true }); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Could not delete profile" }, { status: 400 }); }
}
