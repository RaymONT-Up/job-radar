import type { FitBucket } from "@/entities/types";
import { calculateAnalytics } from "@/features/analytics/calculate";
import { getActiveProfile, getApplications } from "@/server/repository";
import { AnalyticsCharts } from "./analytics-charts";

export const dynamic = "force-dynamic";

export default async function AnalyticsPage() {
  const profile = await getActiveProfile();
  const rows = profile ? await getApplications(profile.id) : [];
  const analytics = calculateAnalytics(rows.map(({ application, vacancy, score }) => ({ source: vacancy.source, bucket: (score?.bucket ?? "C") as FitBucket, status: application.status, method: application.applicationMethod })));
  return <div className="space-y-5"><div><h1 className="text-2xl font-black md:text-3xl">Funnel analytics</h1><p className="mt-1 text-[var(--muted)]">Learn which sources and fit scores turn into conversations.</p></div><AnalyticsCharts {...analytics} /></div>;
}
