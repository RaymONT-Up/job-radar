import { NextResponse } from "next/server";
import { resetAllData } from "@/server/repository";

export async function POST() {
  try { await resetAllData(); return NextResponse.json({ ok: true }); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Clear failed" }, { status: 500 }); }
}
