"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { BreakdownMetric, ConversionDiagnosis, StageMetric } from "@/features/analytics/calculate";
import { Badge } from "@/shared/ui/badge";

function Breakdown({ title, rows }: { title: string; rows: BreakdownMetric[] }) {
  return <section className="panel p-5"><h2 className="font-black">{title}</h2><div className="mt-4 space-y-3">{rows.map((row) => <div key={row.label} className="flex items-center gap-3 rounded-md border p-3"><div className="min-w-0 flex-1"><div className="truncate font-bold">{row.label}</div><div className="text-sm text-[var(--muted)]">{row.applications} applications · {row.replies} replies</div></div>{row.insufficient ? <Badge tone="warn">INSUFFICIENT DATA</Badge> : <div className="text-xl font-black">{row.replyRate}%</div>}</div>)}</div></section>;
}

export function AnalyticsCharts({ funnel, bySource, byBucket, byMethod, diagnosis }: { funnel: StageMetric[]; bySource: BreakdownMetric[]; byBucket: BreakdownMetric[]; byMethod: BreakdownMetric[]; diagnosis: ConversionDiagnosis }) {
  return <div className="space-y-5">
    <section className="panel overflow-hidden"><div className="grid gap-5 bg-[var(--accent-soft)] p-5 md:grid-cols-[180px_1fr] md:p-6"><div><Badge tone="blue">CONVERSION COACH</Badge><div className="mt-3 text-sm font-bold text-[var(--muted)]">Текущее узкое место</div><div className="mt-1 text-xl font-black text-[var(--accent)]">{diagnosis.stage.toUpperCase()}</div></div><div><h2 className="text-xl font-black">{diagnosis.headline}</h2><p className="mt-2 leading-7">{diagnosis.action}</p><p className="mt-3 text-sm font-semibold text-[var(--muted)]">Основание: {diagnosis.evidence}</p></div></div></section>
    <section className="panel p-5 md:p-6"><div className="mb-5"><h2 className="font-black">Application funnel</h2><p className="text-sm text-[var(--muted)]">Conversions are between adjacent stages.</p></div><div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_380px]"><div className="h-72"><ResponsiveContainer width="100%" height="100%"><BarChart data={funnel} margin={{ left: -20 }}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--line)" /><XAxis dataKey="stage" tick={{ fill: "var(--muted)", fontSize: 12 }} axisLine={false} tickLine={false} /><YAxis allowDecimals={false} tick={{ fill: "var(--muted)", fontSize: 12 }} axisLine={false} tickLine={false} /><Tooltip contentStyle={{ background: "var(--panel)", border: "1px solid var(--line)", borderRadius: 8 }} /><Bar dataKey="count" fill="var(--accent)" radius={[5, 5, 0, 0]} /></BarChart></ResponsiveContainer></div><div className="grid grid-cols-2 gap-2">{funnel.map((item) => <div key={item.stage} className="rounded-lg bg-[var(--panel-2)] p-3"><div className="text-2xl font-black">{item.count}</div><div className="text-sm font-semibold">{item.stage}</div><div className="mt-1 text-xs text-[var(--muted)]">{item.conversion === null ? "Baseline" : `${item.conversion}% from previous`}</div></div>)}</div></div></section>
    <div className="grid gap-5 lg:grid-cols-3"><Breakdown title="Performance by source" rows={bySource} /><Breakdown title="Performance by fit bucket" rows={byBucket} /><Breakdown title="Performance by tactic" rows={byMethod} /></div>
  </div>;
}
