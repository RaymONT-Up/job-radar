import type { VacancyInput } from "@/entities/types";
import { detectSource } from "@/features/vacancy-scoring/normalize";

const stripHtml = (value: string) => value
  .replace(/<script[\s\S]*?<\/script>/gi, " ")
  .replace(/<style[\s\S]*?<\/style>/gi, " ")
  .replace(/<br\s*\/?\s*>/gi, "\n")
  .replace(/<[^>]+>/g, " ")
  .replace(/&nbsp;/gi, " ")
  .replace(/&amp;/gi, "&")
  .replace(/&quot;/gi, '"')
  .replace(/&#39;/gi, "'")
  .replace(/\s+/g, " ")
  .trim();

const decode = (value: string) => value.replace(/\\u0026/g, "&").replace(/\\\//g, "/").replace(/\\"/g, '"');
const field = (html: string, name: string) => decode(html.match(new RegExp(`<meta[^>]+(?:name|property)=["']${name}["'][^>]+content=["']([^"']+)["']`, "i"))?.[1] ?? "");
const publicEmail = (text: string) => {
  const candidate = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0]?.toLowerCase() ?? null;
  return candidate && !/(?:noreply|no-reply|example\.com)$/i.test(candidate) ? candidate : null;
};

function jsonLd(html: string): Record<string, unknown> | null {
  const scripts = [...html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  for (const match of scripts) {
    try {
      const parsed = JSON.parse(match[1]) as unknown;
      const items = Array.isArray(parsed) ? parsed : [parsed];
      const job = items.find((item) => item && typeof item === "object" && (item as Record<string, unknown>)["@type"] === "JobPosting");
      if (job && typeof job === "object") return job as Record<string, unknown>;
    } catch { /* Some sites emit invalid JSON-LD; meta fallback below is intentional. */ }
  }
  return null;
}

function textValue(value: unknown) { return typeof value === "string" ? value : value == null ? "" : String(value); }

export function parsePublicHtml(url: string, html: string): VacancyInput {
  const job = jsonLd(html);
  const organization = job?.hiringOrganization && typeof job.hiringOrganization === "object" ? job.hiringOrganization as Record<string, unknown> : null;
  const jobLocation = job?.jobLocation && typeof job.jobLocation === "object" ? job.jobLocation as Record<string, unknown> : null;
  const address = jobLocation?.address && typeof jobLocation.address === "object" ? jobLocation.address as Record<string, unknown> : null;
  const title = textValue(job?.title || field(html, "og:title") || field(html, "twitter:title"));
  const description = stripHtml(textValue(job?.description || field(html, "description") || html));
  const company = textValue(organization?.name || field(html, "author") || new URL(url).hostname.replace(/^www\./, ""));
  if (!title || description.length < 30) throw new Error("Parser не извлёк заголовок и полное описание. Используйте Capture и вставьте текст вакансии.");
  const website = organization?.sameAs && typeof organization.sameAs === "string" ? organization.sameAs : null;
  return {
    source: detectSource(url), sourceId: url, url, title, company, description,
    location: textValue(address?.addressLocality || address?.addressCountry || field(html, "job:location")) || null,
    remoteType: /remote|удалён|удален/i.test(`${title} ${description}`) ? "remote" : null,
    publishedAt: textValue(job?.datePosted || job?.datePublished) || null,
    companyWebsite: website,
    companyEmail: publicEmail(description),
    companyDataSource: `Local Parser · ${url}`,
  };
}

export async function parsePublicUrl(value: string) {
  const url = new URL(value);
  if (!/^https?:$/.test(url.protocol)) throw new Error("Parser принимает только http(s) URL");
  if (/^(?:localhost|127\.|0\.0\.0\.0|10\.|192\.168\.|169\.254\.|172\.(?:1[6-9]|2\d|3[0-1])\.|\[::1\]|::1$)/i.test(url.hostname) || url.hostname.endsWith(".local")) throw new Error("Parser не обращается к localhost или private network");
  const html = await fetchPublicHtml(url);
  return parsePublicHtml(value, html);
}

async function fetchPublicHtml(url: URL) {
  const response = await fetch(url, { headers: { Accept: "text/html,application/xhtml+xml", "User-Agent": "JobRadar Local Parser/0.3" }, signal: AbortSignal.timeout(15_000) });
  const html = await response.text();
  if (!response.ok) throw new Error(`Страница вернула HTTP ${response.status}`);
  if (/(captcha|access denied|authwall|sign in to continue|войдите, чтобы продолжить)/i.test(html)) throw new Error("Сайт требует браузерную сессию или CAPTCHA. Откройте вакансию и используйте Capture.");
  return html;
}

export function extractJobLinks(baseUrl: string, html: string, limit = 20) {
  const base = new URL(baseUrl);
  const links = [...html.matchAll(/<a\b[^>]*href=["']([^"'#]+)["'][^>]*>/gi)]
    .map((match) => match[1].replace(/&amp;/g, "&"))
    .map((href) => { try { return new URL(href, base); } catch { return null; } })
    .filter((url): url is URL => {
      if (!url || !/^https?:$/.test(url.protocol) || url.hostname !== base.hostname) return false;
      if (!/(?:job|jobs|vacanc|position|career|opening|role|view)/i.test(url.pathname)) return false;
      const path = url.pathname.replace(/\/+$/, "");
      // Do not send the listing/search page itself back through the vacancy parser.
      // A real posting normally has an id or slug after /jobs, /vacancies, etc.
      return !/(?:^|[-\/])(?:remote-)?(?:jobs?|vacanc(?:y|ies)|positions?|search)$/i.test(path);
    })
    .map((url) => url.toString().replace(/#.*$/, ""));
  return [...new Set(links)].filter((url) => url !== base.toString()).slice(0, Math.max(1, Math.min(limit, 50)));
}

export async function discoverPublicUrls(value: string, limit = 20) {
  const url = new URL(value);
  if (!/^https?:$/.test(url.protocol)) throw new Error("Parser принимает только http(s) URL");
  if (/^(?:localhost|127\.|0\.0\.0\.0|10\.|192\.168\.|169\.254\.|172\.(?:1[6-9]|2\d|3[0-1])\.|\[::1\]|::1$)/i.test(url.hostname) || url.hostname.endsWith(".local")) throw new Error("Parser не обращается к localhost или private network");
  return extractJobLinks(value, await fetchPublicHtml(url), limit);
}

export function parsePastedText(value: { url?: string | null; title: string; company: string; description: string; location?: string | null }): VacancyInput {
  if (value.description.trim().length < 30) throw new Error("Вставьте минимум 30 символов текста вакансии");
  const url = value.url?.trim() || null;
  const source = url ? detectSource(url) : "Local Parser";
  return { source, sourceId: url, url, title: value.title.trim() || "Imported vacancy", company: value.company.trim() || "Unknown company", description: value.description.trim(), location: value.location?.trim() || null, remoteType: /remote|удалён|удален/i.test(value.description) ? "remote" : null, companyEmail: publicEmail(value.description), companyDataSource: `Local Parser · ${url || "pasted text"}` };
}
