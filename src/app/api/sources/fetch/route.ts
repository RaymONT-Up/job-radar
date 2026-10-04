import { NextResponse } from "next/server";
import { z } from "zod";
import type { CandidateProfile } from "@/entities/types";
import { HHAdapter, DEFAULT_HH_QUERIES } from "@/server/integrations/hh/adapter";
import { HhRssAdapter } from "@/server/integrations/specialized-adapters";
import { getPublicAdapters } from "@/server/integrations/catalog";
import { fetchAtsBoards } from "@/server/integrations/ats-adapters";
import { ingestVacancies, type IngestResult } from "@/server/integrations/ingest";
import { getActiveProfile } from "@/server/repository";
import { sourceFetchLimiter } from "@/shared/lib/rate-limit";

const schema = z.object({
  sources: z.array(z.string()).max(12).default(["hh", "remoteok", "remotive", "arbeitnow"]),
  queries: z.array(z.string().min(2)).min(1).max(12).default(DEFAULT_HH_QUERIES),
  limit: z.number().int().min(5).max(100).default(60),
  atsUrls: z.array(z.string().url()).max(20).default([]),
});

export async function POST(request: Request) {
  if (!sourceFetchLimiter.allow(request)) {
    const retryAfter = sourceFetchLimiter.retryAfterSeconds(request);
    return NextResponse.json({ error: `Подождите ${retryAfter} сек. перед следующим запросом.` }, { status: 429 });
  }
  try {
    const input = schema.parse(await request.json());
    const profile = await getActiveProfile();
    if (!profile) return NextResponse.json({ error: "No active profile" }, { status: 400 });
    const tasks: Promise<IngestResult>[] = [];
    if (input.sources.includes("hh")) {
      tasks.push((async () => {
      try {
        const result = await new HHAdapter().fetch({ queries: input.queries, limit: input.limit });
        return await ingestVacancies("официальный HH API", result.vacancies, result.fetched, profile as CandidateProfile);
      } catch (apiError) {
        try {
          const fallback = await new HhRssAdapter().fetch({ queries: input.queries, limit: input.limit });
          return await ingestVacancies("HH public RSS (API fallback)", fallback.vacancies, fallback.fetched, profile as CandidateProfile);
        } catch (rssError) {
          const apiMessage = apiError instanceof Error ? apiError.message : "HH API failed";
          const rssMessage = rssError instanceof Error ? rssError.message : "HH RSS failed";
          return { source: "HH", fetched: 0, uniqueFetched: 0, saved: 0, duplicates: 0, compatible: 0, hardFiltered: 0, languageFiltered: 0, items: [], error: `API: ${apiMessage}; RSS fallback: ${rssMessage}` };
        }
      }
      })());
    }
    for (const adapter of getPublicAdapters(input.sources.filter((source) => source !== "hh"))) {
      tasks.push((async () => { try {
        const result = await adapter.fetch({ queries: input.queries, limit: input.limit });
        return await ingestVacancies(`${adapter.source} API`, result.vacancies, result.fetched, profile as CandidateProfile);
      } catch (error) {
        return { source: adapter.source, fetched: 0, uniqueFetched: 0, saved: 0, duplicates: 0, compatible: 0, hardFiltered: 0, languageFiltered: 0, items: [], error: error instanceof Error ? error.message : `${adapter.source} sync failed` };
      } })());
    }
    const settled = await Promise.allSettled(tasks);
    const results: IngestResult[] = settled.map(r => r.status === "fulfilled" ? r.value : { source: "Unknown", fetched: 0, uniqueFetched: 0, saved: 0, duplicates: 0, compatible: 0, hardFiltered: 0, languageFiltered: 0, items: [], error: String(r.reason) });
    const atsResults = await fetchAtsBoards(input.atsUrls, input.queries, input.limit);
    for (const result of atsResults) {
      if (result.error) results.push({ source: result.source, fetched: 0, uniqueFetched: 0, saved: 0, duplicates: 0, compatible: 0, hardFiltered: 0, languageFiltered: 0, items: [], error: result.error });
      else results.push(await ingestVacancies(`${result.source} public board API`, result.vacancies, result.fetched, profile as CandidateProfile));
    }
    return NextResponse.json({ results, totals: results.reduce((acc, item) => ({ fetched: acc.fetched + item.fetched, saved: acc.saved + item.saved, duplicates: acc.duplicates + item.duplicates, compatible: acc.compatible + item.compatible, hardFiltered: acc.hardFiltered + item.hardFiltered, languageFiltered: acc.languageFiltered + item.languageFiltered }), { fetched: 0, saved: 0, duplicates: 0, compatible: 0, hardFiltered: 0, languageFiltered: 0 }) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Source sync failed" }, { status: 400 });
  }
}
