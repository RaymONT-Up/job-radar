import type { CandidateProfile } from "@/entities/types";
import { getProfiles } from "@/server/repository";
import { ProfilesClient } from "./profiles-client";

export const dynamic = "force-dynamic";
export default async function ProfilesPage() {
  const profiles = await getProfiles();
  return <div className="space-y-5"><div><h1 className="text-2xl font-black md:text-3xl">Candidate profiles</h1><p className="mt-1 text-[var(--muted)]">One market, different candidates, different rankings.</p></div><ProfilesClient initialProfiles={profiles as CandidateProfile[]} /></div>;
}
