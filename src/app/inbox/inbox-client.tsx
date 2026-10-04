"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, ExternalLink, RefreshCw, Search, ShieldCheck, ShieldX, SlidersHorizontal } from "lucide-react";
import type { ApplicationStatus, FitBucket, VacancyVerificationStatus } from "@/entities/types";
import { StatusActions } from "@/features/pipeline/status-actions";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { HelpTooltip } from "@/shared/ui/help-tooltip";
import { useInboxFilters } from "@/features/ranked-inbox/store";

export interface InboxItem {
  id: string; title: string; company: string; source: string; url: string | null; location: string | null;
  remoteType: string | null; salaryMin: number | null; salaryMax: number | null; salaryCurrency: string | null;
  publishedAt: string | null; score: number; bucket: FitBucket; positives: string[]; negatives: string[]; hardStops: string[];
  recommendation: string; status: ApplicationStatus;
  verificationStatus: VacancyVerificationStatus; verificationReason: string | null;
  descriptionLanguage: string; requiredLanguages: string[];
}

const relativeDate = (value: string | null, referenceTime: number) => {
  if (!value) return "Unknown";
  const days = Math.floor((referenceTime - new Date(value).getTime()) / 86_400_000);
  return days <= 0 ? "Today" : days === 1 ? "1 day ago" : `${days} days ago`;
};

