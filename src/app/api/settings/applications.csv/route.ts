import { getActiveProfile, getApplications } from "@/server/repository";

const safe = (value: unknown) => {
  let text = value == null ? "" : String(value);
  if (/^[=+\-@]/.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
};

export async function GET() {
  const profile = await getActiveProfile();
  const rows = profile ? await getApplications(profile.id) : [];
  const header = ["Company", "Vacancy", "Status", "Fit", "Source", "Salary", "Applied", "Follow-up", "Contact", "URL", "Notes"];
  const body = rows.map(({ application, vacancy, score }) => [vacancy.company, vacancy.title, application.status, score ? `${score.score}/${score.bucket}` : "", vacancy.source, vacancy.salaryMax ? `${vacancy.salaryMin ?? ""}-${vacancy.salaryMax} ${vacancy.salaryCurrency ?? ""}` : "", application.appliedAt?.toISOString() ?? "", application.followUpAt?.toISOString() ?? "", application.contactName ?? "", vacancy.url ?? "", application.notes ?? ""].map(safe).join(","));
  return new Response([header.map(safe).join(","), ...body].join("\n"), { headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": `attachment; filename="job-radar-applications-${new Date().toISOString().slice(0, 10)}.csv"` } });
}
