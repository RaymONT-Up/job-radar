import { NextResponse } from "next/server";
import { z } from "zod";
import { APPLICATION_STATUSES } from "@/entities/types";
import { getActiveProfile, updateApplicationStatus } from "@/server/repository";

const schema = z.object({ vacancyId: z.string().min(1), status: z.enum(APPLICATION_STATUSES) });

export async function POST(request: Request) {
  try {
    const input = schema.parse(await request.json());
    const profile = await getActiveProfile();
    if (!profile) return NextResponse.json({ error: "No active profile" }, { status: 400 });
    const applicationId = await updateApplicationStatus(input.vacancyId, profile.id, input.status);
    return NextResponse.json({ applicationId, status: input.status });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Invalid request" }, { status: 400 });
  }
}
