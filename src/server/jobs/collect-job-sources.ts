import type { CandidateProfile, VacancyInput } from "@/entities/types";
import { buildSearchQueries } from "@/features/source-search/queries";
import { getSourceCredential } from "@/server/credentials";
import { sqlite } from "@/server/db/client";
import { fetchAtsBoards } from "@/server/integrations/ats-adapters";
import { getPublicAdapters } from "@/server/integrations/catalog";
import { HHAdapter } from "@/server/integrations/hh/adapter";
import { ingestVacancies } from "@/server/integrations/ingest";
import { discoverPublicUrls, parsePublicUrl } from "@/server/integrations/local-parser";
import { HhRssAdapter } from "@/server/integrations/specialized-adapters";
import { getActiveProfile } from "@/server/repository";

async function main() {
  const profile = await getActiveProfile();
  if (!profile) throw new Error("No active candidate profile");
  const queries = buildSearchQueries(profile as CandidateProfile);
  const results: Array<{ source: string; fetched: number; saved: number; error?: string }> = [];

  try {
    let payload;
    try { payload = await new HHAdapter().fetch({ queries, limit: 80 }); }
    catch { payload = await new HhRssAdapter().fetch({ queries, limit: 80 }); }
    results.push(await ingestVacancies("HH scheduled connector", payload.vacancies, payload.fetched, profile as CandidateProfile));
  } catch (error) {
    results.push({ source: "HH", fetched: 0, saved: 0, error: error instanceof Error ? error.message : "HH failed" });
  }

  const adapterIds = [
    "getmatch", "remoteok", "remotive", "arbeitnow", "linkedin", "weworkremotely",
    ...(getSourceCredential("telegram", "channels") || process.env.TELEGRAM_JOB_CHANNELS ? ["telegram"] : []),
    ...(getSourceCredential("adzuna", "appId") || process.env.ADZUNA_APP_ID ? ["adzuna"] : []),
    ...(getSourceCredential("superjob", "appId") || process.env.SUPERJOB_APP_ID ? ["superjob"] : []),
    ...(getSourceCredential("jooble", "apiKey") || process.env.JOOBLE_API_KEY ? ["jooble"] : []),
  ];
  for (const adapter of getPublicAdapters(adapterIds)) {
    try {
      const payload = await adapter.fetch({ queries, limit: 80 });
      results.push(await ingestVacancies(`${adapter.source} scheduled connector`, payload.vacancies, payload.fetched, profile as CandidateProfile));
    } catch (error) {
      results.push({ source: adapter.source, fetched: 0, saved: 0, error: error instanceof Error ? error.message : "Source failed" });
    }
  }

  const rawBoards = getSourceCredential("career", "boards") ?? process.env.CAREER_BOARD_URLS ?? "";
  const boards = rawBoards.split(/[\n,;]+/).map((item) => item.trim()).filter(Boolean);
  for (const board of await fetchAtsBoards(boards, queries, 80)) {
    if (board.error) results.push({ source: board.source, fetched: 0, saved: 0, error: board.error });
    else results.push(await ingestVacancies(`${board.source} scheduled board`, board.vacancies, board.fetched, profile as CandidateProfile));
  }

  const rawPages = getSourceCredential("career", "pages") ?? process.env.CAREER_PAGE_URLS ?? "";
  const pages = rawPages.split(/[\n,;]+/).map((item) => item.trim()).filter(Boolean).slice(0, 20);
  for (const page of pages) {
    try {
      const links = await discoverPublicUrls(page, 30);
      const vacancies: VacancyInput[] = [];
      for (const link of links) {
        try { vacancies.push(await parsePublicUrl(link)); }
        catch { /* One malformed or blocked vacancy must not fail the company page. */ }
      }
      results.push(await ingestVacancies(`Company watchlist · ${new URL(page).hostname}`, vacancies, links.length, profile as CandidateProfile));
    } catch (error) {
      results.push({ source: `Company watchlist · ${page}`, fetched: 0, saved: 0, error: error instanceof Error ? error.message : "Career page failed" });
    }
  }

  for (const result of results) console.log(`${result.source}: fetched=${result.fetched}, saved=${result.saved}${result.error ? `, error=${result.error}` : ""}`);
  const failed = results.filter((result) => result.error).length;
  console.log(`Completed: ${results.length} connectors, ${failed} errors, ${results.reduce((sum, result) => sum + result.saved, 0)} new vacancies`);
}

main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => sqlite.close());
