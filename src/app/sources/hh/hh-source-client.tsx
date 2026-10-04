"use client";

import { DatabaseZap, RefreshCw, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { DEFAULT_HH_QUERIES } from "@/server/integrations/hh/adapter";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";

type Summary = { fetched: number; uniqueFetched: number; duplicates: number; saved: number; hardFiltered: number; languageFiltered: number; aFit: number; bFit: number };

export function HHSourceClient() {
  const [queries, setQueries] = useState(DEFAULT_HH_QUERIES.join("\n"));
  const [summary, setSummary] = useState<Summary | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  async function sync() {
    setLoading(true); setError("");
    try {
      const response = await fetch("/api/hh/fetch", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ queries: queries.split("\n").map((item) => item.trim()).filter(Boolean), limit: 60 }) });
      const result = await response.json() as Summary & { error?: string };
      if (!response.ok) throw new Error(result.error || "HH sync failed");
      setSummary(result);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "HH sync failed"); }
    finally { setLoading(false); }
  }
  return <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_440px]">
    <section className="panel p-5 md:p-6"><div className="flex items-start gap-3"><div className="grid size-10 place-items-center rounded-lg bg-red-100 font-black text-red-700">hh</div><div><h2 className="text-lg font-black">HeadHunter API</h2><div className="mt-1 flex items-center gap-2 text-sm text-[var(--muted)]"><ShieldCheck size={15} /> Official public API · no scraping</div></div><Badge tone="good" className="ml-auto">READY</Badge></div>
      <label className="mt-6 block"><span className="mb-2 block text-sm font-bold">Search queries <span className="font-normal text-[var(--muted)]">one per line</span></span><textarea value={queries} onChange={(event) => setQueries(event.target.value)} className="focus-ring min-h-72 w-full rounded-md border bg-[var(--panel)] p-3 font-mono text-sm leading-6" /></label>
      <p className="mt-3 text-sm text-[var(--muted)]">Fetches up to 60 recent details with a five-request concurrency limit, then normalizes, deduplicates, and scores every vacancy.</p>
      {error && <div className="mt-4 rounded-md bg-[var(--danger-soft)] p-3 text-sm font-semibold text-[var(--danger)]">{error}. Your existing data was not changed.</div>}
      <Button variant="primary" className="mt-5" onClick={sync} disabled={loading}><RefreshCw size={17} className={loading ? "animate-spin" : ""} /> {loading ? "Fetching and scoring…" : "Fetch latest vacancies"}</Button>
    </section>
    <section className="panel p-5 md:p-6"><div className="flex items-center gap-2"><DatabaseZap size={20} className="text-[var(--accent)]" /><h2 className="text-lg font-black">Latest sync</h2></div>
      {!summary ? <div className="grid min-h-80 place-items-center text-center"><div><div className="text-3xl font-black text-[var(--muted)]">—</div><p className="mt-2 text-sm text-[var(--muted)]">Run a sync to see ingestion results.</p></div></div> : <div className="mt-6 grid grid-cols-2 gap-3">
        {[{ label: "Fetched", value: summary.fetched }, { label: "Unique details", value: summary.uniqueFetched }, { label: "Duplicates", value: summary.duplicates }, { label: "Saved", value: summary.saved }, { label: "Hard filtered", value: summary.hardFiltered }, { label: "Не ваш язык", value: summary.languageFiltered }, { label: "A-fit", value: summary.aFit, tone: "good" }, { label: "B-fit", value: summary.bFit, tone: "blue" }].map((metric) => <div key={metric.label} className="rounded-lg border bg-[var(--panel-2)] p-4"><div className={`text-3xl font-black ${metric.tone === "good" ? "text-[var(--good)]" : metric.tone === "blue" ? "text-[var(--accent)]" : ""}`}>{metric.value}</div><div className="mt-1 text-sm text-[var(--muted)]">{metric.label}</div></div>)}
      </div>}
    </section>
  </div>;
}
