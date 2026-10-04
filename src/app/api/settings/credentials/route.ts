import { NextResponse } from "next/server";
import { z } from "zod";
import { credentialStatus, setSourceCredentials } from "@/server/credentials";

export async function GET() {
  return NextResponse.json({ credentials: credentialStatus(), storage: "local-encrypted" });
}

const schema = z.object({ source: z.string().min(1), values: z.record(z.string(), z.string()).default({}) });

export async function POST(request: Request) {
  try {
    const input = schema.parse(await request.json());
    setSourceCredentials(input.source, input.values);
    return NextResponse.json({ ok: true, credentials: credentialStatus(), message: "Ключи сохранены локально. Секретные значения не возвращаются." });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not save credentials" }, { status: 400 });
  }
}
