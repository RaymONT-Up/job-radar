import { NextResponse } from "next/server";
import { z } from "zod";
import type { CandidateProfile } from "@/entities/types";
import { getActiveProfile } from "@/server/repository";
import { ingestVacancies, type IngestResult } from "@/server/integrations/ingest";
import { discoverPublicUrls, parsePastedText, parsePublicUrl } from "@/server/integrations/local-parser";

const schema = z.object({
  urls: z.array(z.string().url("Проверьте формат URL вакансии")).max(20, "За один запуск можно обработать до 20 ссылок").default([]),
  discoverUrls: z.array(z.string().url("Проверьте URL страницы поиска")).max(10, "За один запуск можно обработать до 10 страниц поиска").default([]),
  discoverLimit: z.number().int().min(1).max(50).default(20),
  pasted: z.array(z.object({
    url: z.string().url("Проверьте URL для вставленного текста").nullable().optional(),
    title: z.string().optional().default(""),
    company: z.string().optional().default(""),
    description: z.string().trim().min(30, "Вставьте минимум 30 символов полного описания вакансии"),
    location: z.string().nullable().optional(),
  })).max(20).default([]),
});

async function mapLimit<T, R>(items: T[], limit: number, mapper: (item: T) => Promise<R>) {
  const output = new Array<R>(items.length);
  let cursor = 0;
  async function worker() {
    while (cursor < items.length) {
      const index = cursor++;
      output[index] = await mapper(items[index]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return output;
}

export async function POST(request: Request) {
  try {
    const raw = await request.json() as { urls?: unknown; discoverUrls?: unknown; pasted?: unknown };
    // Backward compatibility for an older client: it sent a short optional text
    // together with a valid URL, causing Zod to reject the whole URL request.
    if ((Array.isArray(raw.urls) && raw.urls.length || Array.isArray(raw.discoverUrls) && raw.discoverUrls.length) && Array.isArray(raw.pasted)) {
      raw.pasted = raw.pasted.filter((item) => item && typeof item === "object" && typeof (item as { description?: unknown }).description === "string" && (item as { description: string }).description.trim().length >= 30);
    }
    const input = schema.parse(raw);
    if (!input.urls.length && !input.discoverUrls.length && !input.pasted.length) return NextResponse.json({ error: "Добавьте URL вакансии, страницу поиска или вставьте полный текст" }, { status: 400 });
    const profile = await getActiveProfile();
    if (!profile) return NextResponse.json({ error: "No active profile" }, { status: 400 });
    const results: IngestResult[] = await mapLimit(input.urls, 4, async (url) => {
      try {
        const vacancy = await parsePublicUrl(url);
        return await ingestVacancies("Local Parser", [vacancy], 1, profile as CandidateProfile);
      } catch (error) {
        return { source: url, fetched: 0, uniqueFetched: 0, saved: 0, duplicates: 0, compatible: 0, hardFiltered: 0, languageFiltered: 0, items: [], error: error instanceof Error ? error.message : "Не удалось прочитать страницу" };
      }
    });
    const discoveryResults = await mapLimit(input.discoverUrls, 2, async (listingUrl) => {
      try {
        const links = await discoverPublicUrls(listingUrl, input.discoverLimit);
        if (!links.length) return [{ source: listingUrl, fetched: 0, uniqueFetched: 0, saved: 0, duplicates: 0, compatible: 0, hardFiltered: 0, languageFiltered: 0, items: [], error: "На странице не найдены ссылки на вакансии" } satisfies IngestResult];
        return mapLimit(links, 4, async (url) => {
          try { return await ingestVacancies("Parser discovery", [await parsePublicUrl(url)], 1, profile as CandidateProfile); }
          catch (error) { return { source: url, fetched: 0, uniqueFetched: 0, saved: 0, duplicates: 0, compatible: 0, hardFiltered: 0, languageFiltered: 0, items: [], error: error instanceof Error ? error.message : "Не удалось прочитать вакансию" } satisfies IngestResult; }
        });
      } catch (error) {
        return [{ source: listingUrl, fetched: 0, uniqueFetched: 0, saved: 0, duplicates: 0, compatible: 0, hardFiltered: 0, languageFiltered: 0, items: [], error: error instanceof Error ? error.message : "Не удалось открыть страницу поиска" } satisfies IngestResult];
      }
    });
    results.push(...discoveryResults.flat());
    for (const pasted of input.pasted) {
      try {
        const vacancy = parsePastedText(pasted);
        results.push(await ingestVacancies("pasted Local Parser", [vacancy], 1, profile as CandidateProfile));
      } catch (error) {
        results.push({ source: "pasted text", fetched: 0, uniqueFetched: 0, saved: 0, duplicates: 0, compatible: 0, hardFiltered: 0, languageFiltered: 0, items: [], error: error instanceof Error ? error.message : "Parser failed" });
      }
    }
    return NextResponse.json({ results });
  } catch (error) {
    const message = error instanceof z.ZodError
      ? error.issues.map((issue) => issue.message).join(". ")
      : error instanceof Error ? error.message : "Не удалось запустить Parser";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