export function InboxClient({ items, referenceTime }: { items: InboxItem[]; referenceTime: number }) {
  const router = useRouter();
  const [verifying, setVerifying] = useState(false);
  const [verificationMessage, setVerificationMessage] = useState("");
  const { fit, source, remoteOnly, compatibleOnly, search, freshness, setFit, setSource, setRemoteOnly, setCompatibleOnly, setSearch, setFreshness } = useInboxFilters();
  const sources = [...new Set(items.map((item) => item.source))];
  const visible = useMemo(() => items.filter((item) => {
    if (fit === "A" && item.bucket !== "A") return false;
    if (fit === "AB" && item.bucket === "C") return false;
    if (source !== "ALL" && item.source !== source) return false;
    if (remoteOnly && !`${item.remoteType} ${item.location}`.toLowerCase().includes("remote")) return false;
    if (compatibleOnly && item.hardStops.some((reason) => reason.startsWith("Рабочий язык"))) return false;
    if (freshness !== "ANY" && item.publishedAt && referenceTime - new Date(item.publishedAt).getTime() > Number(freshness) * 86_400_000) return false;
    const haystack = `${item.title} ${item.company} ${item.positives.join(" ")}`.toLowerCase();
    return haystack.includes(search.toLowerCase());
  }), [items, fit, source, remoteOnly, compatibleOnly, search, freshness, referenceTime]);
  const aCount = items.filter((item) => item.bucket === "A" && item.status === "FOUND").length;
  async function verifyLiveVacancies() {
    setVerifying(true); setVerificationMessage("");
    const response = await fetch("/api/vacancies/verify", { method: "POST" });
    const result = await response.json() as { checked?: number; active?: number; unavailable?: number; unknown?: number; error?: string };
    setVerifying(false);
    if (!response.ok) { setVerificationMessage(result.error || "Проверка не удалась"); return; }
    setVerificationMessage(`Проверено ${result.checked}: активных ${result.active}, закрытых ${result.unavailable}, без подтверждения ${result.unknown}.`);
    router.refresh();
  }

  return <div className="space-y-5">
    <section className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
      <div>
        <div className="mb-2 flex items-center gap-2"><Badge tone="blue">RANKED INBOX</Badge><span className="text-sm text-[var(--muted)]">{items.length} normalized vacancies</span></div>
        <h1 className="text-2xl font-black tracking-tight md:text-3xl">Where should I apply today?</h1>
        <p className="mt-1 text-[var(--muted)]">{aCount} high-fit opportunities are waiting for a decision.</p>
      </div>
      <div className="flex flex-wrap items-center gap-2"><Button onClick={verifyLiveVacancies} disabled={verifying}><RefreshCw size={16} className={verifying ? "animate-spin" : ""} />{verifying ? "Проверяем…" : "Проверить актуальность"}</Button><HelpTooltip text="Сервер откроет внешние ссылки и пометит закрытые вакансии. Ограничение сайта или CAPTCHA дадут статус «не удалось подтвердить», а не удалят вакансию." /><Link href="/today"><Button variant="primary">Open today’s action queue</Button></Link></div>
    </section>

    <section className="panel flex flex-wrap items-center gap-2 p-3">
      <SlidersHorizontal size={17} className="mx-1 text-[var(--muted)]" />
      <HelpTooltip text="FIT A — сильное совпадение с профилем, B — стоит проверить, C — слабое совпадение или найден стоп-фактор. Оценка считается локально по профилю." />
      {[{ key: "A", label: "A only" }, { key: "AB", label: "A + B" }, { key: "ALL", label: "All" }].map((option) => <button key={option.key} onClick={() => setFit(option.key as typeof fit)} className={`focus-ring h-8 rounded-md px-3 text-sm font-semibold ${fit === option.key ? "bg-[var(--accent)] text-white" : "bg-[var(--panel-2)] text-[var(--muted)]"}`}>{option.label}</button>)}
      <select value={source} onChange={(event) => setSource(event.target.value)} className="focus-ring h-8 rounded-md border bg-[var(--panel)] px-2 text-sm"><option value="ALL">All sources</option>{sources.map((item) => <option key={item}>{item}</option>)}</select>
      <select value={freshness} onChange={(event) => setFreshness(event.target.value)} className="focus-ring h-8 rounded-md border bg-[var(--panel)] px-2 text-sm"><option value="ANY">Any age</option><option value="3">Last 72h</option><option value="7">Last 7 days</option><option value="14">Last 14 days</option></select>
      <label className="flex h-8 items-center gap-2 rounded-md border px-3 text-sm"><input type="checkbox" checked={remoteOnly} onChange={(event) => setRemoteOnly(event.target.checked)} /> Remote</label>
      <label className="flex h-8 items-center gap-2 rounded-md border px-3 text-sm"><input type="checkbox" checked={compatibleOnly} onChange={(event) => setCompatibleOnly(event.target.checked)} /> Мой язык <HelpTooltip text="Оставляет вакансии без языкового hard stop. Рабочие языки и строгий/гибкий режим настраиваются в профиле." /></label>
      <label className="relative ml-auto min-w-56 flex-1 sm:max-w-80"><Search size={16} className="absolute left-3 top-2 text-[var(--muted)]" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search company, title, skill…" className="focus-ring h-8 w-full rounded-md border bg-[var(--panel)] pl-9 pr-3 text-sm" /></label>
    </section>{verificationMessage && <div className="rounded-md border bg-[var(--panel)] px-4 py-3 text-sm font-semibold">{verificationMessage}</div>}

    <div className="space-y-3">
      {visible.map((item) => <article key={item.id} className="panel overflow-hidden transition hover:border-[var(--accent)]">
        <div className="grid lg:grid-cols-[90px_minmax(220px,1.2fr)_minmax(260px,1.35fr)_190px]">
          <div className={`flex flex-row items-center gap-3 border-b p-4 lg:flex-col lg:justify-center lg:border-b-0 lg:border-r ${item.bucket === "A" ? "bg-[var(--good-soft)]" : item.bucket === "B" ? "bg-[var(--accent-soft)]" : "bg-[var(--panel-2)]"}`}>
            <div className={`text-3xl font-black ${item.bucket === "A" ? "text-[var(--good)]" : item.bucket === "B" ? "text-[var(--accent)]" : "text-[var(--muted)]"}`}>{item.score}</div>
            <Badge tone={item.bucket === "A" ? "good" : item.bucket === "B" ? "blue" : "neutral"}>FIT {item.bucket}</Badge>
          </div>
          <div className="border-b p-4 lg:border-b-0 lg:border-r">
            <div className="mb-2 flex flex-wrap items-center gap-2"><Badge>{item.source}</Badge>{item.verificationStatus === "active" ? <Badge tone="good"><ShieldCheck size={12} /> АКТИВНА</Badge> : <Badge tone="warn">НЕ ПРОВЕРЕНА</Badge>}<span className="text-xs text-[var(--muted)]">{relativeDate(item.publishedAt, referenceTime)}</span></div>
            <Link href={`/jobs/${item.id}`} className="focus-ring rounded text-lg font-black leading-tight hover:text-[var(--accent)]">{item.title}</Link>
            <div className="mt-1 font-semibold">{item.company}</div>
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-[var(--muted)]"><span>{item.location || "Location not stated"}</span><span>{item.salaryMax ? `${item.salaryMin ? `${item.salaryMin.toLocaleString("en-US")}–` : ""}${item.salaryMax.toLocaleString("en-US")} ${item.salaryCurrency || ""}` : "Salary undisclosed"}</span><span>Язык: {item.requiredLanguages.join(" + ") || item.descriptionLanguage}</span></div>
          </div>
          <div className="grid gap-3 border-b p-4 sm:grid-cols-2 lg:border-b-0 lg:border-r">
            <div><div className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[var(--good)]"><CheckCircle2 size={15} /> Why it fits</div><ul className="space-y-1 text-sm">{item.positives.slice(0, 4).map((reason) => <li key={reason}>+ {reason}</li>)}</ul></div>
            <div><div className={`mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider ${item.hardStops.length ? "text-[var(--danger)]" : "text-[var(--warn)]"}`}>{item.hardStops.length ? <ShieldX size={15} /> : <AlertTriangle size={15} />} Risks</div><ul className="space-y-1 text-sm">{[...item.hardStops, ...item.negatives].slice(0, 3).map((reason) => <li key={reason}>− {reason}</li>)}</ul>{!item.hardStops.length && !item.negatives.length && <span className="text-sm text-[var(--muted)]">No major risks detected</span>}</div>
          </div>
          <div className="flex flex-col justify-between gap-4 p-4">
            <div><div className="text-xs font-bold uppercase tracking-wider text-[var(--muted)]">Recommended</div><div className={`mt-1 text-sm font-black ${item.hardStops.length ? "text-[var(--danger)]" : "text-[var(--text)]"}`}>{item.recommendation}</div></div>
            <div className="space-y-2">
              <StatusActions vacancyId={item.id} currentStatus={item.status} />
              <div className="flex gap-2"><Link href={`/jobs/${item.id}`} className="flex-1"><Button size="sm" className="w-full">Details</Button></Link>{item.url && <a href={item.url} target="_blank" rel="noreferrer"><Button size="sm" variant="ghost" aria-label="Open original"><ExternalLink size={16} /></Button></a>}</div>
            </div>
          </div>
        </div>
      </article>)}
      {!visible.length && (
        <div className="panel flex flex-col items-center p-12 text-center">
          {items.length === 0 ? (
            <div className="max-w-md animate-fade-in">
              <div className="mb-4 text-4xl">🚀</div>
              <h2 className="text-xl font-black">Welcome to Job Radar</h2>
              <p className="mt-2 text-sm text-[var(--muted)]">You don&apos;t have any vacancies yet. Let&apos;s get you set up to find the best opportunities.</p>
              
              <div className="mt-8 space-y-4 text-left">
                <div className="flex items-start gap-3">
                  <div className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[var(--accent-soft)] text-xs font-bold text-[var(--accent)]">1</div>
                  <div>
                    <div className="font-bold">Review your Profile</div>
                    <div className="text-xs text-[var(--muted)]">Your skills and target salary determine the fit scores.</div>
                    <Link href="/profiles" className="mt-1 inline-block text-xs font-bold text-[var(--accent)] hover:underline">Edit Profile →</Link>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[var(--accent-soft)] text-xs font-bold text-[var(--accent)]">2</div>
                  <div>
                    <div className="font-bold">Configure Sources</div>
                    <div className="text-xs text-[var(--muted)]">Enable job boards and set your search queries.</div>
                    <Link href="/sources" className="mt-1 inline-block text-xs font-bold text-[var(--accent)] hover:underline">Open Sources →</Link>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[var(--accent-soft)] text-xs font-bold text-[var(--accent)]">3</div>
                  <div>
                    <div className="font-bold">Fetch Vacancies</div>
                    <div className="text-xs text-[var(--muted)]">Pull in the latest jobs from your active sources.</div>
                    <Link href="/sources/hh" className="mt-1 inline-block text-xs font-bold text-[var(--accent)] hover:underline">Start Fetching →</Link>
                  </div>
                </div>
              </div>
              <div className="mt-8 flex flex-wrap justify-center gap-3 border-t pt-6">
                <Link href="/import"><Button variant="secondary">Paste single vacancy</Button></Link>
                <Link href="/sources/hh"><Button variant="primary">Start finding jobs</Button></Link>
              </div>
            </div>
          ) : (
            <div className="animate-fade-in">
              <div className="font-bold">Вакансии есть, но скрыты фильтрами</div>
              <div className="mt-1 text-sm text-[var(--muted)]">Выберите «Все», увеличьте давность или отключите фильтр языка.</div>
              <Button type="button" onClick={() => { setFit("ALL"); setSource("ALL"); setRemoteOnly(false); setCompatibleOnly(false); setFreshness("ANY"); setSearch(""); }} className="mt-4">
                Сбросить фильтры
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  </div>;
}
