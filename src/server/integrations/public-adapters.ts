import type { VacancyInput } from "@/entities/types";
import type { JobSourceAdapter } from "@/server/integrations/types";
import { getSourceCredential } from "@/server/credentials";
import { GetmatchAdapter, LinkedinGuestAdapter, TelegramPublicAdapter, WeWorkRemotelyAdapter } from "@/server/integrations/specialized-adapters";
export { isFrontendRelevant } from "@/server/integrations/relevance";
import { isRoleRelevant } from "@/server/integrations/relevance";

const mojibakeMarkers = (value: string) => (value.match(/(?:Ã.|Â.|â|ð|â€™|â€œ|â€)/g) ?? []).length;

export function fixMojibake(value: string) {
  if (!mojibakeMarkers(value)) return value;
  const repaired = Buffer.from(value, "latin1").toString("utf8");
  return mojibakeMarkers(repaired) < mojibakeMarkers(value) ? repaired : value;
}

const stripHtml = (value: string) => fixMojibake(value)
  .replace(/<br\s*\/?\s*>/gi, "\n")
  .replace(/<[^>]+>/g, " ")
  .replace(/&nbsp;/gi, " ")
  .replace(/&amp;/gi, "&")
  .replace(/&#39;/gi, "'")
  .replace(/&quot;/gi, '"')
  .replace(/\s+/g, " ")
  .trim();

const asString = (value: unknown) => typeof value === "string" ? value : value == null ? "" : String(value);
const asNumber = (value: unknown) => typeof value === "number" && Number.isFinite(value) ? value : Number.isFinite(Number(value)) ? Number(value) : null;

function publicEmail(text: string) {
  const email = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0]?.toLowerCase();
  if (!email || /(?:noreply|no-reply|example\.com|sentry\.io|webpack)/i.test(email)) return null;
  return email;
}

function websiteFrom(value: unknown) {
  const url = asString(value).trim();
  return /^https?:\/\/[^\s]+$/i.test(url) ? url : null;
}

function sourceMeta(vacancy: { description: string; sourceUrl: string; sourceName: string; companyWebsite?: unknown }) {
  return {
    companyEmail: publicEmail(vacancy.description),
    companyWebsite: websiteFrom(vacancy.companyWebsite),
    companyDataSource: `${vacancy.sourceName} API · ${vacancy.sourceUrl}`,
  };
}

async function fetchJson(url: string, headers: Record<string, string> = {}) {
  const response = await fetch(url, { headers: { Accept: "application/json", "User-Agent": "JobRadar/0.2 (local-first job search tool)", ...headers }, signal: AbortSignal.timeout(20_000) });
  if (!response.ok) throw new Error(`${response.status} from ${new URL(url).hostname}`);
  return response.json() as Promise<unknown>;
}

function mapRemoteOk(item: Record<string, unknown>): VacancyInput {
  const description = stripHtml(asString(item.description));
  const url = asString(item.url || (item.slug ? `https://remoteok.com/remote-jobs/${item.slug}` : ""));
  return { source: "Remote OK", sourceId: asString(item.id || item.slug), url, title: fixMojibake(asString(item.position)), company: fixMojibake(asString(item.company || "Unknown company")), description, location: fixMojibake(asString(item.location)) || "Remote", remoteType: "remote", salaryMin: asNumber(item.salary_min), salaryMax: asNumber(item.salary_max), salaryCurrency: "USD", publishedAt: asString(item.date || item.epoch), ...sourceMeta({ description, sourceUrl: url, sourceName: "Remote OK" }) };
}

