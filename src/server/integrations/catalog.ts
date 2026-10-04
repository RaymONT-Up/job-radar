import { PUBLIC_ADAPTERS, type PublicSourceId } from "./public-adapters";
import { getSourceCredential } from "@/server/credentials";

export type SourceAuth = "none" | "env" | "oauth" | "board_slug";
export type SourceKind = "api" | "rss" | "ats" | "manual";

export interface SourceCatalogEntry {
  id: string;
  label: string;
  kind: SourceKind;
  auth: SourceAuth;
  coverage: string;
  officialUrl: string;
  docsUrl: string;
  enabled: boolean;
  api: boolean;
  parser: boolean;
  note: string;
}

export const SOURCE_CATALOG: SourceCatalogEntry[] = [
  { id: "hh", label: "HeadHunter", kind: "rss", auth: "none", coverage: "Россия / СНГ", officialUrl: "https://hh.ru", docsUrl: "https://hh.ru/search/vacancy/rss", enabled: true, api: true, parser: true, note: "Сначала официальный API; при 403 автоматически используется публичная RSS-лента поиска." },
  { id: "remoteok", label: "Remote OK", kind: "api", auth: "none", coverage: "Remote worldwide", officialUrl: "https://remoteok.com", docsUrl: "https://remoteok.featurebase.app/help/articles/3140840-is-there-an-api-or-rssjson-feed-of-remote-jobs", enabled: true, api: true, parser: true, note: "Публичный JSON feed; в карточке сохраняем источник и ссылку." },
  { id: "remotive", label: "Remotive", kind: "api", auth: "none", coverage: "Remote tech", officialUrl: "https://remotive.com", docsUrl: "https://github.com/remotive-io/remote-jobs-api", enabled: true, api: true, parser: true, note: "Публичный API; нужно указывать Remotive и ссылку на оригинал." },
  { id: "arbeitnow", label: "Arbeitnow", kind: "api", auth: "none", coverage: "Европа / remote", officialUrl: "https://www.arbeitnow.com", docsUrl: "https://www.arbeitnow.com/api/job-board-api", enabled: true, api: true, parser: true, note: "Публичный job-board API." },
  { id: "getmatch", label: "Getmatch", kind: "api", auth: "none", coverage: "Россия / СНГ · IT", officialUrl: "https://getmatch.ru/vacancies", docsUrl: "https://getmatch.ru", enabled: true, api: true, parser: true, note: "Выделенный адаптер публичного JSON API. HTML страницы не скрейпится." },
  { id: "adzuna", label: "Adzuna", kind: "api", auth: "env", coverage: "UK / EU / US и другие страны", officialUrl: "https://www.adzuna.com", docsUrl: "https://developer.adzuna.com/overview", enabled: Boolean(process.env.ADZUNA_APP_ID && process.env.ADZUNA_APP_KEY), api: true, parser: true, note: "Нужны ADZUNA_APP_ID и ADZUNA_APP_KEY." },
  { id: "superjob", label: "SuperJob", kind: "api", auth: "env", coverage: "Россия", officialUrl: "https://www.superjob.ru", docsUrl: "https://api.superjob.ru/", enabled: Boolean(process.env.SUPERJOB_APP_ID), api: true, parser: true, note: "Нужен зарегистрированный SuperJob application и SUPERJOB_APP_ID." },
  { id: "habr", label: "Habr Career", kind: "api", auth: "oauth", coverage: "Русскоязычный IT", officialUrl: "https://career.habr.com", docsUrl: "https://career.habr.com/info/api", enabled: false, api: false, parser: true, note: "API подключается через OAuth после регистрации приложения Habr; Parser работает для публичной страницы." },
  { id: "greenhouse", label: "Greenhouse boards", kind: "ats", auth: "board_slug", coverage: "Прямые страницы компаний", officialUrl: "https://www.greenhouse.com", docsUrl: "https://docs.greenhouse.io/job-board.html", enabled: false, api: true, parser: true, note: "Публичный API без ключа, но нужен board token конкретной компании." },
  { id: "lever", label: "Lever boards", kind: "ats", auth: "board_slug", coverage: "Прямые страницы компаний", officialUrl: "https://www.lever.co", docsUrl: "https://github.com/lever/postings-api", enabled: false, api: true, parser: true, note: "Публичный postings API, нужен site slug компании." },
  { id: "ashby", label: "Ashby boards", kind: "ats", auth: "board_slug", coverage: "Прямые страницы компаний", officialUrl: "https://www.ashbyhq.com", docsUrl: "https://developers.ashbyhq.com/reference/joblist", enabled: false, api: true, parser: true, note: "Публичный board endpoint, нужен slug компании." },
  { id: "wellfound", label: "Wellfound", kind: "manual", auth: "oauth", coverage: "Startups", officialUrl: "https://wellfound.com/jobs", docsUrl: "https://help.wellfound.com/article/777-setting-up-a-search", enabled: false, api: false, parser: true, note: "Нет безопасного публичного job-search API; Parser/Capture для публичной страницы." },
  { id: "linkedin", label: "LinkedIn Jobs", kind: "api", auth: "none", coverage: "Global", officialUrl: "https://www.linkedin.com/jobs", docsUrl: "https://www.linkedin.com/legal/l/api-terms-of-use", enabled: true, api: true, parser: true, note: "Экспериментальный гостевой job endpoint без аккаунта. При блокировке используйте Capture." },
  { id: "telegram", label: "Telegram public channels", kind: "manual", auth: "none", coverage: "Публичные каналы", officialUrl: "https://t.me", docsUrl: "https://core.telegram.org/widgets/post", enabled: false, api: true, parser: true, note: "Читает публичные t.me/s-ленты без аккаунта. Список каналов задаётся в Settings." },
  { id: "startupjobs", label: "Startup Jobs", kind: "rss", auth: "env", coverage: "Startups / remote", officialUrl: "https://startup.jobs", docsUrl: "https://startup.jobs/api", enabled: false, api: false, parser: true, note: "API key или RSS; Parser доступен для отдельных страниц." },
  { id: "jooble", label: "Jooble", kind: "api", auth: "env", coverage: "Global aggregator", officialUrl: "https://jooble.org", docsUrl: "https://help.jooble.org/en/support/solutions/articles/60001448238-rest-api-documentation", enabled: Boolean(process.env.JOOBLE_API_KEY), api: true, parser: true, note: "Официальный API: добавьте key, региональный домен и локацию в Settings. Без ключа доступен Parser/Capture отдельных вакансий." },
  { id: "weworkremotely", label: "We Work Remotely", kind: "rss", auth: "none", coverage: "Remote tech", officialUrl: "https://weworkremotely.com", docsUrl: "https://weworkremotely.com/remote-jobs.rss", enabled: true, api: true, parser: true, note: "Публичная RSS-лента; сохраняем оригинальную ссылку и атрибуцию." },
  { id: "remoteco", label: "Remote.co", kind: "manual", auth: "none", coverage: "Remote", officialUrl: "https://remote.co/remote-jobs/", docsUrl: "https://remote.co/remote-jobs/", enabled: false, api: false, parser: true, note: "Parser/Capture; стабильный публичный API не заявлен." },
  { id: "djinni", label: "Djinni", kind: "manual", auth: "oauth", coverage: "Eastern Europe tech", officialUrl: "https://djinni.co/jobs/", docsUrl: "https://djinni.co/jobs/", enabled: false, api: false, parser: true, note: "Только Parser/Capture без обхода авторизации." },
  { id: "rabotaby", label: "Rabota.by", kind: "manual", auth: "none", coverage: "Беларусь / СНГ", officialUrl: "https://rabota.by", docsUrl: "https://rabota.by", enabled: false, api: false, parser: true, note: "Parser/Capture оригинальной вакансии." },
  { id: "indeed", label: "Indeed", kind: "manual", auth: "oauth", coverage: "Global", officialUrl: "https://www.indeed.com", docsUrl: "https://developer.indeed.com/", enabled: false, api: false, parser: true, note: "Parser/Capture; без scraping/login." },
  { id: "glassdoor", label: "Glassdoor", kind: "manual", auth: "oauth", coverage: "Global", officialUrl: "https://www.glassdoor.com/Job/index.htm", docsUrl: "https://www.glassdoor.com/developer/index.htm", enabled: false, api: false, parser: true, note: "Parser/Capture; закрытые страницы не обходятся." },
];

export function getPublicAdapters(ids: string[]) {
  return ids.filter((id): id is PublicSourceId => id in PUBLIC_ADAPTERS).map((id) => PUBLIC_ADAPTERS[id]);
}

export function getSourceCatalogWithCredentials() {
  return SOURCE_CATALOG.map((source) => ({
    ...source,
    enabled: source.enabled || (source.id === "adzuna" && Boolean(getSourceCredential("adzuna", "appId") && getSourceCredential("adzuna", "appKey"))) || (source.id === "superjob" && Boolean(getSourceCredential("superjob", "appId"))) || (source.id === "jooble" && Boolean(getSourceCredential("jooble", "apiKey"))) || (source.id === "telegram" && Boolean(getSourceCredential("telegram", "channels") || process.env.TELEGRAM_JOB_CHANNELS)),
  }));
}
