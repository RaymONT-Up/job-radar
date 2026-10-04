import type { ApplicationStatus, FitBucket } from "@/entities/types";
import { getActiveProfile, listRankedVacancies } from "@/server/repository";
import { InboxClient, type InboxItem } from "./inbox-client";

export const dynamic = "force-dynamic";

export default async function InboxPage() {
  const profile = await getActiveProfile();
  if (!profile) return <div className="panel p-8">Run the database migration and seed commands to initialize Job Radar.</div>;
  const rows = await listRankedVacancies(profile.id);
  const items: InboxItem[] = rows.map(({ vacancy, score, application, normalized }) => ({
    id: vacancy.id, title: vacancy.title, company: vacancy.company, source: vacancy.source, url: vacancy.url, location: vacancy.location,
    remoteType: vacancy.remoteType ?? normalized?.detectedRemote ?? null, salaryMin: vacancy.salaryMin ?? normalized?.detectedSalary?.min ?? null, salaryMax: vacancy.salaryMax ?? normalized?.detectedSalary?.max ?? null, salaryCurrency: vacancy.salaryCurrency ?? normalized?.detectedSalary?.currency ?? null,
    publishedAt: vacancy.publishedAt?.toISOString() ?? null, score: score.score, bucket: score.bucket as FitBucket,
    positives: score.positiveReasons, negatives: score.negativeReasons, hardStops: score.hardStops, recommendation: score.recommendation,
    status: (application?.status ?? "FOUND") as ApplicationStatus,
    verificationStatus: vacancy.verificationStatus, verificationReason: vacancy.verificationReason,
    descriptionLanguage: normalized?.descriptionLanguage ?? "Unknown", requiredLanguages: normalized?.requiredLanguages ?? [],
  }));
  const referenceTime = rows.reduce((latest, row) => Math.max(latest, row.score.scoredAt.getTime()), 0);
  return <InboxClient items={items} referenceTime={referenceTime} />;
}