export class RemoteOkAdapter implements JobSourceAdapter {
  readonly source = "Remote OK";
  async fetch({ queries, limit = 60 }: { queries: string[]; limit?: number }) {
    const raw = await fetchJson(`https://remoteok.com/api?tag=dev`) as unknown;
    const items = Array.isArray(raw) ? raw.filter((item): item is Record<string, unknown> => Boolean(item && typeof item === "object" && "position" in item)) : [];
    const terms = queries.map((query) => query.toLowerCase()).filter(Boolean);
    const filtered = items.filter((item) => isRoleRelevant(item.position, `${item.description ?? ""} ${item.tags ?? ""}`, queries) && (!terms.length || terms.some((term) => `${item.position ?? ""} ${item.description ?? ""} ${item.tags ?? ""}`.toLowerCase().includes(term))));
    return { vacancies: filtered.slice(0, limit).map(mapRemoteOk), fetched: items.length };
  }
  normalize(raw: unknown) { return mapRemoteOk(raw as Record<string, unknown>); }
}

function mapRemotive(item: Record<string, unknown>): VacancyInput {
  const description = stripHtml(asString(item.description));
  const url = asString(item.url);
  return { source: "Remotive", sourceId: asString(item.id), url, title: asString(item.title), company: asString(item.company_name || "Unknown company"), description, location: asString(item.candidate_required_location) || "Remote", remoteType: "remote", salaryMin: null, salaryMax: null, salaryCurrency: "USD", publishedAt: asString(item.publication_date), ...sourceMeta({ description, sourceUrl: url, sourceName: "Remotive" }) };
}

export class RemotiveAdapter implements JobSourceAdapter {
  readonly source = "Remotive";
  async fetch({ queries, limit = 60 }: { queries: string[]; limit?: number }) {
    const terms = [...new Set(queries.flatMap((query) => query.split(/\s+/)).filter((term) => /frontend|react|typescript|javascript|next|фронт/i.test(term)))].slice(0, 3);
    const searches = terms.length ? terms : ["frontend"];
    const responses = await Promise.all(searches.map(async (search) => {
      const params = new URLSearchParams({ limit: String(Math.min(limit, 100)), search });
      return fetchJson(`https://remotive.com/api/remote-jobs?${params}`) as Promise<{ jobs?: unknown[]; "job-count"?: number }>;
    }));
    const rawItems = responses.flatMap((response) => response.jobs ?? []).filter((item): item is Record<string, unknown> => Boolean(item && typeof item === "object"));
    const items = [...new Map(rawItems.map((item) => [asString(item.id || item.url), item])).values()];
    const relevant = items.filter((item) => isRoleRelevant(item.title, item.description, queries));
    return { vacancies: relevant.slice(0, limit).map(mapRemotive), fetched: items.length };
  }
  normalize(raw: unknown) { return mapRemotive(raw as Record<string, unknown>); }
}

function mapArbeitnow(item: Record<string, unknown>): VacancyInput {
  const description = stripHtml(asString(item.description));
  const url = asString(item.url || (item.slug ? `https://www.arbeitnow.com/view/${item.slug}` : ""));
  return { source: "Arbeitnow", sourceId: asString(item.slug || item.id || url), url, title: asString(item.title), company: asString(item.company_name || item.company || "Unknown company"), description, location: asString(item.location) || "Remote", remoteType: item.remote ? "remote" : null, publishedAt: asNumber(item.created_at) ? new Date(Number(item.created_at) * 1000) : asString(item.created_at), ...sourceMeta({ description, sourceUrl: url, sourceName: "Arbeitnow", companyWebsite: item.company_url }) };
}

export class ArbeitnowAdapter implements JobSourceAdapter {
  readonly source = "Arbeitnow";
  async fetch({ queries, limit = 60 }: { queries: string[]; limit?: number }) {
    const raw = await fetchJson("https://www.arbeitnow.com/api/job-board-api?page=1") as { data?: unknown[] };
    const items = (raw.data ?? []).filter((item): item is Record<string, unknown> => Boolean(item && typeof item === "object"));
    const terms = queries.map((query) => query.toLowerCase()).filter(Boolean);
    const filtered = items.filter((item) => isRoleRelevant(item.title, `${item.description ?? ""} ${item.tags ?? ""}`, queries) && (!terms.length || terms.some((term) => `${item.title ?? ""} ${item.description ?? ""} ${item.tags ?? ""}`.toLowerCase().includes(term))));
    return { vacancies: filtered.slice(0, limit).map(mapArbeitnow), fetched: items.length };
  }
  normalize(raw: unknown) { return mapArbeitnow(raw as Record<string, unknown>); }
}

