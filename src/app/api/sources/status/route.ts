import { NextResponse } from "next/server";
import { getSourceCatalogWithCredentials } from "@/server/integrations/catalog";

export async function GET() {
  return NextResponse.json(getSourceCatalogWithCredentials());
}
