import { NextResponse } from "next/server";
import { restoreAllData } from "@/server/repository";
import { backupSchema } from "@/server/backup-schema";

export async function POST(request: Request) {
  try { const payload = backupSchema.parse(await request.json()); await restoreAllData(payload); return NextResponse.json({ ok: true }); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Invalid Job Radar backup" }, { status: 400 }); }
}
