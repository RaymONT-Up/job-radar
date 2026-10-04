"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ClipboardPaste, Save, Sparkles } from "lucide-react";
import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import type { NormalizedVacancy, ScoreResult } from "@/entities/types";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";

const formSchema = z.object({
  url: z.string(), title: z.string().min(2, "Add the role title"), company: z.string().min(2, "Add the company"),
  location: z.string(), description: z.string().min(30, "Paste at least 30 characters of the vacancy"),
});
type FormValue = z.infer<typeof formSchema>;
type Analysis = { vacancy: FormValue & { source: string }; normalized: NormalizedVacancy; score: ScoreResult };

export function ImportForm() {
  const params = useSearchParams();
  const router = useRouter();
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [message, setMessage] = useState("");
  const { register, handleSubmit, reset, setValue, formState: { errors, isSubmitting } } = useForm<FormValue>({
    resolver: zodResolver(formSchema),
    defaultValues: { url: "", title: "", company: "", location: "", description: "" },
  });
  useEffect(() => {
    reset({ url: params.get("url") ?? "", title: params.get("title") ?? "", company: "", location: "", description: params.get("text") ?? "" });
  }, [params, reset]);

  async function analyze(value: FormValue) {
    setMessage("");
    const response = await fetch("/api/vacancies/analyze", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(value) });
    const result = await response.json() as Analysis & { error?: string };
    if (!response.ok) throw new Error(result.error || "Analysis failed");
    setAnalysis(result);
  }
  async function pasteClipboard() {
    try { setValue("description", await navigator.clipboard.readText(), { shouldValidate: true }); }
    catch { setMessage("Clipboard access was blocked. Use ⌘V / Ctrl+V instead."); }
  }
  async function save() {
    if (!analysis) return;
    const response = await fetch("/api/vacancies/import", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(analysis.vacancy) });
    const result = await response.json() as { id?: string; duplicate?: boolean; error?: string };
    if (!response.ok || !result.id) { setMessage(result.error || "Could not save vacancy"); return; }
    setMessage(result.duplicate ? "This vacancy already exists — opening the existing record." : "Saved to your ranked inbox.");
    setTimeout(() => router.push(`/jobs/${result.id}`), 500);
  }

  return <div className="grid gap-5 xl:grid-cols-[minmax(0,1.1fr)_minmax(360px,.9fr)]">
    <form onSubmit={handleSubmit(analyze)} className="panel p-5 md:p-6">
      <div className="mb-5 flex items-start justify-between gap-4"><div><h2 className="text-lg font-black">Paste a vacancy</h2><p className="mt-1 text-sm text-[var(--muted)]">LinkedIn, Telegram, Getmatch, Habr, or any career page.</p></div><Button type="button" size="sm" onClick={pasteClipboard}><ClipboardPaste size={16} /> Paste clipboard</Button></div>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="sm:col-span-2"><span className="mb-1.5 block text-sm font-bold">URL <span className="font-normal text-[var(--muted)]">optional, source is auto-detected</span></span><input {...register("url")} className="focus-ring h-10 w-full rounded-md border bg-[var(--panel)] px-3" placeholder="https://linkedin.com/jobs/view/…" /></label>
        <label><span className="mb-1.5 block text-sm font-bold">Role title</span><input {...register("title")} className="focus-ring h-10 w-full rounded-md border bg-[var(--panel)] px-3" placeholder="Senior Frontend Engineer" />{errors.title && <span className="text-xs text-[var(--danger)]">{errors.title.message}</span>}</label>
        <label><span className="mb-1.5 block text-sm font-bold">Company</span><input {...register("company")} className="focus-ring h-10 w-full rounded-md border bg-[var(--panel)] px-3" placeholder="Company name" />{errors.company && <span className="text-xs text-[var(--danger)]">{errors.company.message}</span>}</label>
        <label className="sm:col-span-2"><span className="mb-1.5 block text-sm font-bold">Location <span className="font-normal text-[var(--muted)]">optional</span></span><input {...register("location")} className="focus-ring h-10 w-full rounded-md border bg-[var(--panel)] px-3" placeholder="Remote / Europe" /></label>
        <label className="sm:col-span-2"><span className="mb-1.5 block text-sm font-bold">Vacancy text</span><textarea {...register("description")} className="focus-ring min-h-72 w-full resize-y rounded-md border bg-[var(--panel)] p-3 leading-relaxed" placeholder="Paste the complete vacancy description here…" />{errors.description && <span className="text-xs text-[var(--danger)]">{errors.description.message}</span>}</label>
      </div>
      {message && <p className="mt-3 text-sm font-semibold text-[var(--accent)]">{message}</p>}
      <Button type="submit" variant="primary" className="mt-5" disabled={isSubmitting}><Sparkles size={17} />{isSubmitting ? "Analyzing…" : "Analyze fit"}</Button>
    </form>

    <section className="panel min-h-96 p-5 md:p-6">
      {!analysis ? <div className="grid h-full min-h-80 place-items-center text-center"><div><div className="mx-auto mb-3 grid size-12 place-items-center rounded-xl bg-[var(--accent-soft)] text-[var(--accent)]"><Sparkles /></div><div className="font-bold">Your fit analysis will appear here</div><p className="mt-1 max-w-sm text-sm text-[var(--muted)]">Job Radar extracts skills, seniority, salary, location constraints, and scores them against the active profile.</p></div></div> : <div>
        <div className="flex items-center gap-4 border-b pb-5"><div className={`text-5xl font-black ${analysis.score.bucket === "A" ? "text-[var(--good)]" : analysis.score.bucket === "B" ? "text-[var(--accent)]" : "text-[var(--muted)]"}`}>{analysis.score.score}</div><div><Badge tone={analysis.score.bucket === "A" ? "good" : analysis.score.bucket === "B" ? "blue" : "neutral"}>FIT {analysis.score.bucket}</Badge><div className="mt-1 font-black">{analysis.score.recommendation}</div></div></div>
        <div className="grid gap-5 py-5 sm:grid-cols-2"><div><h3 className="text-sm font-black text-[var(--good)]">WHY IT FITS</h3><ul className="mt-2 space-y-2 text-sm">{analysis.score.positiveReasons.map((reason) => <li key={reason}>+ {reason}</li>)}</ul></div><div><h3 className={`text-sm font-black ${analysis.score.hardStops.length ? "text-[var(--danger)]" : "text-[var(--warn)]"}`}>RISKS</h3><ul className="mt-2 space-y-2 text-sm">{[...analysis.score.hardStops, ...analysis.score.negativeReasons].map((reason) => <li key={reason}>− {reason}</li>)}</ul></div></div>
        <div className="border-y py-4"><div className="text-xs font-black uppercase tracking-wider text-[var(--muted)]">Extracted</div><div className="mt-2 flex flex-wrap gap-2">{analysis.normalized.skills.map((skill) => <Badge key={skill}>{skill}</Badge>)}{analysis.normalized.domains.map((domain) => <Badge key={domain} tone="blue">{domain}</Badge>)}</div><div className="mt-3 text-sm text-[var(--muted)]">{[analysis.normalized.detectedSeniority, analysis.normalized.detectedRemote, analysis.normalized.detectedYearsMin ? `${analysis.normalized.detectedYearsMin}+ years` : null, analysis.normalized.detectedLanguage].filter(Boolean).join(" · ") || "No extra constraints detected"}</div></div>
        <Button variant="primary" className="mt-5 w-full" onClick={save}><Save size={17} /> Save to ranked inbox</Button>
      </div>}
    </section>
  </div>;
}
