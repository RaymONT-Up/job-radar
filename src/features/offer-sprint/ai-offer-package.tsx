"use client";

import Link from "next/link";
import { Check, Clipboard, LoaderCircle, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import type { AiOfferPackage } from "@/entities/types";
import { Button } from "@/shared/ui/button";
import { HelpTooltip } from "@/shared/ui/help-tooltip";

function Copy({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() { await navigator.clipboard.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 1400); }
  return <button onClick={copy} className="focus-ring inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-bold text-[var(--accent)] hover:bg-[var(--accent-soft)]">{copied ? <Check size={13} /> : <Clipboard size={13} />}{copied ? "Скопировано" : "Копировать"}</button>;
}

function TextBlock({ title, value }: { title: string; value: string }) {
  return <div className="rounded-lg border bg-[var(--panel)] p-4"><div className="flex items-center justify-between gap-3"><h4 className="text-sm font-black">{title}</h4><Copy value={value} /></div><p className="mt-2 whitespace-pre-wrap text-sm leading-6">{value}</p></div>;
}

export function AiOfferPackageCard({ vacancyId }: { vacancyId: string }) {
  const [result, setResult] = useState<AiOfferPackage | null>(null);
  const [model, setModel] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [configured, setConfigured] = useState<boolean | null>(null);
  useEffect(() => {
    fetch(`/api/jobs/${vacancyId}/ai-offer-sprint`).then((response) => response.json()).then((value: { configured?: boolean; model?: string }) => {
      setConfigured(Boolean(value.configured));
      if (value.model) setModel(value.model);
    }).catch(() => setConfigured(null));
  }, [vacancyId]);
  async function generate() {
    setPending(true); setError("");
    try {
      const response = await fetch(`/api/jobs/${vacancyId}/ai-offer-sprint`, { method: "POST" });
      const value = await response.json() as { package?: AiOfferPackage; model?: string; error?: string };
      if (!response.ok || !value.package) throw new Error(value.error || "Не удалось сгенерировать пакет");
      setResult(value.package); setModel(value.model ?? "AI");
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Не удалось сгенерировать пакет"); }
    finally { setPending(false); }
  }
  return <div className="border-t bg-[var(--panel-2)] p-5"><div className="flex flex-col gap-3 sm:flex-row sm:items-center"><div className="min-w-0 flex-1"><div className="flex items-center gap-2 font-black"><Sparkles size={17} className="text-[var(--accent)]" />AI-усиление отклика <HelpTooltip text="Не запускается автоматически. Только после клика профиль и текст этой вакансии отправляются в OpenAI API, используя твой ключ." /></div><p className="mt-1 text-sm text-[var(--muted)]">Сделает персональное письмо, follow-up и interview pitch. Только правдивые факты из профиля.</p></div>{configured === false ? <Link href="/settings"><Button variant="primary">Добавить OpenAI key</Button></Link> : <Button variant="primary" onClick={generate} disabled={pending || configured === null}>{pending ? <LoaderCircle size={16} className="animate-spin" /> : <Sparkles size={16} />}{pending ? "Генерирую…" : configured === null ? "Проверяю ключ…" : result ? "Сгенерировать заново" : "Сгенерировать с AI"}</Button>}</div><p className="mt-2 text-xs text-[var(--muted)]">{configured === false ? "AI пока выключен: добавь свой ключ в Settings. Базовый локальный пакет выше уже работает без ключа." : "Клик отправляет профиль и описание вакансии внешнему AI-провайдеру. Автоматических запросов и расходов нет."}</p>{error && <div className="mt-3 rounded-md bg-[var(--danger-soft)] p-3 text-sm font-semibold text-[var(--danger)]">{error} {error.includes("Settings") && <Link href="/settings" className="underline">Открыть Settings</Link>}</div>}{result && <div className="mt-5 space-y-4"><div className="flex items-center gap-2 text-xs text-[var(--muted)]"><span>Модель: {model}</span><span>·</span><span>Результат нужно проверить перед отправкой</span></div><TextBlock title="Стратегия" value={result.strategy} /><TextBlock title="Заголовок резюме" value={result.resumeHeadline} /><TextBlock title="Сообщение рекрутеру" value={result.recruiterMessage} /><TextBlock title="Сопроводительное письмо" value={result.coverLetter} /><TextBlock title="Follow-up" value={result.followUpMessage} /><TextBlock title="Самопрезентация на интервью" value={result.interviewPitch} /><div className="grid gap-4 md:grid-cols-2"><div className="rounded-lg border bg-[var(--panel)] p-4"><h4 className="text-sm font-black">Вопросы интервью</h4><ul className="mt-2 space-y-2 text-sm">{result.interviewQuestions.map((item) => <li key={item}>— {item}</li>)}</ul></div><div className="rounded-lg border bg-[var(--warn-soft)] p-4"><h4 className="text-sm font-black text-[var(--warn)]">Риски и что проверить</h4><ul className="mt-2 space-y-2 text-sm">{result.risks.map((item) => <li key={item}>— {item}</li>)}</ul></div></div></div>}</div>;
}