function mapAdzuna(item: Record<string, unknown>, country: string): VacancyInput {
  const description = stripHtml(asString(item.description));
  const url = asString(item.redirect_url);
  const company = (item.company as Record<string, unknown> | undefined)?.display_name;
  return { source: "Adzuna", sourceId: `${country}:${asString(item.id)}`, url, title: asString(item.title), company: asString(company || "Unknown company"), description, location: asString((item.location as Record<string, unknown> | undefined)?.display_name) || null, remoteType: /remote|work from home/i.test(`${item.title} ${item.description}`) ? "remote" : null, salaryMin: asNumber(item.salary_min), salaryMax: asNumber(item.salary_max), salaryCurrency: "GBP", publishedAt: asString(item.created), ...sourceMeta({ description, sourceUrl: url, sourceName: "Adzuna", companyWebsite: (item.company as Record<string, unknown> | undefined)?.display_name }) };
}

export class AdzunaAdapter implements JobSourceAdapter {
  readonly source = "Adzuna";
  async fetch({ queries, limit = 60 }: { queries: string[]; limit?: number }) {
    const appId = getSourceCredential("adzuna", "appId") ?? process.env.ADZUNA_APP_ID;
    const appKey = getSourceCredential("adzuna", "appKey") ?? process.env.ADZUNA_APP_KEY;
    if (!appId || !appKey) throw new Error("Adzuna requires ADZUNA_APP_ID and ADZUNA_APP_KEY in .env.local");
    const country = process.env.ADZUNA_COUNTRY ?? "gb";
    const params = new URLSearchParams({ app_id: appId, app_key: appKey, what: queries.join(" "), results_per_page: String(Math.min(limit, 50)), max_days_old: "30", content_type: "application/json" });
    const raw = await fetchJson(`https://api.adzuna.com/v1/api/jobs/${country}/search/1?${params}`) as { results?: unknown[]; count?: number };
    const items = (raw.results ?? []).filter((item): item is Record<string, unknown> => Boolean(item && typeof item === "object"));
    return { vacancies: items.map((item) => mapAdzuna(item, country)), fetched: raw.count ?? items.length };
  }
  normalize(raw: unknown) { return mapAdzuna(raw as Record<string, unknown>, process.env.ADZUNA_COUNTRY ?? "gb"); }
}

function mapSuperJob(item: Record<string, unknown>): VacancyInput {
  const description = stripHtml(asString(item.description));
  const url = asString(item.link);
  const town = (item.town as Record<string, unknown> | undefined)?.title;
  const paymentFrom = asNumber(item.payment_from); const paymentTo = asNumber(item.payment_to);
  return { source: "SuperJob", sourceId: asString(item.id), url, title: asString(item.profession), company: asString(item.firm_name || "Unknown company"), description, location: asString(town) || null, remoteType: item.place_of_work === 1 ? "remote" : null, salaryMin: paymentFrom, salaryMax: paymentTo, salaryCurrency: asString(item.currency) || "RUB", publishedAt: asNumber(item.date_published) ? new Date(Number(item.date_published) * 1000) : null, ...sourceMeta({ description, sourceUrl: url, sourceName: "SuperJob" }) };
}

export class SuperJobAdapter implements JobSourceAdapter {
  readonly source = "SuperJob";
  async fetch({ queries, limit = 60 }: { queries: string[]; limit?: number }) {
    const appId = getSourceCredential("superjob", "appId") ?? process.env.SUPERJOB_APP_ID;
    if (!appId) throw new Error("SuperJob requires SUPERJOB_APP_ID in .env.local");
    const params = new URLSearchParams({ keyword: queries.join(" "), count: String(Math.min(limit, 100)), page: "0" });
    const raw = await fetchJson(`https://api.superjob.ru/2.0/vacancies/?${params}`, { "X-Api-App-Id": appId }) as { objects?: unknown[]; total?: number };
    const items = (raw.objects ?? []).filter((item): item is Record<string, unknown> => Boolean(item && typeof item === "object"));
    return { vacancies: items.map(mapSuperJob), fetched: raw.total ?? items.length };
  }
  normalize(raw: unknown) { return mapSuperJob(raw as Record<string, unknown>); }
}

