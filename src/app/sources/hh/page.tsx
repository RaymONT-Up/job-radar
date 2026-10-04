import { HHSourceClient } from "./hh-source-client";
import { SourcesClient } from "../sources-client";
import { getActiveProfile } from "@/server/repository";
import { buildSearchQueries } from "@/features/source-search/queries";
import type { CandidateProfile } from "@/entities/types";

export default async function HhSourcePage() {
  const profile = await getActiveProfile();
  const initialQueries = profile ? buildSearchQueries(profile as CandidateProfile) : undefined;
  return <div className="space-y-8"><div><h1 className="text-2xl font-black md:text-3xl">Источники вакансий</h1><p className="mt-1 text-[var(--muted)]">Официальные API, публичные ленты и страницы компаний в одном ранжированном списке.</p></div><SourcesClient initialQueries={initialQueries} languageSettings={profile ? { id: profile.id, languages: profile.languages, policy: profile.languagePolicy } : undefined} /><details className="panel p-5"><summary className="cursor-pointer font-black">Отдельная синхронизация HH</summary><div className="mt-5"><HHSourceClient /></div></details></div>;
}
