import Link from "next/link";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { notFound } from "next/navigation";
import type { ApplicationStatus, CandidateProfile, FitBucket, NormalizedVacancy, ScoreResult, VacancyInput } from "@/entities/types";
import { buildOfferSprint } from "@/features/offer-sprint/build";
import { OfferSprintCard } from "@/features/offer-sprint/offer-sprint-card";
import { OutreachApprovalCard } from "@/features/outreach/outreach-approval-card";
import { StatusActions } from "@/features/pipeline/status-actions";
import { outreachMailStatus } from "@/server/outreach/mailer";
import { getActiveProfile, getOutreachDraft, getVacancyDetail } from "@/server/repository";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { DetailActions } from "./detail-actions";

export const dynamic = "force-dynamic";

export default async function VacancyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const profile = await getActiveProfile();
  if (!profile) notFound();
  const row = await getVacancyDetail(id, profile.id);
  if (!row) notFound();
  const { vacancy, score, application, normalized, events } = row;
  const outreach = getOutreachDraft(vacancy.id, profile.id);
  const bucket = (score?.bucket ?? "C") as FitBucket;
  const sprint = score && normalized ? buildOfferSprint({
    vacancy: vacancy as VacancyInput,
    normalized: { ...normalized, descriptionLanguage: normalized.descriptionLanguage ?? "Unknown", requiredLanguages: normalized.requiredLanguages ?? [] } as NormalizedVacancy,
    score: score as ScoreResult,
    profile: profile as CandidateProfile,
    status: (application?.status ?? "FOUND") as ApplicationStatus,
    verificationStatus: vacancy.verificationStatus,
  }) : null;

  return <div className="space-y-5">
    <Link href="/inbox" className="inline-flex items-center gap-2 text-sm font-bold text-[var(--muted)] hover:text-[var(--text)]"><ArrowLeft size={16} /> Back to inbox</Link>
    <section className="panel p-5 md:p-7">
      <div className="flex flex-col gap-5 md:flex-row md:items-start">
        <div className={`grid size-20 shrink-0 place-items-center rounded-xl text-3xl font-black ${bucket === "A" ? "bg-[var(--good-soft)] text-[var(--good)]" : bucket === "B" ? "bg-[var(--accent-soft)] text-[var(--accent)]" : "bg-[var(--panel-2)]"}`}>{score?.score ?? "—"}</div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap gap-2"><Badge tone={bucket === "A" ? "good" : bucket === "B" ? "blue" : "neutral"}>FIT {bucket}</Badge><Badge>{vacancy.source}</Badge><Badge>{application?.status ?? "FOUND"}</Badge><Badge tone={vacancy.verificationStatus === "active" ? "good" : "warn"}>{vacancy.verificationStatus === "active" ? "АКТИВНА" : "НЕ ПРОВЕРЕНА"}</Badge></div>
          <h1 className="mt-3 text-2xl font-black leading-tight md:text-3xl">{vacancy.title}</h1>
          <div className="mt-1 text-lg font-semibold">{vacancy.company}</div>
          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm text-[var(--muted)]"><span>{vacancy.location || "Location not stated"}</span><span>{vacancy.publishedAt?.toLocaleDateString() ?? "Publication date unknown"}</span><span>{vacancy.salaryMax ? `${vacancy.salaryMin ?? ""}–${vacancy.salaryMax} ${vacancy.salaryCurrency}` : normalized?.detectedSalary?.max ? `up to ${normalized.detectedSalary.max} ${normalized.detectedSalary.currency}` : "Salary undisclosed"}</span><span>Язык: {normalized?.requiredLanguages?.join(" + ") || normalized?.descriptionLanguage || "не определён"}</span></div>
        </div>
        <div className="flex shrink-0 flex-col gap-2"><StatusActions vacancyId={vacancy.id} currentStatus={(application?.status ?? "FOUND") as ApplicationStatus} compact />{vacancy.url && <a href={vacancy.url} target="_blank" rel="noreferrer"><Button className="w-full"><ExternalLink size={16} /> Open original</Button></a>}</div>
      </div>
      <div className="mt-5 flex flex-wrap gap-3 border-t pt-4 text-sm">
        {vacancy.companyWebsite && <a href={vacancy.companyWebsite} target="_blank" rel="noreferrer" className="font-semibold text-blue-600 hover:underline">Сайт компании ↗</a>}
        {vacancy.companyEmail && <a href={`mailto:${vacancy.companyEmail}`} className="font-semibold text-blue-600 hover:underline">Рабочая почта: {vacancy.companyEmail}</a>}
        {vacancy.companyDataSource && <span className="text-[var(--muted)]">Данные компании: {vacancy.companyDataSource}</span>}
        {!vacancy.companyWebsite && !vacancy.companyEmail && <span className="text-[var(--muted)]">Публичные контакты компании в источнике не найдены — не угадываем адреса.</span>}
      </div>
    </section>
    {sprint && <OfferSprintCard sprint={sprint} vacancyId={vacancy.id} />}
    <OutreachApprovalCard
      vacancyId={vacancy.id}
      initialDraft={outreach ? { id: outreach.id, recipient: outreach.recipient, subject: outreach.subject, body: outreach.body, resumeName: outreach.resumeName, status: outreach.status, error: outreach.error, sentAt: outreach.sentAt?.toISOString() ?? null } : null}
      mailConfigured={outreachMailStatus().configured}
      defaults={{
        recipient: vacancy.companyEmail ?? "",
        subject: `Отклик на вакансию ${vacancy.title}`,
        body: [`Здравствуйте!`, ``, `Увидел вакансию «${vacancy.title}» в ${vacancy.company} и хочу откликнуться.`, ``, `Мой релевантный опыт: ${profile.yearsExperience}+ лет. Основной стек: ${profile.strongSkills.slice(0, 5).join(", ")}.`, ...profile.proofPoints.slice(0, 2).map((point) => `• ${point}`), ``, `Резюме прикладываю. Буду рад обсудить задачи команды и рассказать подробнее о релевантном опыте.`, ``, `Спасибо!`].join("\n"),
      }}
    />
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(360px,.65fr)]">
      <div className="space-y-5">
        <section className="panel p-5 md:p-6">
          <div className="grid gap-6 sm:grid-cols-2">
            <div><h2 className="text-sm font-black text-[var(--good)]">WHY IT FITS</h2><ul className="mt-3 space-y-2">{score?.positiveReasons.map((reason) => <li key={reason}>+ {reason}</li>)}</ul></div>
            <div><h2 className={`text-sm font-black ${score?.hardStops.length ? "text-[var(--danger)]" : "text-[var(--warn)]"}`}>RISKS & HARD STOPS</h2><ul className="mt-3 space-y-2">{[...(score?.hardStops ?? []), ...(score?.negativeReasons ?? [])].map((reason) => <li key={reason}>− {reason}</li>)}</ul>{!score?.hardStops.length && !score?.negativeReasons.length && <p className="mt-3 text-[var(--muted)]">No major risks detected.</p>}</div>
          </div>
          <div className="mt-5 border-t pt-4"><div className="text-xs font-black uppercase tracking-wider text-[var(--muted)]">Scoring breakdown</div><div className="mt-2 flex flex-wrap gap-2">{Object.entries(score?.breakdown ?? {}).map(([key, value]) => <Badge key={key}>{key} +{value}</Badge>)}</div></div>
        </section>
        <section className="panel p-5 md:p-6"><h2 className="font-black">Vacancy description</h2><p className="mt-4 whitespace-pre-wrap leading-7 text-[var(--text)]">{vacancy.description}</p></section>
        <section className="panel p-5 md:p-6"><h2 className="font-black">Activity timeline</h2><div className="mt-4 space-y-4">{events.map((event) => <div key={event.id} className="flex gap-3"><div className="mt-1 size-2 shrink-0 rounded-full bg-[var(--accent)]" /><div><div className="text-sm font-bold">{event.type.replaceAll("_", " ")}{event.newStatus ? ` → ${event.newStatus}` : ""}</div><div className="text-xs text-[var(--muted)]">{event.createdAt.toLocaleString()}</div></div></div>)}{!events.length && <p className="text-sm text-[var(--muted)]">No application events yet.</p>}</div></section>
      </div>
      <DetailActions vacancyId={vacancy.id} applicationId={application?.id ?? null} initial={{ contactName: application?.contactName ?? "", contactRole: application?.contactRole ?? "", contactUrl: application?.contactUrl ?? "", notes: application?.notes ?? "", followUpAt: application?.followUpAt?.toISOString().slice(0, 10) ?? "", applicationMethod: application?.applicationMethod ?? "tailored" }} />
    </div>
  </div>;
}
