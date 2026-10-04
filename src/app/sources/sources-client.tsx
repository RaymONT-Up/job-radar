"use client";

import { Check, CheckSquare2, CircleAlert, DatabaseZap, RefreshCw, ShieldCheck, Square, WandSparkles } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { splitInputLines } from "@/features/source-search/line-input";
import { prepareParserPayload } from "@/features/source-search/parser-payload";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { HelpTooltip } from "@/shared/ui/help-tooltip";

type Mode = "api" | "parser";
type Source = { id: string; label: string; kind: string; auth: string; coverage: string; officialUrl: string; docsUrl: string; enabled: boolean; api: boolean; parser: boolean; note: string };
type FoundItem = { id: string; title: string; company: string; url: string | null; score: number; bucket: string; saved: boolean; duplicate: boolean; hardStops: string[]; descriptionLanguage: string; requiredLanguages: string[] };
type Result = { source: string; fetched: number; uniqueFetched: number; saved: number; duplicates: number; compatible: number; hardFiltered: number; languageFiltered: number; items: FoundItem[]; error?: string };
type RunRow = { id: string; source: string; mode: "API" | "Parser"; status: "queued" | "running" | "done" | "error"; startedAt: number; finishedAt?: number; fetched: number; saved: number; duplicates: number; compatible: number; hardFiltered: number; languageFiltered: number; error?: string };
type LanguageSettings = { id: string; languages: string[]; policy: "strict" | "flexible" };

const defaultIds = ["hh", "getmatch", "remoteok", "remotive", "arbeitnow", "linkedin", "weworkremotely"];
const atsIds = new Set(["greenhouse", "lever", "ashby"]);
const canSearchAutomatically = (source?: Source) => Boolean(source?.api && source.enabled && !atsIds.has(source.id));
function sourceReadiness(source: Source) {
  if (canSearchAutomatically(source)) return { label: source.id === "linkedin" ? "BETA" : "ГОТОВ", tone: "good", action: null as null | { href: string; label: string } };
  if (atsIds.has(source.id)) return { label: "НУЖЕН URL", tone: "blue", action: { href: "#ats-boards", label: "Добавить доску" } };
  if (source.auth === "env") return { label: "НУЖЕН КЛЮЧ", tone: "warn", action: { href: "/settings", label: "Настроить ключ" } };
  if (source.id === "telegram") return { label: "НУЖНЫ КАНАЛЫ", tone: "warn", action: { href: "/settings", label: "Добавить каналы" } };
  if (source.auth === "oauth") return { label: "CAPTURE / OAUTH", tone: "blue", action: { href: "/capture", label: "Открыть Capture" } };
  return { label: "ПО ССЫЛКЕ", tone: "blue", action: { href: "/capture", label: "Открыть Capture" } };
}
function readRunLog<T>(key: string): T[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(key) || "[]") as T[]; } catch { return []; }
}

