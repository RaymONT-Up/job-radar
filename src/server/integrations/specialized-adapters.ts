import type { VacancyInput } from "@/entities/types";
import { getSourceCredential } from "@/server/credentials";
import { isRoleRelevant } from "@/server/integrations/relevance";
import type { JobSourceAdapter } from "@/server/integrations/types";

const USER_AGENT = "JobRadar/0.4 (+local-first job search tool)";

function decodeHtml(value: string) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&#x27;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)))
    .replace(/\s+/g, " ")
    .trim();
}

function stripHtml(value: string) {
  return decodeHtml(value.replace(/<br\s*\/?\s*>/gi, "\n").replace(/<[^>]+>/g, " "));
}

function text(value: unknown) {
  return typeof value === "string" ? value : value == null ? "" : String(value);
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function relevantToQueries(title: string, description: string, queries: string[]) {
  if (!isRoleRelevant(title, description, queries)) return false;
  const haystack = `${title} ${description}`.toLowerCase();
  const terms = queries.flatMap((query) => query.toLowerCase().split(/\s+/)).filter((item) => item.length >= 4);
  return !terms.length || terms.some((term) => haystack.includes(term));
}

async function request(url: string, accept: string) {
  let lastError: Error | null = null;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const response = await fetch(url, { headers: { Accept: accept, "User-Agent": USER_AGENT }, signal: AbortSignal.timeout(20_000) });
      if (response.ok) return response;
      const error = new Error(`${response.status} from ${new URL(url).hostname}`);
      if (response.status !== 429 && response.status < 500) throw error;
      lastError = error;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error("Network request failed");
    }
    if (attempt < 2) await new Promise((resolve) => setTimeout(resolve, 800 * (attempt + 1)));
  }
  throw lastError ?? new Error("Network request failed");
}

function xmlTag(block: string, name: string) {
  return block.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)<\\/${name}>`, "i"))?.[1]?.trim() ?? "";
}

export function parseHhRss(xml: string): VacancyInput[] {
  const rows: VacancyInput[] = [];
  for (const block of xml.split("<item>").slice(1)) {
    const url = decodeHtml(xmlTag(block, "link"));
    const id = url.match(/vacancy\/(\d+)/)?.[1];
    const title = decodeHtml(xmlTag(block, "title"));
    if (!id || !title) continue;
    const rawDescription = block.match(/<description><!\[CDATA\[([\s\S]*?)\]\]><\/description>/i)?.[1] ?? xmlTag(block, "description");
    const description = stripHtml(rawDescription);
    const company = decodeHtml(rawDescription.match(/Вакансия компании:\s*([^<\n|]+)/i)?.[1] ?? "") || "Unknown company";
    const location = decodeHtml(rawDescription.match(/Регион:\s*([^<\n|]+)/i)?.[1] ?? "") || null;
    rows.push({ source: "HH RSS", sourceId: id, url, title, company, description: description || title, location, publishedAt: xmlTag(block, "pubDate"), companyDataSource: `HH public RSS · ${url}` });
  }
  return rows;
}

export class HhRssAdapter implements JobSourceAdapter {
  readonly source = "HH RSS";
  normalize(raw: unknown) { return raw as VacancyInput; }
  async fetch({ queries, limit = 60 }: { queries: string[]; limit?: number }) {
    const picked = queries.filter((query) => /front|react|typescript|javascript|фронт/i.test(query)).slice(0, 3);
    const searches = picked.length ? picked : ["Frontend Engineer"];
    const byId = new Map<string, VacancyInput>();
    for (const query of searches) {
      const params = new URLSearchParams({ text: query, search_field: "name", period: "30" });
      const response = await request(`https://hh.ru/search/vacancy/rss?${params}`, "application/rss+xml,application/xml,text/xml");
      for (const vacancy of parseHhRss(await response.text())) if (vacancy.sourceId) byId.set(vacancy.sourceId, vacancy);
      if (byId.size >= limit) break;
      await new Promise((resolve) => setTimeout(resolve, 700));
    }
    return { vacancies: [...byId.values()].slice(0, limit), fetched: byId.size };
  }
}

