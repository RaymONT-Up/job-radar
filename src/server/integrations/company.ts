const AGGREGATOR_HOSTS = /(?:linkedin\.com|hh\.(?:ru|kz)|getmatch\.ru|career\.habr\.com|habr\.com|remoteok\.com|remotive\.com|arbeitnow\.com|adzuna\.com|superjob\.ru|wellfound\.com|startup\.jobs|lever\.co|greenhouse\.io|ashbyhq\.com|smartrecruiters\.com)/i;

export function enrichCompanyDetails(input: { url?: string | null; description: string; source?: string | null }) {
  const candidateEmail = input.description.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0]?.toLowerCase() ?? null;
  const email = candidateEmail && !/(?:noreply|no-reply|example\.com)$/i.test(candidateEmail) ? candidateEmail : null;
  let companyWebsite: string | null = null;
  try {
    if (input.url) {
      const parsed = new URL(input.url);
      if (!AGGREGATOR_HOSTS.test(parsed.hostname)) companyWebsite = parsed.origin;
    }
  } catch { /* Keep a missing website explicit instead of guessing. */ }
  return {
    companyWebsite,
    companyEmail: email,
    companyDataSource: input.url ? `User capture · ${input.url}` : input.source ? `User capture · ${input.source}` : "User capture",
  };
}
