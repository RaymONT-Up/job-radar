import Link from "next/link";
import { getActiveProfile, getApplications } from "@/server/repository";
import { StatusActions } from "@/features/pipeline/status-actions";
import { Badge } from "@/shared/ui/badge";

export const dynamic = "force-dynamic";

export default async function ApplicationsPage() {
  const profile = await getActiveProfile();
  const rows = profile ? await getApplications(profile.id) : [];
  return <div className="space-y-5"><div><h1 className="text-2xl font-black md:text-3xl">Applications</h1><p className="mt-1 text-[var(--muted)]">Every active process, one event-backed status.</p></div><div className="panel overflow-x-auto"><table className="w-full min-w-[850px] border-collapse text-left"><thead><tr className="border-b bg-[var(--panel-2)] text-xs uppercase tracking-wider text-[var(--muted)]"><th className="px-4 py-3">Role</th><th className="px-4 py-3">Fit</th><th className="px-4 py-3">Source</th><th className="px-4 py-3">Applied</th><th className="px-4 py-3">Last activity</th><th className="px-4 py-3">Status</th></tr></thead><tbody>{rows.map(({ application, vacancy, score }) => <tr key={application.id} className="border-b last:border-0 hover:bg-[var(--panel-2)]"><td className="px-4 py-3"><Link href={`/jobs/${vacancy.id}`} className="font-bold hover:text-[var(--accent)]">{vacancy.title}</Link><div className="text-sm text-[var(--muted)]">{vacancy.company}</div></td><td className="px-4 py-3"><Badge tone={score?.bucket === "A" ? "good" : score?.bucket === "B" ? "blue" : "neutral"}>{score?.score ?? "—"} / {score?.bucket ?? "—"}</Badge></td><td className="px-4 py-3 text-sm">{vacancy.source}</td><td className="px-4 py-3 text-sm text-[var(--muted)]">{application.appliedAt?.toLocaleDateString() ?? "—"}</td><td className="px-4 py-3 text-sm text-[var(--muted)]">{application.updatedAt.toLocaleDateString()}</td><td className="px-4 py-3"><StatusActions vacancyId={vacancy.id} currentStatus={application.status} compact /></td></tr>)}</tbody></table>{!rows.length && <div className="p-10 text-center text-[var(--muted)]">No applications yet. Mark a vacancy Applied from Inbox.</div>}</div></div>;
}
