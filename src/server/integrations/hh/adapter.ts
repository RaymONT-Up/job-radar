import { z } from "zod";
import type { VacancyInput } from "@/entities/types";
import type { JobSourceAdapter } from "@/server/integrations/types";

const listSchema = z.object({ items: z.array(z.object({ id: z.string() })), found: z.number() });
const detailSchema = z.object({
  id: z.string(), name: z.string(), alternate_url: z.string().url(), published_at: z.string(),
  employer: z.object({ name: z.string(), alternate_url: z.string().url().nullable().optional(), url: z.string().url().nullable().optional() }), area: z.object({ name: z.string() }).nullable().optional(),
  salary: z.object({ from: z.number().nullable(), to: z.number().nullable(), currency: z.string() }).nullable(),
  experience: z.object({ id: z.string(), name: z.string() }).nullable().optional(),
  schedule: z.object({ id: z.string(), name: z.string() }).nullable().optional(),
  description: z.string(),
});
type HHDetail = z.infer<typeof detailSchema>;

const stripHtml = (value: string) => value.replace(/<br\s*\/?\s*>/gi, "\n").replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();
const publicEmail = (value: string) => { const candidate = value.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0]?.toLowerCase() ?? null; return candidate && !/(?:noreply|no-reply|example\.com)$/i.test(candidate) ? candidate : null; };
const experienceMap: Record<string, [number | null, number | null]> = { noExperience: [0, 1], between1And3: [1, 3], between3And6: [3, 6], moreThan6: [6, null] };

async function fetchJson(url: string) {
  const userAgent = process.env.HH_USER_AGENT ?? "JobRadar/0.2 (local job-search app; contact: local-user)";
  const response = await fetch(url, { headers: { "User-Agent": userAgent, "HH-User-Agent": userAgent, Accept: "application/json", "Accept-Language": "ru-RU,ru;q=0.9,en;q=0.7" }, signal: AbortSignal.timeout(15_000) });
  if (!response.ok) throw new Error(`HH API returned ${response.status}. Можно переключить HH в Parser и вставить публичную ссылку; API-ключ для поиска не требуется.`);
  return response.json() as Promise<unknown>;
}

async function mapLimit<T, R>(items: T[], limit: number, mapper: (item: T) => Promise<R>) {
  const result: R[] = [];
  let cursor = 0;
  async function worker() {
    while (cursor < items.length) {
      const index = cursor++;
      result[index] = await mapper(items[index]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return result;
}

export class HHAdapter implements JobSourceAdapter {
  readonly source = "HH";

  async fetch({ queries, limit = 60 }: { queries: string[]; limit?: number }) {
    const perQuery = Math.max(5, Math.ceil(limit / queries.length));
    const lists = await Promise.all(queries.map(async (query) => {
      const params = new URLSearchParams({ text: query, search_field: "name", per_page: String(Math.min(50, perQuery)), period: "14", order_by: "publication_time", only_with_salary: "false" });
      return listSchema.parse(await fetchJson(`https://api.hh.ru/vacancies?${params}`));
    }));
    const fetched = lists.reduce((sum, list) => sum + list.items.length, 0);
    const ids = [...new Set(lists.flatMap((list) => list.items.map((item) => item.id)))].slice(0, limit);
    const details = await mapLimit(ids, 5, async (id) => detailSchema.parse(await fetchJson(`https://api.hh.ru/vacancies/${id}`)));
    return { vacancies: details.map((detail) => this.normalize(detail)), fetched };
  }

  normalize(raw: unknown): VacancyInput {
    const value = detailSchema.parse(raw) as HHDetail;
    const [experienceMin, experienceMax] = value.experience ? (experienceMap[value.experience.id] ?? [null, null]) : [null, null];
    return {
      source: "HH", sourceId: value.id, url: value.alternate_url, title: value.name, company: value.employer.name,
      description: stripHtml(value.description), location: value.area?.name ?? null,
      remoteType: value.schedule?.id === "remote" ? "remote" : value.schedule?.id ?? null,
      salaryMin: value.salary?.from ?? null, salaryMax: value.salary?.to ?? null, salaryCurrency: value.salary?.currency ?? null,
      experienceMin, experienceMax, publishedAt: value.published_at,
      companyWebsite: value.employer.alternate_url ?? value.employer.url ?? null,
      companyEmail: publicEmail(value.description),
      companyDataSource: `HH official API · https://api.hh.ru/vacancies/${value.id}`,
    };
  }
}

export const DEFAULT_HH_QUERIES = ["React TypeScript", "Frontend React", "Фронтенд React", "Senior Frontend React", "React Next.js", "Frontend WebSocket", "Frontend финтех", "Frontend trading", "Frontend crypto", "Frontend визуализация данных"];
