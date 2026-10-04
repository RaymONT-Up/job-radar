import Link from "next/link";
import { AlarmClock, ArrowUpRight, Flame, Inbox, TimerReset } from "lucide-react";
import type { ApplicationStatus } from "@/entities/types";
import { FollowUpButton } from "@/features/follow-up/follow-up-button";
import { StatusActions } from "@/features/pipeline/status-actions";
import { getActiveProfile, getTodayActions } from "@/server/repository";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";

export const dynamic = "force-dynamic";
const age = (date: Date | null) => date ? `${Math.max(0, Math.floor((Date.now() - date.getTime()) / 86_400_000))}d ago` : "—";

function JobLine({ id, title, company, source, score, status }: { id: string; title: string; company: string; source: string; score: number; status: ApplicationStatus }) {
  return <div className="flex flex-col gap-3 border-b p-4 last:border-b-0 sm:flex-row sm:items-center"><div className="grid size-11 shrink-0 place-items-center rounded-lg bg-[var(--good-soft)] text-lg font-black text-[var(--good)]">{score}</div><div className="min-w-0 flex-1"><Link href={`/jobs/${id}`} className="font-black hover:text-[var(--accent)]">{title}</Link><div className="mt-0.5 text-sm text-[var(--muted)]">{company} · {source}</div></div><StatusActions vacancyId={id} currentStatus={status} /></div>;
}

export default async function TodayPage() {
  const profile = await getActiveProfile();
  if (!profile) return null;
  const actions = await getTodayActions(profile.id);
  const total = actions.highFit.length + actions.followUps.length + actions.stale.length;
  return <div className="space-y-6">
    <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end"><div><div className="mb-2 flex items-center gap-2"><Badge tone="blue">DAILY QUEUE</Badge><span className="text-sm text-[var(--muted)]">{new Date().toLocaleDateString("en", { weekday: "long", month: "long", day: "numeric" })}</span></div><h1 className="text-2xl font-black md:text-3xl">{total ? `${total} actions for today` : "You’re clear for today"}</h1><p className="mt-1 text-[var(--muted)]">Start at the top. No spreadsheet archaeology required.</p></div><Link href="/inbox"><Button><Inbox size={16} /> Ranked inbox</Button></Link></div>
    <section className="panel overflow-hidden"><div className="flex items-center gap-3 border-b bg-[var(--panel-2)] px-4 py-3"><Flame size={19} className="text-[var(--good)]" /><div><h2 className="font-black">High fit — not applied</h2><p className="text-sm text-[var(--muted)]">A-fit vacancies published in the last 72 hours</p></div><Badge tone="good" className="ml-auto">{actions.highFit.length}</Badge></div>{actions.highFit.map((row) => <JobLine key={row.vacancy.id} id={row.vacancy.id} title={row.vacancy.title} company={row.vacancy.company} source={row.vacancy.source} score={row.score.score} status={(row.application?.status ?? "FOUND") as ApplicationStatus} />)}{!actions.highFit.length && <p className="p-5 text-sm text-[var(--muted)]">No new A-fit vacancies need a decision.</p>}</section>
    <section className="panel overflow-hidden"><div className="flex items-center gap-3 border-b bg-[var(--panel-2)] px-4 py-3"><AlarmClock size={19} className="text-[var(--warn)]" /><div><h2 className="font-black">Follow ups</h2><p className="text-sm text-[var(--muted)]">Applied 3+ days ago without contact</p></div><Badge tone="warn" className="ml-auto">{actions.followUps.length}</Badge></div>{actions.followUps.map(({ application, vacancy, score }) => <div key={application.id} className="flex flex-col gap-3 border-b p-4 last:border-b-0 sm:flex-row sm:items-center"><div className="min-w-0 flex-1"><Link href={`/jobs/${vacancy.id}`} className="font-black hover:text-[var(--accent)]">{vacancy.title}</Link><div className="text-sm text-[var(--muted)]">{vacancy.company} · Applied {age(application.appliedAt)} · Fit {score?.bucket ?? "—"}</div></div><FollowUpButton applicationId={application.id} /><a href={vacancy.url ?? `/jobs/${vacancy.id}`} target={vacancy.url ? "_blank" : undefined}><Button size="sm"><ArrowUpRight size={15} /> Open</Button></a></div>)}{!actions.followUps.length && <p className="p-5 text-sm text-[var(--muted)]">No follow-ups are due.</p>}</section>
    <section className="panel overflow-hidden"><div className="flex items-center gap-3 border-b bg-[var(--panel-2)] px-4 py-3"><TimerReset size={19} className="text-[var(--danger)]" /><div><h2 className="font-black">Stale processes</h2><p className="text-sm text-[var(--muted)]">No activity for 5+ days after a reply</p></div><Badge tone="danger" className="ml-auto">{actions.stale.length}</Badge></div>{actions.stale.map(({ application, vacancy, score }) => <div key={application.id} className="flex flex-col gap-3 border-b p-4 last:border-b-0 sm:flex-row sm:items-center"><div className="min-w-0 flex-1"><Link href={`/jobs/${vacancy.id}`} className="font-black hover:text-[var(--accent)]">{vacancy.title}</Link><div className="text-sm text-[var(--muted)]">{vacancy.company} · Last activity {age(application.lastContactAt ?? application.updatedAt)} · Fit {score?.bucket ?? "—"}</div></div><StatusActions vacancyId={vacancy.id} currentStatus={application.status} compact /><FollowUpButton applicationId={application.id} /></div>)}{!actions.stale.length && <p className="p-5 text-sm text-[var(--muted)]">No stale processes.</p>}</section>
  </div>;
}