export function SourcesClient({ initialQueries, languageSettings }: { initialQueries?: string[]; languageSettings?: LanguageSettings }) {
  const [sources, setSources] = useState<Source[]>([]);
  const [selected, setSelected] = useState<string[]>(defaultIds);
  const [modes, setModes] = useState<Record<string, Mode>>({ hh: "api", getmatch: "api", remoteok: "api", remotive: "api", arbeitnow: "api", linkedin: "api", weworkremotely: "api" });
  const [queries, setQueries] = useState((initialQueries?.length ? initialQueries : ["Frontend", "React", "TypeScript", "Фронтенд разработчик"]).join("\n"));
  const [atsUrls, setAtsUrls] = useState("");
  const [parserUrls, setParserUrls] = useState("");
  const [discoveryUrls, setDiscoveryUrls] = useState("");
  const [discoveryLimit, setDiscoveryLimit] = useState(20);
  const [parserTitle, setParserTitle] = useState("");
  const [parserCompany, setParserCompany] = useState("");
  const [parserLocation, setParserLocation] = useState("");
  const [parserText, setParserText] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  // Read browser-only logs after hydration. Reading localStorage in the initial
  // state makes the server HTML differ from the client and breaks interactions.
  const [runRows, setRunRows] = useState<RunRow[]>([]);
  const [foundItems, setFoundItems] = useState<FoundItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [notice, setNotice] = useState("");
  const [languages, setLanguages] = useState(languageSettings?.languages.join(", ") ?? "Russian");
  const [languagePolicy, setLanguagePolicy] = useState<LanguageSettings["policy"]>(languageSettings?.policy ?? "strict");
  const [languageSaving, setLanguageSaving] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setRunRows(readRunLog<RunRow>("job-radar-source-run-log"));
      setFoundItems(readRunLog<FoundItem>("job-radar-source-found-items"));
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);
  useEffect(() => { if (runRows.length) localStorage.setItem("job-radar-source-run-log", JSON.stringify(runRows.slice(0, 100))); }, [runRows]);
  useEffect(() => { if (foundItems.length) localStorage.setItem("job-radar-source-found-items", JSON.stringify(foundItems.slice(0, 200))); }, [foundItems]);

  useEffect(() => {
    fetch("/api/sources/status")
      .then((response) => response.json())
      .then((value: Source[]) => {
        setSources(value);
        setModes((current) => Object.fromEntries(value.map((source) => [source.id, current[source.id] ?? (canSearchAutomatically(source) ? "api" : "parser")])));
      })
      .catch(() => setMessage("Не удалось загрузить каталог источников"));
  }, []);

  const sourceById = useMemo(() => new Map(sources.map((source) => [source.id, source])), [sources]);
  const apiSources = selected.filter((id) => modes[id] === "api" && canSearchAutomatically(sourceById.get(id)));
  const parserSources = selected.filter((id) => modes[id] === "parser");
  const atsCount = splitInputLines(atsUrls).length;
  const parserUrlCount = splitInputLines(parserUrls).length;
  const discoveryUrlCount = splitInputLines(discoveryUrls).length;
  const hasFullParserText = parserText.trim().length >= 30;
  const hasParserInput = parserUrlCount > 0 || hasFullParserText;
  const canSync = apiSources.length > 0 || atsCount > 0 || hasParserInput || discoveryUrlCount > 0;

  function toggle(id: string) {
    setSelected((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  }

  function setMode(id: string, mode: Mode) {
    const source = sourceById.get(id);
    if (!source || (mode === "api" && !canSearchAutomatically(source)) || (mode === "parser" && !source.parser)) return;
    setModes((current) => ({ ...current, [id]: mode }));
    setSelected((current) => current.includes(id) ? current : [...current, id]);
  }

  function selectAutomatic() {
    const ids = sources.filter(canSearchAutomatically).map((source) => source.id);
    setSelected(ids);
    setModes((current) => ({ ...current, ...Object.fromEntries(ids.map((id) => [id, "api" as const])) }));
    setNotice(`Включён максимальный автоматический поиск: ${ids.length} источников уже готовы. Источники без доступа не будут имитировать поиск — для них карточка покажет следующий шаг.`);
  }

  function selectAll() {
    const available = sources.filter((source) => source.api || source.parser);
    setSelected(available.map((source) => source.id));
    setModes(Object.fromEntries(available.map((source) => [source.id, canSearchAutomatically(source) ? "api" as const : "parser" as const])));
    setNotice("Отмечен весь каталог. Запустятся только готовые автоматические источники; остальные ждут ключ, URL компании или Capture. Никаких фальшивых «поисков по всему сайту».");
  }

  function setAllParser() {
    const ids = sources.filter((source) => source.parser).map((source) => source.id);
    setSelected(ids);
    setModes(Object.fromEntries(ids.map((id) => [id, "parser" as const])));
    setNotice("Parser выбран для всех сайтов. Это режим для конкретных URL, а не универсальный обход: добавьте прямые ссылки или публичные страницы ниже.");
  }

  function fillPreset() {
    setDiscoveryUrls("");
    selectAutomatic();
    setNotice("Включён надёжный пресет из всех готовых адаптеров. Если добавишь ключи или Telegram-каналы, они тоже попадут в этот запуск.");
  }

  async function saveLanguageSettings() {
    if (!languageSettings) return;
    const nextLanguages = languages.split(",").map((item) => item.trim()).filter(Boolean);
    if (!nextLanguages.length) { setNotice("Добавь хотя бы один рабочий язык, например Russian."); return; }
    setLanguageSaving(true);
    const response = await fetch("/api/profiles", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: languageSettings.id, languages: nextLanguages, languagePolicy }) });
    setLanguageSaving(false);
    setNotice(response.ok ? "Языковые настройки сохранены. Новые вакансии будут оцениваться по ним." : "Не удалось сохранить языковые настройки");
  }

  function updateRunRow(id: string, patch: Partial<RunRow>) {
    setRunRows((current) => current.map((row) => row.id === id ? { ...row, ...patch } : row));
  }

  function combineResults(results: Result[], source: string): Result | null {
    if (!results.length) return null;
    if (results.length === 1) return results[0];
    return {
      source,
      fetched: results.reduce((sum, item) => sum + item.fetched, 0),
      uniqueFetched: results.reduce((sum, item) => sum + item.uniqueFetched, 0),
      saved: results.reduce((sum, item) => sum + item.saved, 0),
      duplicates: results.reduce((sum, item) => sum + item.duplicates, 0),
      compatible: results.reduce((sum, item) => sum + item.compatible, 0),
      hardFiltered: results.reduce((sum, item) => sum + item.hardFiltered, 0),
      languageFiltered: results.reduce((sum, item) => sum + item.languageFiltered, 0),
      items: results.flatMap((item) => item.items),
      error: results.filter((item) => item.error).map((item) => item.error).join("; ") || undefined,
    };
  }

  async function runOne(row: RunRow, requestBody: Record<string, unknown>) {
    updateRunRow(row.id, { status: "running" });
    try {
      const endpoint = row.mode === "API" ? "/api/sources/fetch" : "/api/sources/parse";
      const response = await fetch(endpoint, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(requestBody) });
      const value = await response.json() as { results?: Result[]; error?: string };
      if (!response.ok) throw new Error(value.error || "Источник не ответил");
      const result = combineResults(value.results ?? [], row.source);
      if (!result) throw new Error("Источник не вернул результат");
      const finishedAt = Date.now();
      updateRunRow(row.id, { status: result.error ? "error" : "done", finishedAt, fetched: result.fetched, saved: result.saved, duplicates: result.duplicates, compatible: result.compatible, hardFiltered: result.hardFiltered, languageFiltered: result.languageFiltered, error: result.error });
      setResults((current) => [...current, result]);
      if (result.items.length) setFoundItems((current) => [...result.items, ...current].slice(0, 200));
    } catch (error) {
      updateRunRow(row.id, { status: "error", finishedAt: Date.now(), error: error instanceof Error ? error.message : "Источник не ответил" });
    }
  }

  async function sync() {
    setLoading(true);
    setMessage("");
    setResults([]);
    try {
      const jobs: Array<{ row: RunRow; body: Record<string, unknown> }> = [];
      const queryList = splitInputLines(queries);
      for (const sourceId of apiSources) {
        const source = sourceById.get(sourceId);
        jobs.push({ row: { id: `${Date.now()}-${sourceId}`, source: source?.label ?? sourceId, mode: "API", status: "queued", startedAt: Date.now(), fetched: 0, saved: 0, duplicates: 0, compatible: 0, hardFiltered: 0, languageFiltered: 0 }, body: { sources: [sourceId], queries: queryList, atsUrls: [], limit: 60 } });
      }
      for (const url of splitInputLines(atsUrls)) jobs.push({ row: { id: `${Date.now()}-ats-${url}`, source: `ATS: ${new URL(url).hostname}`, mode: "API", status: "queued", startedAt: Date.now(), fetched: 0, saved: 0, duplicates: 0, compatible: 0, hardFiltered: 0, languageFiltered: 0 }, body: { sources: [], queries: queryList, atsUrls: [url], limit: 60 } });
      if (hasParserInput || discoveryUrlCount > 0 || (!apiSources.length && parserSources.length)) {
        const payload = hasParserInput ? prepareParserPayload({ urlsText: parserUrls, text: parserText, title: parserTitle, company: parserCompany, location: parserLocation }) : { urls: [], pasted: [] };
        for (const url of payload.urls) jobs.push({ row: { id: `${Date.now()}-parser-${url}`, source: url, mode: "Parser", status: "queued", startedAt: Date.now(), fetched: 0, saved: 0, duplicates: 0, compatible: 0, hardFiltered: 0, languageFiltered: 0 }, body: { urls: [url], pasted: [] } });
        for (const pasted of payload.pasted) jobs.push({ row: { id: `${Date.now()}-pasted`, source: pasted.url || "Вставленный текст", mode: "Parser", status: "queued", startedAt: Date.now(), fetched: 0, saved: 0, duplicates: 0, compatible: 0, hardFiltered: 0, languageFiltered: 0 }, body: { urls: [], pasted: [pasted] } });
        for (const listingUrl of splitInputLines(discoveryUrls)) jobs.push({ row: { id: `${Date.now()}-discovery-${listingUrl}`, source: `Поиск: ${listingUrl}`, mode: "Parser", status: "queued", startedAt: Date.now(), fetched: 0, saved: 0, duplicates: 0, compatible: 0, hardFiltered: 0, languageFiltered: 0 }, body: { discoverUrls: [listingUrl], discoverLimit: discoveryLimit } });
      } else if (parserSources.length) {
        setNotice(`${parserSources.length} Parser-источников пропущены: для них не добавлены ссылки или полный текст. Автоматический поиск продолжил работу.`);
      }
      if (!jobs.length) throw new Error("Выберите «Максимальный автопоиск» или добавьте ссылки на конкретные вакансии.");
      setRunRows((current) => [...jobs.map((job) => job.row), ...current].slice(0, 100));
      setFoundItems([]);
      await Promise.all(jobs.map((job) => runOne(job.row, job.body)));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Не удалось запустить поиск");
    } finally {
      setLoading(false);
    }
  }

  return <div className="space-y-5">
    <section className="panel p-5 md:p-6">
      <div className="flex items-start gap-3">
        <div className="grid size-10 place-items-center rounded-lg bg-blue-100 text-blue-700"><DatabaseZap size={20} /></div>
        <div><h2 className="flex items-center gap-2 text-lg font-black">Единый поиск по источникам <HelpTooltip text="Автопоиск сам получает список вакансий через разрешённые API. Parser разбирает конкретные ссылки или вставленный текст." /></h2><p className="mt-1 max-w-3xl text-sm leading-6 text-[var(--muted)]">Одна кнопка запускает все доступные автоматические источники. Для сайтов с логином используются конкретные ссылки, вставка текста или Capture.</p></div>
      </div>

      <div className="mt-4 grid gap-2 rounded-lg border bg-[var(--panel-2)] p-4 text-sm leading-6 md:grid-cols-3">
        <div><b>Автопоиск / API</b><p className="text-[var(--muted)]">Сервис сам запрашивает официальный feed. «Максимальный автопоиск» включает все источники, которые уже настроены на этом компьютере.</p></div>
        <div><b>Parser</b><p className="text-[var(--muted)]">Сервер открывает только публичную страницу или прямую ссылку. Логин, cookies и CAPTCHA он не обходит.</p></div>
        <div><b>Capture</b><p className="text-[var(--muted)]">Если сайт открылся только в твоём браузере, открой вакансию там и передай её через Capture или вставь полный текст.</p></div>
      </div>

      <div className="mt-5 flex flex-wrap gap-2 rounded-lg border bg-[var(--panel-2)] p-3">
        <Button variant="primary" onClick={selectAutomatic}><WandSparkles size={16} /> Максимальный автопоиск</Button>
        <Button onClick={selectAll}><CheckSquare2 size={16} /> Весь каталог</Button>
        <Button onClick={setAllParser}>Все → Parser</Button>
        <Button onClick={fillPreset}><WandSparkles size={16} /> Надёжный пресет</Button>
        <Button variant="ghost" onClick={() => { setSelected([]); setNotice(""); }}><Square size={16} /> Снять все</Button>
        <span className="self-center text-sm text-[var(--muted)]">Выбрано: {selected.length} из {sources.length}</span>
      </div>
      {notice && <div className="mt-3 rounded-md bg-[var(--accent-soft)] px-4 py-3 text-sm text-[var(--accent)]">{notice}</div>}

      <section className="mt-5 grid gap-3 rounded-lg border bg-[var(--panel-2)] p-4 md:grid-cols-[1fr_260px_auto] md:items-end"><label><span className="mb-1 flex items-center gap-2 text-sm font-bold">Языки работы <HelpTooltip text="Укажи языки, на которых готов работать каждый день. Это не язык интерфейса сайта — это фильтр вакансий." /></span><input value={languages} onChange={(event) => setLanguages(event.target.value)} className="focus-ring h-10 w-full rounded-md border bg-[var(--panel)] px-3" placeholder="Russian, English B2" /></label><label><span className="mb-1 flex items-center gap-2 text-sm font-bold">Режим языка <HelpTooltip text="Строго скрывает несовместимые рабочие языки. Гибко оставляет их в базе с предупреждением." /></span><select value={languagePolicy} onChange={(event) => setLanguagePolicy(event.target.value as LanguageSettings["policy"])} className="focus-ring h-10 w-full rounded-md border bg-[var(--panel)] px-3"><option value="strict">Строго — фильтровать</option><option value="flexible">Гибко — предупреждать</option></select></label><Button onClick={saveLanguageSettings} disabled={languageSaving || !languageSettings}>{languageSaving ? "Сохраняю…" : "Сохранить язык"}</Button></section>

      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {sources.map((source) => {
          const active = selected.includes(source.id);
          const automatic = canSearchAutomatically(source);
          const mode = modes[source.id] ?? (automatic ? "api" : "parser");
          const readiness = sourceReadiness(source);
          return <article key={source.id} className={`rounded-xl border p-4 transition ${active ? "border-[var(--accent)] bg-[var(--accent-soft)] shadow-sm" : "bg-[var(--panel-2)]"}`}>
            <button type="button" onClick={() => toggle(source.id)} aria-pressed={active} className="focus-ring flex w-full items-start gap-3 rounded-md text-left">
              <span className={`mt-0.5 grid size-6 shrink-0 place-items-center rounded-md border-2 ${active ? "border-[var(--accent)] bg-[var(--accent)] text-white" : "border-[var(--muted)] bg-[var(--panel)] text-transparent"}`}><Check size={15} strokeWidth={3} /></span>
              <span className="min-w-0 flex-1"><span className="flex flex-wrap items-center gap-2"><span className="font-black">{source.label}</span><Badge tone={readiness.tone === "good" ? "good" : readiness.tone === "warn" ? "warn" : "blue"}>{readiness.label}</Badge></span><span className="mt-1 block text-xs text-[var(--muted)]">{source.coverage} · {source.kind.toUpperCase()}</span></span>
            </button>
            <div className="ml-9 mt-3">
              <div className="flex w-fit rounded-md border bg-[var(--panel)] p-0.5"><button type="button" onClick={() => setMode(source.id, "api")} disabled={!automatic} className={`rounded px-2.5 py-1 text-xs font-bold disabled:cursor-not-allowed disabled:opacity-35 ${mode === "api" ? "bg-blue-600 text-white" : "text-[var(--muted)]"}`}>Авто / API</button><button type="button" onClick={() => setMode(source.id, "parser")} disabled={!source.parser} className={`rounded px-2.5 py-1 text-xs font-bold disabled:opacity-35 ${mode === "parser" ? "bg-blue-600 text-white" : "text-[var(--muted)]"}`}>Parser ссылки</button></div>
              <p className="mt-2 text-xs leading-5 text-[var(--muted)]">{source.note}</p><div className="mt-2 flex flex-wrap gap-3 text-xs">{readiness.action && <a href={readiness.action.href} className="font-bold text-[var(--accent)] hover:underline">{readiness.action.label}</a>}<a href={source.officialUrl} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">Сайт</a><a href={source.docsUrl} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">Документация</a></div>
            </div>
          </article>;
        })}
      </div>

      <label className="mt-5 block"><span className="mb-2 flex items-center gap-2 text-sm font-bold">Поисковые запросы <span className="font-normal text-[var(--muted)]">уже собраны из профиля</span><HelpTooltip text="Используются автоматическими источниками. Можно оставить как есть или добавить точные названия ролей и навыки." /></span><textarea value={queries} onChange={(event) => setQueries(event.target.value)} className="focus-ring min-h-36 w-full rounded-md border bg-[var(--panel)] p-3 font-mono text-sm leading-6" /></label>

      <label id="ats-boards" className="mt-5 block scroll-mt-6"><span className="mb-2 flex items-center gap-2 text-sm font-bold">Career pages Greenhouse / Lever / Ashby <span className="font-normal text-[var(--muted)]">необязательно</span><HelpTooltip text="Вставьте адрес доски компании — Job Radar получит все подходящие вакансии через публичный ATS API." /></span><textarea value={atsUrls} onChange={(event) => setAtsUrls(event.target.value)} className="focus-ring min-h-24 w-full rounded-md border bg-[var(--panel)] p-3 font-mono text-sm leading-6" placeholder={"https://boards.greenhouse.io/company\nhttps://jobs.lever.co/company\nhttps://jobs.ashbyhq.com/company"} /></label>

      <section className="mt-5 rounded-xl border-2 border-dashed p-4">
        <div className="flex items-center gap-2 font-black">Parser конкретных вакансий <HelpTooltip text="Вставьте сразу несколько прямых ссылок. Если страница закрыта логином, вставьте её полный текст или используйте Capture." /></div>
        <p className="mt-1 text-sm leading-6 text-[var(--muted)]"><strong>Можно вставить сразу до 20 ссылок.</strong> Короткий текст больше не ломает запуск URL. Parser не обходит логин/CAPTCHA и не притворяется поисковым API всего сайта.</p>
        <label className="mt-3 block"><span className="mb-1 flex items-center gap-2 text-sm font-bold">Прямые URL вакансий <span className="font-normal text-[var(--muted)]">по одному на строку</span></span><textarea value={parserUrls} onChange={(event) => setParserUrls(event.target.value)} className="focus-ring min-h-24 w-full rounded-md border bg-[var(--panel)] p-3 font-mono text-sm" placeholder={"https://hirify.me/jobs/...\nhttps://career.habr.com/vacancies/..."} /></label>
        <div className="mt-4 flex flex-wrap items-center gap-2 rounded-md border bg-[var(--panel-2)] p-3"><span className="text-sm font-bold">Рекомендуемый запуск</span><Button size="sm" onClick={fillPreset}><WandSparkles size={15} /> Включить адаптеры</Button><span className="text-xs text-[var(--muted)]">Известные площадки читаются через JSON API, RSS или guest feed. Parser ниже нужен только для неизвестной или разовой ссылки.</span></div>
        <label className="mt-3 block"><span className="mb-1 flex items-center gap-2 text-sm font-bold">Страницы поиска / категории <span className="font-normal text-[var(--muted)]">Parser найдёт ссылки на вакансии внутри</span><HelpTooltip text="Вставь URL страницы результатов поиска, раздела вакансий или публичной ATS-доски. Сервис извлечёт ссылки на конкретные вакансии и обработает их автоматически. Можно вставлять и обычные переносы, и видимый текст \\n." /></span><textarea value={discoveryUrls} onChange={(event) => setDiscoveryUrls(event.target.value)} className="focus-ring min-h-20 w-full rounded-md border bg-[var(--panel)] p-3 font-mono text-sm" placeholder={"https://remoteok.com\nhttps://weworkremotely.com/remote-jobs"} /></label>
        <div className="mt-3 flex flex-wrap items-end gap-3"><label><span className="mb-1 block text-xs font-bold">Сколько вакансий брать с одной страницы <HelpTooltip text="Ограничение защищает от случайного запуска сотен запросов. Максимум 50 на одну страницу." /></span><select value={discoveryLimit} onChange={(event) => setDiscoveryLimit(Number(event.target.value))} className="focus-ring h-10 rounded-md border bg-[var(--panel)] px-3 text-sm"><option value="10">10</option><option value="20">20</option><option value="30">30</option><option value="50">50</option></select></label><span className="pb-2 text-xs text-[var(--muted)]">Страницы поиска: {discoveryUrlCount}</span></div>
        <div className="mt-3 grid gap-3 md:grid-cols-3"><label><span className="mb-1 flex items-center gap-1 text-xs font-bold">Роль <HelpTooltip text="Только для ручной вставки текста. Для URL Parser найдёт роль сам." /></span><input value={parserTitle} onChange={(event) => setParserTitle(event.target.value)} className="focus-ring h-10 w-full rounded-md border bg-[var(--panel)] px-3 text-sm" placeholder="Frontend Engineer" /></label><label><span className="mb-1 flex items-center gap-1 text-xs font-bold">Компания <HelpTooltip text="Только для ручной вставки текста; можно оставить пустым." /></span><input value={parserCompany} onChange={(event) => setParserCompany(event.target.value)} className="focus-ring h-10 w-full rounded-md border bg-[var(--panel)] px-3 text-sm" placeholder="Компания" /></label><label><span className="mb-1 flex items-center gap-1 text-xs font-bold">Локация <HelpTooltip text="Только для ручной вставки текста; например Remote или Europe." /></span><input value={parserLocation} onChange={(event) => setParserLocation(event.target.value)} className="focus-ring h-10 w-full rounded-md border bg-[var(--panel)] px-3 text-sm" placeholder="Remote / Europe" /></label></div>
        <label className="mt-3 block"><span className="mb-1 flex items-center gap-2 text-sm font-bold">Полный текст вакансии <span className={`font-normal ${parserText.trim() && !hasFullParserText ? "text-[var(--warn)]" : "text-[var(--muted)]"}`}>{parserText.trim().length}/30 минимум</span><HelpTooltip text="Нужен только если ссылка закрыта логином. Вставьте описание целиком, а не одно слово Frontend." /></span><textarea value={parserText} onChange={(event) => setParserText(event.target.value)} className="focus-ring min-h-28 w-full rounded-md border bg-[var(--panel)] p-3 text-sm" placeholder="Вставьте полное описание, если URL нельзя прочитать без входа" /></label>
      </section>

      <div className="mt-4 flex flex-wrap items-center gap-3"><Button variant="primary" onClick={sync} disabled={loading || !canSync}><RefreshCw size={17} className={loading ? "animate-spin" : ""} />{loading ? "Собираю и проверяю…" : `Запустить: авто ${apiSources.length}${parserUrlCount ? ` + ссылок ${parserUrlCount}` : ""}${discoveryUrlCount ? ` + страниц ${discoveryUrlCount}` : ""}${hasFullParserText ? " + текст" : ""}${atsCount ? ` + ATS ${atsCount}` : ""}`}</Button><span className="flex items-center gap-1 text-sm text-[var(--muted)]"><ShieldCheck size={15} />Ключи остаются на сервере <HelpTooltip text="Секреты хранятся в `.env.local` или зашифрованно в локальной SQLite и не передаются клиентскому JavaScript." /></span></div>
      {message && <p className="mt-3 rounded-md bg-[var(--danger-soft)] px-4 py-3 text-sm font-semibold text-[var(--danger)]">{message}</p>}
    </section>

    {runRows.length > 0 && <section className="panel p-5 md:p-6"><div className="flex flex-wrap items-end justify-between gap-3"><div><h2 className="text-lg font-black">Журнал поиска в реальном времени</h2><p className="mt-1 text-sm text-[var(--muted)]">Строка обновляется сразу после ответа конкретного источника. Ничего не скрывается: ошибки, дубли и языковые фильтры остаются в журнале.</p></div><Button size="sm" variant="ghost" onClick={() => { setRunRows([]); localStorage.removeItem("job-radar-source-run-log"); }}>Очистить журнал</Button></div><div className="mt-4 overflow-x-auto"><table className="w-full min-w-[900px] text-left text-sm"><thead className="border-b text-xs uppercase tracking-wide text-[var(--muted)]"><tr><th className="p-2">Источник</th><th className="p-2">Режим</th><th className="p-2">Статус</th><th className="p-2">Найдено</th><th className="p-2">В базе</th><th className="p-2">Дубли</th><th className="p-2">Подходит</th><th className="p-2">Язык</th><th className="p-2">Ошибка</th></tr></thead><tbody>{runRows.map((row) => <tr key={row.id} className="border-b last:border-0"><td className="max-w-[260px] truncate p-2 font-semibold" title={row.source}>{row.source}</td><td className="p-2"><Badge tone={row.mode === "API" ? "blue" : "neutral"}>{row.mode}</Badge></td><td className="p-2"><Badge tone={row.status === "done" ? "good" : row.status === "error" ? "danger" : "warn"}>{row.status === "queued" ? "В очереди" : row.status === "running" ? "Собираю…" : row.status === "done" ? "Готово" : "Ошибка"}</Badge></td><td className="p-2 font-bold">{row.fetched}</td><td className="p-2">{row.saved}</td><td className="p-2">{row.duplicates}</td><td className="p-2">{row.compatible}</td><td className="p-2">{row.languageFiltered}</td><td className="max-w-[280px] truncate p-2 text-xs text-[var(--danger)]" title={row.error}>{row.error || "—"}</td></tr>)}</tbody></table></div></section>}

    {foundItems.length > 0 && <section className="panel p-5 md:p-6"><div className="flex flex-wrap items-end justify-between gap-3"><div><h2 className="text-lg font-black">Что именно пришло от источников</h2><p className="mt-1 text-sm text-[var(--muted)]">Здесь показываются все обработанные карточки — включая дубли и вакансии, отфильтрованные профилем. Это не означает, что каждая строка подходит для отклика.</p></div><Button size="sm" variant="ghost" onClick={() => { setFoundItems([]); localStorage.removeItem("job-radar-source-found-items"); }}>Очистить список</Button></div><div className="mt-4 overflow-x-auto"><table className="w-full min-w-[950px] text-left text-sm"><thead className="border-b text-xs uppercase tracking-wide text-[var(--muted)]"><tr><th className="p-2">Вакансия</th><th className="p-2">Компания</th><th className="p-2">FIT</th><th className="p-2">Язык</th><th className="p-2">Состояние</th><th className="p-2">Почему</th><th className="p-2">Ссылка</th></tr></thead><tbody>{foundItems.map((item, index) => { const filtered = item.hardStops.length > 0; return <tr key={`${item.id}-${index}`} className="border-b last:border-0"><td className="max-w-[300px] truncate p-2 font-semibold" title={item.title}>{item.title}</td><td className="p-2">{item.company}</td><td className="p-2"><Badge tone={item.bucket === "A" ? "good" : item.bucket === "B" ? "blue" : "neutral"}>{item.score} · {item.bucket}</Badge></td><td className="p-2">{item.requiredLanguages.join(" + ") || item.descriptionLanguage}</td><td className="p-2">{item.duplicate ? <Badge>Дубль</Badge> : filtered ? <Badge tone="danger">Отфильтровано</Badge> : <Badge tone="good">Новая</Badge>}</td><td className="max-w-[280px] truncate p-2 text-xs text-[var(--muted)]" title={item.hardStops.join("; ")}>{item.hardStops[0] || "Подходит для проверки"}</td><td className="p-2">{item.url ? <a href={item.url} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">Открыть</a> : "—"}</td></tr>; })}</tbody></table></div></section>}

    {results.length > 0 && <section className="panel p-5 md:p-6"><h2 className="text-lg font-black">Результат синхронизации</h2><p className="mt-1 text-sm text-[var(--muted)]">«В базе» — новые записи для проверки; «подходит» — без стоп-факторов текущего профиля.</p><div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">{results.map((result, index) => <div key={`${result.source}-${index}`} className="rounded-lg border bg-[var(--panel-2)] p-4"><div className="flex items-center justify-between gap-2"><span className="font-black">{result.source}</span>{result.error ? <CircleAlert size={17} className="text-[var(--danger)]" /> : <Check size={17} className="text-[var(--good)]" />}</div>{result.error ? <p className="mt-2 text-sm text-[var(--danger)]">{result.error}</p> : <div className="mt-3 grid grid-cols-2 gap-2 text-sm"><span>Получено <b>{result.fetched}</b></span><span>В базе <b>{result.saved}</b></span><span>Подходит <b>{result.compatible}</b></span><span>Дубли <b>{result.duplicates}</b></span><span>Стоп-факторы <b>{result.hardFiltered}</b></span><span>Не ваш язык <b>{result.languageFiltered}</b></span></div>}</div>)}</div></section>}
  </div>;
}
