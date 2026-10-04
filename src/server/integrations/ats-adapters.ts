import type { VacancyInput } from "@/entities/types";

const stripHtml = (value: string) => value.replace(/<br\s*\/?\s*>/gi, "\n").replace(/<[^>]+>/g, " ").replace(/&nbsp;/gi, " ").replace(/&amp;/gi, "&").replace(/\s+/g, " ").trim();
const text = (value: unknown) => typeof value === "string" ? value : value == null ? "" : String(value);
const email = (value: string) => value.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0]?.toLowerCase() ?? null;
async function getJson(url: string) {
  const response = await fetch(url, { headers: { Accept: "application/json", "User-Agent": "JobRadar/0.2 (company board connector)" }, signal: AbortSignal.timeout(20_000) });
  if (!response.ok) throw new Error(`${response.status} from ${new URL(url).hostname}`);
  return response.json() as Promise<unknown>;
}

function metadata(description: string, boardUrl: string, source: string) {
  return { companyEmail: email(description), companyWebsite: null, companyDataSource: `${source} public board API · ${boardUrl}` };
}

async function greenhouse(boardUrl: URL, queries: string[], limit: number) {
  const token = boardUrl.pathname.split("/").filter(Boolean)[0];
  if (!token) throw new Error("Greenhouse URL must look like https://boards.greenhouse.io/company");
  const raw = await getJson(`https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(token)}/jobs?content=true`) as { jobs?: unknown[] };
  const jobs = (raw.jobs ?? []).filter((item): item is Record<string, unknown> => Boolean(item && typeof item === "object"));
  const terms = queries.map((query) => query.toLowerCase());
  const selected = jobs.filter((item) => !terms.length || terms.some((term) => `${item.title ?? ""} ${item.content ?? ""}`.toLowerCase().includes(term))).slice(0, limit);
  return { source: "Greenhouse", fetched: jobs.length, vacancies: selected.map((item) => { const description = stripHtml(text(item.content)); const url = text(item.absolute_url); return { source: "Greenhouse", sourceId: text(item.id), url, title: text(item.title), company: token, description, location: text((item.location as Record<string, unknown> | undefined)?.name) || null, publishedAt: text(item.updated_at), ...metadata(description, boardUrl.toString(), "Greenhouse") } satisfies VacancyInput; }) };
}

async function lever(boardUrl: URL, queries: string[], limit: number) {
  const site = boardUrl.pathname.split("/").filter(Boolean)[0];
  if (!site) throw new Error("Lever URL must look like https://jobs.lever.co/company");
  const raw = await getJson(`https://api.lever.co/v0/postings/${encodeURIComponent(site)}?mode=json`) as unknown;
  const jobs = Array.isArray(raw) ? raw.filter((item): item is Record<string, unknown> => Boolean(item && typeof item === "object")) : [];
  const terms = queries.map((query) => query.toLowerCase());
  const selected = jobs.filter((item) => !terms.length || terms.some((term) => `${item.text ?? ""} ${item.descriptionPlain ?? item.description ?? ""} ${item.categories ?? ""}`.toLowerCase().includes(term))).slice(0, limit);
  return { source: "Lever", fetched: jobs.length, vacancies: selected.map((item) => { const description = stripHtml(text(item.descriptionPlain || item.description)); const url = text(item.hostedUrl || item.applyUrl); return { source: "Lever", sourceId: text(item.id), url, title: text(item.text), company: site, description, location: text((item.categories as Record<string, unknown> | undefined)?.location) || null, remoteType: /remote/i.test(`${item.workplaceType} ${description}`) ? "remote" : null, publishedAt: item.createdAt ? new Date(Number(item.createdAt)) : null, ...metadata(description, boardUrl.toString(), "Lever") } satisfies VacancyInput; }) };
}

async function ashby(boardUrl: URL, queries: string[], limit: number) {
  const slug = boardUrl.pathname.split("/").filter(Boolean)[0];
  if (!slug) throw new Error("Ashby URL must look like https://jobs.ashbyhq.com/company");
  const raw = await getJson(`https://api.ashbyhq.com/posting-api/job-board/${encodeURIComponent(slug)}`) as { jobs?: unknown[] };
  const jobs = (raw.jobs ?? []).filter((item): item is Record<string, unknown> => Boolean(item && typeof item === "object"));
  const terms = queries.map((query) => query.toLowerCase());
  const selected = jobs.filter((item) => !terms.length || terms.some((term) => `${item.title ?? ""} ${item.descriptionHtml ?? item.description ?? ""}`.toLowerCase().includes(term))).slice(0, limit);
  return { source: "Ashby", fetched: jobs.length, vacancies: selected.map((item) => { const description = stripHtml(text(item.descriptionHtml || item.description)); const url = text(item.jobUrl || item.applyUrl || boardUrl.toString()); return { source: "Ashby", sourceId: text(item.jobUrl || item.id || url), url, title: text(item.title), company: slug, description, location: Array.isArray(item.location) ? item.location.join(", ") : text(item.location) || null, remoteType: /remote/i.test(`${item.location} ${description}`) ? "remote" : null, publishedAt: text(item.publishedAt), ...metadata(description, boardUrl.toString(), "Ashby") } satisfies VacancyInput; }) };
}

export async function fetchAtsBoards(urls: string[], queries: string[], limit: number) {
  const results: Array<{ source: string; fetched: number; vacancies: VacancyInput[]; error?: string }> = [];
  for (const value of urls.slice(0, 20)) {
    try {
      const url = new URL(value);
      const result = url.hostname.includes("greenhouse") ? await greenhouse(url, queries, limit) : url.hostname.includes("lever") ? await lever(url, queries, limit) : url.hostname.includes("ashby") ? await ashby(url, queries, limit) : null;
      if (!result) throw new Error("Поддерживаются только Greenhouse, Lever и Ashby board URLs");
      results.push(result);
    } catch (error) {
      results.push({ source: value, fetched: 0, vacancies: [], error: error instanceof Error ? error.message : "ATS board sync failed" });
    }
  }
  return results;
}
