"use client";

import { Check, Clipboard, Crosshair, MessageSquareText, Target } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import type { OfferSprint } from "./build";
import { AiOfferPackageCard } from "./ai-offer-package";
import { HelpTooltip } from "@/shared/ui/help-tooltip";

function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }
  return <Button size="sm" onClick={copy}>{copied ? <Check size={15} /> : <Clipboard size={15} />}{copied ? "Скопировано" : label}</Button>;
}

export function OfferSprintCard({ sprint, vacancyId }: { sprint: OfferSprint; vacancyId: string }) {
  const fullPack = ["ЗАГОЛОВОК", sprint.resumeHeadline, "", "СООБЩЕНИЕ РЕКРУТЕРУ", sprint.recruiterMessage, "", "ДОКАЗАТЕЛЬСТВА", ...sprint.proofPoints.map((item) => `• ${item}`), "", "ВОПРОСЫ НА ИНТЕРВЬЮ", ...sprint.interviewQuestions.map((item) => `• ${item}`)].join("\n");
  return <section className="panel overflow-hidden">
    <div className="flex flex-col gap-3 border-b bg-[var(--panel-2)] p-5 sm:flex-row sm:items-center"><div className="grid size-10 place-items-center rounded-lg bg-[var(--accent)] text-white"><Crosshair size={20} /></div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h2 className="flex items-center gap-2 font-black">Offer Sprint <HelpTooltip text="Базовый пакет строится мгновенно локальными правилами и не использует нейросеть. AI-версия запускается отдельно только для подходящей вакансии." /></h2><Badge tone={sprint.verdict === "go" ? "good" : sprint.verdict === "hold" ? "warn" : "danger"}>{sprint.verdict === "go" ? "МОЖНО ДЕЙСТВОВАТЬ" : sprint.verdict === "hold" ? "СНАЧАЛА ПРОВЕРИТЬ" : "СТОП"}</Badge></div><p className="mt-1 text-sm text-[var(--muted)]">Базовый локальный пакет под вакансию — без AI и выдуманных достижений.</p></div>{sprint.verdict !== "stop" && <CopyButton value={fullPack} label="Скопировать всё" />}</div>
    {sprint.verdict === "stop" ? <div className="p-5"><div className="text-sm font-black text-[var(--danger)]">Почему не стоит откликаться</div><p className="mt-2 rounded-md bg-[var(--danger-soft)] p-4 font-semibold text-[var(--danger)]">{sprint.nextAction}</p><p className="mt-3 text-sm text-[var(--muted)]">Пакет отклика и AI-генерация скрыты, чтобы не тратить время и токены на заведомо неподходящую или закрытую вакансию.</p></div> : <>
    <div className="grid gap-0 lg:grid-cols-2">
      <div className="space-y-5 border-b p-5 lg:border-b-0 lg:border-r">
        <div><div className="mb-2 flex items-center gap-2 text-sm font-black"><Target size={17} className="text-[var(--accent)]" /> Следующее действие</div><p className="rounded-md bg-[var(--accent-soft)] p-3 font-semibold text-[var(--accent)]">{sprint.nextAction}</p></div>
        <div><div className="text-sm font-black">Доказательства для резюме</div><ul className="mt-2 space-y-2 text-sm">{sprint.proofPoints.map((item) => <li key={item} className="flex gap-2"><Check size={16} className="mt-0.5 shrink-0 text-[var(--good)]" />{item}</li>)}</ul></div>
        <div><div className="text-sm font-black">Чек-лист отклика</div><ol className="mt-2 space-y-2 text-sm">{sprint.applicationChecklist.map((item, index) => <li key={item} className="flex gap-2"><span className="grid size-5 shrink-0 place-items-center rounded bg-[var(--panel-2)] text-xs font-bold">{index + 1}</span>{item}</li>)}</ol></div>
      </div>
      <div className="space-y-5 p-5">
        <div><div className="mb-2 flex items-center gap-2 text-sm font-black"><MessageSquareText size={17} className="text-[var(--accent)]" /> Сообщение рекрутеру</div><p className="rounded-md border bg-[var(--panel)] p-3 text-sm leading-6">{sprint.recruiterMessage}</p><div className="mt-2"><CopyButton value={sprint.recruiterMessage} label="Скопировать сообщение" /></div></div>
        <div><div className="text-sm font-black">Вопросы, которые повышают качество интервью</div><ul className="mt-2 space-y-2 text-sm">{sprint.interviewQuestions.map((item) => <li key={item}>— {item}</li>)}</ul></div>
        {sprint.missingSkills.length > 0 && <div className="rounded-md bg-[var(--warn-soft)] p-3 text-sm text-[var(--warn)]"><strong>Не подтверждено профилем:</strong> {sprint.missingSkills.join(", ")}. Не добавляйте это в резюме без реального опыта.</div>}
      </div>
    </div>
    <AiOfferPackageCard vacancyId={vacancyId} />
    </>}
  </section>;
}
