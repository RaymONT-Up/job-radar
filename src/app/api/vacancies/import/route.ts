import { NextResponse } from "next/server";
import { z } from "zod";
import { detectSource } from "@/features/vacancy-scoring/normalize";
import { getActiveProfile, saveVacancy } from "@/server/repository";
import { updateVacancyVerification } from "@/server/repository";
import { verifyVacancyAvailability } from "@/server/integrations/availability";
import { enrichCompanyDetails } from "@/server/integrations/company";

const schema = z.object({
  url: z.string().trim().optional().default(""), title: z.string().trim().min(2), company: z.string().trim().min(2),
  description: z.string().trim().min(30), location: z.string().trim().optional().default(""), source: z.string().trim().optional(),
});

export async function POST(request: Request) {
  try {
    const value = schema.parse(await request.json());
    const profile = await getActiveProfile();
    if (!profile) return NextResponse.json({ error: "No active profile" }, { status: 400 });
    const source = value.source || detectSource(value.url);
    const vacancy = { ...value, url: value.url || null, source, location: value.location || null, ...enrichCompanyDetails({ url: value.url, description: value.description, source }) };
    const result = await saveVacancy(vacancy, profile.id);
    if (!result.duplicate && vacancy.url) {
      const verification = await verifyVacancyAvailability({ ...vacancy, sourceId: null, isDemo: false });
      await updateVacancyVerification(result.id, verification);
      return NextResponse.json({ ...result, verification }, { status: 201 });
    }
    return NextResponse.json(result, { status: result.duplicate ? 200 : 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not save vacancy" }, { status: 400 });
  }
}
