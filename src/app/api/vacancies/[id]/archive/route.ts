import { NextResponse } from "next/server";
import { archiveVacancy } from "@/server/repository";

export async function POST(_: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  await archiveVacancy(id);
  return NextResponse.json({ ok: true });
}