export function parseJobRss(xml: string, source: string): VacancyInput[] {
  const clean = (value: string) => stripHtml(value.replace(/<!\[CDATA\[/gi, "").replace(/\]\]>/g, ""));
  const rows: VacancyInput[] = [];
  for (const block of xml.split("<item>").slice(1)) {
    const rawTitle = decodeHtml(clean(xmlTag(block, "title")));
    const url = decodeHtml(clean(xmlTag(block, "link") || xmlTag(block, "guid")));
    const description = clean(xmlTag(block, "description") || xmlTag(block, "content:encoded"));
    if (!rawTitle || !url || !/^https?:\/\//i.test(url)) continue;
    const [titlePart, companyPart] = rawTitle.split(/\s+at\s+|\s+@\s+/i);
    const title = titlePart?.trim() || rawTitle;
    const company = companyPart?.trim() || source;
    rows.push({ source, sourceId: url, url, title, company, description: description || rawTitle, location: /remote|worldwide|anywhere/i.test(`${rawTitle} ${description}`) ? "Remote" : null, remoteType: /remote|worldwide|anywhere/i.test(`${rawTitle} ${description}`) ? "remote" : null, publishedAt: decodeHtml(xmlTag(block, "pubDate")) || null, companyEmail: description.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0]?.toLowerCase() ?? null, companyDataSource: `${source} public RSS · ${url}` });
  }
  return rows;
}

export class WeWorkRemotelyAdapter implements JobSourceAdapter {
  readonly source = "We Work Remotely";
  normalize(raw: unknown) { return raw as VacancyInput; }
  async fetch({ queries, limit = 60 }: { queries: string[]; limit?: number }) {
    const response = await request("https://weworkremotely.com/remote-jobs.rss", "application/rss+xml,application/xml,text/xml");
    const all = parseJobRss(await response.text(), this.source);
    const selected = all.filter((item) => relevantToQueries(item.title, item.description, queries));
    return { vacancies: selected.slice(0, limit), fetched: all.length };
  }
}

function getmatchDescription(item: Record<string, unknown>) {
  const parts = [item.description, item.about, item.tasks, item.expectations, item.requirements, item.conditions]
    .flatMap((value) => Array.isArray(value) ? value : [value])
    .map(text)
    .filter(Boolean);
  return stripHtml(parts.join("\n"));
}

function mapGetmatch(item: Record<string, unknown>, detail: Record<string, unknown> = {}): VacancyInput {
  const company = record(item.company);
  const merged = { ...item, ...detail };
  const urlValue = text(merged.url || item.url);
  const url = urlValue.startsWith("http") ? urlValue : `https://getmatch.ru${urlValue}`;
  const description = getmatchDescription(merged) || text(merged.position || item.position);
  const locations = Array.isArray(merged.location_items) ? merged.location_items.map((value) => text(record(value).label)).filter(Boolean) : [];
  return {
    source: "Getmatch",
    sourceId: text(merged.id || item.id),
    url,
    title: text(merged.position || item.position),
    company: text(record(merged.company).name || company.name || "Unknown company"),
    description,
    location: locations.join(", ") || null,
    remoteType: /remote|удал/i.test(`${description} ${JSON.stringify(merged.location_items ?? "")}`) ? "remote" : null,
    publishedAt: text(merged.published_at || item.published_at),
    companyWebsite: text(record(merged.company).url || record(merged.company).site) || null,
    companyDataSource: `Getmatch public JSON API · ${url}`,
  };
}

export class GetmatchAdapter implements JobSourceAdapter {
  readonly source = "Getmatch";
  normalize(raw: unknown) { return mapGetmatch(record(raw)); }
  async fetch({ queries, limit = 60 }: { queries: string[]; limit?: number }) {
    const selected: Record<string, unknown>[] = [];
    let fetched = 0;
    for (let page = 0; page < 5 && selected.length < limit; page += 1) {
      const response = await request(`https://getmatch.ru/api/offers?limit=100&offset=${page * 100}`, "application/json");
      const payload = record(await response.json());
      const offers = Array.isArray(payload.offers) ? payload.offers.map(record) : [];
      fetched += offers.length;
      selected.push(...offers.filter((item) => relevantToQueries(text(item.position), getmatchDescription(item), queries)));
      if (offers.length < 100) break;
    }
    const unique = [...new Map(selected.map((item) => [text(item.id), item])).values()].slice(0, limit);
    const vacancies: VacancyInput[] = [];
    for (let offset = 0; offset < unique.length; offset += 5) {
      const batch = await Promise.all(unique.slice(offset, offset + 5).map(async (item) => {
        try {
          const response = await request(`https://getmatch.ru/api/offers/${encodeURIComponent(text(item.id))}`, "application/json");
          return mapGetmatch(item, record(await response.json()));
        } catch { return mapGetmatch(item); }
      }));
      vacancies.push(...batch);
    }
    return { vacancies, fetched };
  }
}