function joobleHost(value: string) {
  const candidate = value.trim() || "jooble.org";
  const hostname = new URL(candidate.includes("://") ? candidate : `https://${candidate}`).hostname.toLowerCase();
  if (!/(^|\.)jooble\.[a-z.]{2,}$/i.test(hostname)) throw new Error("Jooble domain должен быть региональным доменом Jooble, например jooble.org");
  return hostname;
}

function mapJooble(item: Record<string, unknown>): VacancyInput {
  const description = stripHtml(asString(item.snippet || item.description));
  const url = asString(item.link || item.url);
  return {
    source: "Jooble",
    sourceId: asString(item.id || url),
    url,
    title: asString(item.title),
    company: asString(item.company || "Unknown company"),
    description,
    location: asString(item.location) || null,
    remoteType: /remote|удален|удалён/i.test(`${item.location ?? ""} ${item.title ?? ""} ${description}`) ? "remote" : null,
    salaryMin: null,
    salaryMax: null,
    salaryCurrency: null,
    publishedAt: asString(item.updated),
    ...sourceMeta({ description, sourceUrl: url, sourceName: "Jooble" }),
  };
}

export class JoobleAdapter implements JobSourceAdapter {
  readonly source = "Jooble";
  async fetch({ queries, limit = 60 }: { queries: string[]; limit?: number }) {
    const apiKey = getSourceCredential("jooble", "apiKey") ?? process.env.JOOBLE_API_KEY;
    if (!apiKey) throw new Error("Добавьте Jooble API key в Settings → Интеграции и ключи");
    const domain = joobleHost(getSourceCredential("jooble", "domain") ?? process.env.JOOBLE_DOMAIN ?? "jooble.org");
    const location = getSourceCredential("jooble", "location") ?? process.env.JOOBLE_LOCATION ?? "Remote";
    const keywords = queries.slice(0, 4).join(", ");
    const response = await fetch(`https://${domain}/api/${encodeURIComponent(apiKey)}`, {
      method: "POST",
      headers: { Accept: "application/json", "Content-Type": "application/json", "User-Agent": "JobRadar/0.2 (local-first job search tool)" },
      body: JSON.stringify({ keywords, location, page: "1", ResultOnPage: String(Math.min(limit, 50)), SearchMode: "1" }),
      signal: AbortSignal.timeout(20_000),
    });
    if (!response.ok) throw new Error(`${response.status} from ${domain}`);
    const raw = await response.json() as { jobs?: unknown[]; totalCount?: number };
    const items = (raw.jobs ?? []).filter((item): item is Record<string, unknown> => Boolean(item && typeof item === "object"));
    return { vacancies: items.map(mapJooble), fetched: raw.totalCount ?? items.length };
  }
  normalize(raw: unknown) { return mapJooble(raw as Record<string, unknown>); }
}

export const PUBLIC_ADAPTERS = {
  remoteok: new RemoteOkAdapter(),
  remotive: new RemotiveAdapter(),
  arbeitnow: new ArbeitnowAdapter(),
  getmatch: new GetmatchAdapter(),
  linkedin: new LinkedinGuestAdapter(),
  telegram: new TelegramPublicAdapter(),
  weworkremotely: new WeWorkRemotelyAdapter(),
  adzuna: new AdzunaAdapter(),
  superjob: new SuperJobAdapter(),
  jooble: new JoobleAdapter(),
} as const;

export type PublicSourceId = keyof typeof PUBLIC_ADAPTERS;