export function parseLinkedinCards(html: string): VacancyInput[] {
  const rows: VacancyInput[] = [];
  for (const block of html.split(/<li[\s>]/i).slice(1)) {
    const urlRaw = block.match(/href=["']([^"']*\/jobs\/view\/[^"'?]+[^"']*)["']/i)?.[1];
    const id = urlRaw?.match(/view\/(\d+)/)?.[1];
    const title = stripHtml(block.match(/base-search-card__title[^>]*>([\s\S]*?)<\//i)?.[1] ?? "");
    if (!urlRaw || !id || !title) continue;
    const company = stripHtml(block.match(/base-search-card__subtitle[^>]*>([\s\S]*?)<\//i)?.[1] ?? "") || "Unknown company";
    const location = stripHtml(block.match(/job-search-card__location[^>]*>([\s\S]*?)<\//i)?.[1] ?? "") || null;
    const publishedAt = block.match(/datetime=["']([^"']+)["']/i)?.[1] ?? null;
    const url = decodeHtml(urlRaw).replace(/\?.*$/, "");
    rows.push({ source: "LinkedIn guest", sourceId: id, url, title, company, description: `${title}. ${company}. ${location ?? "Location not specified"}.`, location, remoteType: /remote/i.test(location ?? "") ? "remote" : null, publishedAt, companyDataSource: `LinkedIn public guest listing · ${url}` });
  }
  return rows;
}

export class LinkedinGuestAdapter implements JobSourceAdapter {
  readonly source = "LinkedIn guest";
  normalize(raw: unknown) { return raw as VacancyInput; }
  async fetch({ queries, limit = 40 }: { queries: string[]; limit?: number }) {
    const picked = queries.filter((query) => /front|react|typescript|javascript|web/i.test(query)).slice(0, 3);
    const searches = picked.length ? picked : ["frontend engineer"];
    const byId = new Map<string, VacancyInput>();
    for (const keywords of searches) {
      for (let start = 0; start < Math.min(limit, 40); start += 10) {
        const params = new URLSearchParams({ keywords, location: "Worldwide", f_TPR: "r604800", start: String(start) });
        const response = await request(`https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search?${params}`, "text/html");
        const rows = parseLinkedinCards(await response.text());
        for (const vacancy of rows) if (vacancy.sourceId) byId.set(vacancy.sourceId, vacancy);
        if (rows.length < 10 || byId.size >= limit) break;
        await new Promise((resolve) => setTimeout(resolve, 400));
      }
      if (byId.size >= limit) break;
    }
    return { vacancies: [...byId.values()].filter((item) => relevantToQueries(item.title, item.description, queries)).slice(0, limit), fetched: byId.size };
  }
}

export function parseTelegramFeed(channel: string, html: string, queries: string[]): VacancyInput[] {
  const rows: VacancyInput[] = [];
  for (const block of html.split('data-post="').slice(1)) {
    const id = block.match(/^[^/]+\/(\d+)"/)?.[1];
    const body = block.match(/tgme_widget_message_text[^>]*>([\s\S]*?)<\/div>/i)?.[1] ?? "";
    const description = stripHtml(body);
    if (!id || description.length < 20 || !relevantToQueries(description.split(/[\n.!?]/)[0] ?? description, description, queries)) continue;
    const firstLine = description.split(/[\n.!?]/).map((item) => item.trim()).find((item) => item.length >= 5) ?? "Frontend vacancy";
    const externalUrl = [...body.matchAll(/href=["']([^"']+)["']/gi)].map((match) => decodeHtml(match[1])).find((url) => /^https?:\/\//.test(url) && !/t\.me/.test(url));
    const postUrl = `https://t.me/${channel}/${id}`;
    const email = description.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0]?.toLowerCase() ?? null;
    rows.push({ source: "Telegram", sourceId: `${channel}:${id}`, url: externalUrl || postUrl, title: firstLine.slice(0, 160), company: "From Telegram channel", description, location: /remote|удал/i.test(description) ? "Remote" : null, remoteType: /remote|удал/i.test(description) ? "remote" : null, companyEmail: email, companyDataSource: `Public Telegram channel · ${postUrl}` });
  }
  return rows;
}

export class TelegramPublicAdapter implements JobSourceAdapter {
  readonly source = "Telegram public channels";
  normalize(raw: unknown) { return raw as VacancyInput; }
  async fetch({ queries, limit = 60 }: { queries: string[]; limit?: number }) {
    const configured = getSourceCredential("telegram", "channels") ?? process.env.TELEGRAM_JOB_CHANNELS ?? "";
    const channels = configured.split(/[\s,;]+/).map((item) => item.trim().replace(/^@/, "").replace(/^https?:\/\/t\.me\/(?:s\/)?/, "").replace(/\/$/, "")).filter(Boolean).slice(0, 20);
    if (!channels.length) throw new Error("Добавьте публичные Telegram-каналы в Settings → Telegram sources");
    const rows: VacancyInput[] = [];
    for (const channel of channels) {
      try {
        const response = await request(`https://t.me/s/${encodeURIComponent(channel)}`, "text/html");
        rows.push(...parseTelegramFeed(channel, await response.text(), queries));
      } catch { /* One unavailable channel must not fail the whole source. */ }
      if (rows.length >= limit) break;
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
    return { vacancies: rows.slice(0, limit), fetched: rows.length };
  }
}
