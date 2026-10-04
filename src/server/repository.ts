import { randomUUID } from "node:crypto";
import { and, desc, eq, isNull, or } from "drizzle-orm";
import type { ApplicationMethod, ApplicationStatus, CandidateProfile, OutreachStatus, VacancyInput, VacancyVerificationStatus } from "@/entities/types";
import type { VerificationResult } from "@/server/integrations/availability";
import { normalizeVacancy } from "@/features/vacancy-scoring/normalize";
import { scoreVacancy } from "@/features/vacancy-scoring/score";
import { addBusinessDays } from "@/features/follow-up/dates";
import { db } from "./db/client";
import { canonicalizeUrl, normalizeIdentity } from "./db/dedupe";
import { applicationEvents, applications, candidateProfiles, outreachDrafts, vacancies, vacancyNormalizedData, vacancyScores } from "./db/schema";

export async function getProfiles() {
  return db.select().from(candidateProfiles).orderBy(desc(candidateProfiles.isActive), candidateProfiles.name).all();
}

export async function getActiveProfile() {
  return db.select().from(candidateProfiles).where(eq(candidateProfiles.isActive, true)).get()
    ?? db.select().from(candidateProfiles).get();
}

export async function setActiveProfile(id: string) {
  db.update(candidateProfiles).set({ isActive: false }).run();
  db.update(candidateProfiles).set({ isActive: true, updatedAt: new Date() }).where(eq(candidateProfiles.id, id)).run();
}

export async function listRankedVacancies(profileId: string) {
  return db.select({
    vacancy: vacancies,
    score: vacancyScores,
    application: applications,
    normalized: vacancyNormalizedData,
  }).from(vacancies)
    .innerJoin(vacancyScores, and(eq(vacancyScores.vacancyId, vacancies.id), eq(vacancyScores.candidateProfileId, profileId)))
    .leftJoin(applications, and(eq(applications.vacancyId, vacancies.id), eq(applications.candidateProfileId, profileId)))
    .leftJoin(vacancyNormalizedData, eq(vacancyNormalizedData.vacancyId, vacancies.id))
    .where(isNull(vacancies.archivedAt))
    .orderBy(desc(vacancyScores.score), desc(vacancies.publishedAt)).all();
}

export async function getVacancyDetail(id: string, profileId: string) {
  const row = db.select({ vacancy: vacancies, score: vacancyScores, application: applications, normalized: vacancyNormalizedData })
    .from(vacancies)
    .leftJoin(vacancyScores, and(eq(vacancyScores.vacancyId, vacancies.id), eq(vacancyScores.candidateProfileId, profileId)))
    .leftJoin(applications, and(eq(applications.vacancyId, vacancies.id), eq(applications.candidateProfileId, profileId)))
    .leftJoin(vacancyNormalizedData, eq(vacancyNormalizedData.vacancyId, vacancies.id))
    .where(eq(vacancies.id, id)).get();
  if (!row) return null;
  const events = row.application
    ? db.select().from(applicationEvents).where(eq(applicationEvents.applicationId, row.application.id)).orderBy(desc(applicationEvents.createdAt)).all()
    : [];
  return { ...row, events };
}

export async function saveVacancy(input: VacancyInput, profileId?: string) {
  const canonicalUrl = canonicalizeUrl(input.url);
  const inputTitleNormalized = normalizeIdentity(input.title);
  // FIX: Previously OR-fetched rows by company alone, then misidentified different jobs as duplicates.
  // Now: strict source+id match, OR canonical URL match, OR same company+title pair (both required).
  const candidates = db.select().from(vacancies).where(or(
    input.sourceId ? and(eq(vacancies.source, input.source), eq(vacancies.sourceId, input.sourceId)) : undefined,
    canonicalUrl ? eq(vacancies.canonicalUrl, canonicalUrl) : undefined,
  )).all();
  const duplicate = candidates.find((row) =>
    (input.sourceId && row.source === input.source && row.sourceId === input.sourceId)
    || (canonicalUrl && row.canonicalUrl === canonicalUrl)
  ) ?? db.select().from(vacancies).where(eq(vacancies.company, input.company)).all()
    .find((row) => normalizeIdentity(row.title) === inputTitleNormalized);
  if (duplicate) return { id: duplicate.id, duplicate: true };

  const id = input.id ?? randomUUID();
  const now = new Date();
  const publishedAt = input.publishedAt ? new Date(input.publishedAt) : now;
  const normalized = normalizeVacancy(input);
  db.insert(vacancies).values({
    id, source: input.source, sourceId: input.sourceId ?? null, url: input.url ?? null, canonicalUrl,
    title: input.title, company: input.company, description: input.description, location: input.location ?? null,
    remoteType: input.remoteType ?? null, salaryMin: input.salaryMin ?? null, salaryMax: input.salaryMax ?? null,
    salaryCurrency: input.salaryCurrency ?? null, experienceMin: input.experienceMin ?? null, experienceMax: input.experienceMax ?? null,
    publishedAt, createdAt: now, isDemo: input.isDemo ?? false,
    verificationStatus: input.verificationStatus ?? (input.isDemo ? "demo" : "unchecked"),
    verifiedAt: input.verifiedAt ? new Date(input.verifiedAt) : null,
    verificationReason: input.verificationReason ?? null,
    companyWebsite: input.companyWebsite ?? null,
    companyEmail: input.companyEmail ?? null,
    companyDataSource: input.companyDataSource ?? null,
  }).run();
  db.insert(vacancyNormalizedData).values({ vacancyId: id, ...normalized }).run();
  const profiles = profileId
    ? db.select().from(candidateProfiles).where(eq(candidateProfiles.id, profileId)).all()
    : db.select().from(candidateProfiles).all();
  for (const profile of profiles) {
    const result = scoreVacancy({ ...input, id, publishedAt, createdAt: now }, normalized, profile as CandidateProfile);
    db.insert(vacancyScores).values({ id: randomUUID(), vacancyId: id, candidateProfileId: profile.id, ...result, scoredAt: now }).run();
  }
  return { id, duplicate: false };
}

export async function updateApplicationStatus(vacancyId: string, profileId: string, status: ApplicationStatus, metadata: Record<string, unknown> = {}) {
  const now = new Date();
  const existing = db.select().from(applications).where(and(eq(applications.vacancyId, vacancyId), eq(applications.candidateProfileId, profileId))).get();
  const applicationId = existing?.id ?? randomUUID();
  const appliedAt = status === "APPLIED" && !existing?.appliedAt ? now : existing?.appliedAt ?? null;
  const followUpAt = status === "APPLIED" ? addBusinessDays(now, 3) : existing?.followUpAt ?? null;
  if (existing) {
    db.update(applications).set({ status, appliedAt, followUpAt, updatedAt: now }).where(eq(applications.id, existing.id)).run();
  } else {
    db.insert(applications).values({ id: applicationId, vacancyId, candidateProfileId: profileId, status, appliedAt, followUpAt, createdAt: now, updatedAt: now }).run();
  }
  db.insert(applicationEvents).values({ id: randomUUID(), applicationId, type: "STATUS_CHANGED", previousStatus: existing?.status ?? "FOUND", newStatus: status, metadata, createdAt: now }).run();
  return applicationId;
}

export async function markFollowedUp(applicationId: string) {
  const now = new Date();
  db.update(applications).set({ lastContactAt: now, followUpAt: null, updatedAt: now }).where(eq(applications.id, applicationId)).run();
  db.insert(applicationEvents).values({ id: randomUUID(), applicationId, type: "FOLLOW_UP_SENT", metadata: {}, createdAt: now }).run();
}

export async function updateApplicationDetails(applicationId: string, values: { contactName?: string | null; contactRole?: string | null; contactUrl?: string | null; notes?: string | null; followUpAt?: Date | null; rejectionReason?: string | null; applicationMethod?: ApplicationMethod }) {
  const now = new Date();
  db.update(applications).set({ ...values, updatedAt: now }).where(eq(applications.id, applicationId)).run();
  db.insert(applicationEvents).values({ id: randomUUID(), applicationId, type: "DETAILS_UPDATED", metadata: Object.fromEntries(Object.entries(values).map(([key, value]) => [key, value instanceof Date ? value.toISOString() : value])), createdAt: now }).run();
}

export function getOutreachDraft(vacancyId: string, profileId: string) {
  return db.select().from(outreachDrafts).where(and(eq(outreachDrafts.vacancyId, vacancyId), eq(outreachDrafts.candidateProfileId, profileId))).get() ?? null;
}

export function saveOutreachDraft(input: { vacancyId: string; candidateProfileId: string; recipient: string; subject: string; body: string; resumeName?: string | null; resumeType?: string | null; resumeData?: Buffer | null }) {
  const now = new Date();
  const existing = getOutreachDraft(input.vacancyId, input.candidateProfileId);
  if (existing) {
    db.update(outreachDrafts).set({
      recipient: input.recipient,
      subject: input.subject,
      body: input.body,
      ...(input.resumeData ? { resumeName: input.resumeName ?? null, resumeType: input.resumeType ?? null, resumeData: input.resumeData } : {}),
      status: "draft",
      error: null,
      updatedAt: now,
    }).where(eq(outreachDrafts.id, existing.id)).run();
    return getOutreachDraft(input.vacancyId, input.candidateProfileId)!;
  }
  const id = randomUUID();
  db.insert(outreachDrafts).values({ id, ...input, status: "draft", createdAt: now, updatedAt: now }).run();
  return db.select().from(outreachDrafts).where(eq(outreachDrafts.id, id)).get()!;
}

export function setOutreachStatus(id: string, status: OutreachStatus, values: { providerMessageId?: string | null; error?: string | null; approvedAt?: Date | null; sentAt?: Date | null } = {}) {
  db.update(outreachDrafts).set({ status, ...values, updatedAt: new Date() }).where(eq(outreachDrafts.id, id)).run();
  return db.select().from(outreachDrafts).where(eq(outreachDrafts.id, id)).get() ?? null;
}

export async function archiveVacancy(vacancyId: string) {
  db.update(vacancies).set({ archivedAt: new Date() }).where(eq(vacancies.id, vacancyId)).run();
}

export async function getVacanciesForVerification() {
  return db.select().from(vacancies).where(and(isNull(vacancies.archivedAt), eq(vacancies.isDemo, false))).all();
}

export async function updateVacancyVerification(vacancyId: string, verification: VerificationResult) {
  db.update(vacancies).set({
    verificationStatus: verification.status as VacancyVerificationStatus,
    verificationReason: verification.reason,
    verifiedAt: verification.checkedAt,
    ...(verification.status === "unavailable" ? { archivedAt: verification.checkedAt } : {}),
  }).where(eq(vacancies.id, vacancyId)).run();
}

export async function getApplications(profileId: string) {
  return db.select({ application: applications, vacancy: vacancies, score: vacancyScores })
    .from(applications)
    .innerJoin(vacancies, eq(vacancies.id, applications.vacancyId))
    .leftJoin(vacancyScores, and(eq(vacancyScores.vacancyId, vacancies.id), eq(vacancyScores.candidateProfileId, profileId)))
    .where(eq(applications.candidateProfileId, profileId))
    .orderBy(desc(applications.updatedAt)).all();
}

export async function getTodayActions(profileId: string) {
  const ranked = await listRankedVacancies(profileId);
  const now = Date.now();
  const highFit = ranked.filter((row) => row.vacancy.verificationStatus === "active" && row.score.bucket === "A" && (!row.application || row.application.status === "FOUND") && row.vacancy.publishedAt && now - row.vacancy.publishedAt.getTime() <= 3 * 86_400_000);
  const allApplications = await getApplications(profileId);
  const followUps = allApplications.filter(({ application }) => application.status === "APPLIED" && (application.followUpAt?.getTime() ?? Infinity) <= now);
  const stale = allApplications.filter(({ application }) => ["REPLIED", "HR", "TECH"].includes(application.status) && now - (application.lastContactAt ?? application.updatedAt).getTime() >= 5 * 86_400_000);
  return { highFit, followUps, stale };
}

export async function getAllData() {
  return {
    version: 3,
    exportedAt: new Date().toISOString(),
    profiles: db.select().from(candidateProfiles).all(),
    vacancies: db.select().from(vacancies).all(),
    normalized: db.select().from(vacancyNormalizedData).all(),
    scores: db.select().from(vacancyScores).all(),
    applications: db.select().from(applications).all(),
    events: db.select().from(applicationEvents).all(),
    outreach: db.select().from(outreachDrafts).all().map((row) => ({ ...row, resumeData: row.resumeData?.toString("base64") ?? null })),
  };
}

export async function restoreAllData(payload: unknown) {
  // FIX: Validate with Zod BEFORE any DELETE to prevent data loss on corrupted input.
  const { backupSchema } = await import("./backup-schema");
  const parsed = backupSchema.safeParse(payload);
  if (!parsed.success) {
    throw new Error(`Invalid backup file: ${parsed.error.issues.map((i) => i.message).join(", ")}`);
  }
  const data = parsed.data;
  const date = (value: unknown) => value ? new Date(String(value)) : null;
  const profileRows = data.profiles.map((row) => ({ ...row, createdAt: date(row.createdAt), updatedAt: date(row.updatedAt) })) as unknown as Array<typeof candidateProfiles.$inferInsert>;
  const vacancyRows = data.vacancies.map((row) => ({ ...row, publishedAt: date(row.publishedAt), createdAt: date(row.createdAt), archivedAt: date(row.archivedAt), verifiedAt: date(row.verifiedAt) })) as unknown as Array<typeof vacancies.$inferInsert>;
  const scoreRows = data.scores.map((row) => ({ ...row, scoredAt: date(row.scoredAt) })) as unknown as Array<typeof vacancyScores.$inferInsert>;
  const applicationRows = data.applications.map((row) => ({ ...row, appliedAt: date(row.appliedAt), lastContactAt: date(row.lastContactAt), followUpAt: date(row.followUpAt), createdAt: date(row.createdAt), updatedAt: date(row.updatedAt) })) as unknown as Array<typeof applications.$inferInsert>;
  const eventRows = data.events.map((row) => ({ ...row, createdAt: date(row.createdAt) })) as unknown as Array<typeof applicationEvents.$inferInsert>;
  const outreachRows = (data.outreach ?? []).map((row) => ({ ...row, resumeData: typeof row.resumeData === "string" ? Buffer.from(row.resumeData, "base64") : null, approvedAt: date(row.approvedAt), sentAt: date(row.sentAt), createdAt: date(row.createdAt), updatedAt: date(row.updatedAt) })) as unknown as Array<typeof outreachDrafts.$inferInsert>;
  db.transaction((tx) => {
    tx.delete(applicationEvents).run(); tx.delete(outreachDrafts).run(); tx.delete(applications).run(); tx.delete(vacancyScores).run(); tx.delete(vacancyNormalizedData).run(); tx.delete(vacancies).run(); tx.delete(candidateProfiles).run();
    if (profileRows.length) tx.insert(candidateProfiles).values(profileRows).run();
    if (vacancyRows.length) tx.insert(vacancies).values(vacancyRows).run();
    if (data.normalized.length) tx.insert(vacancyNormalizedData).values(data.normalized as unknown as Array<typeof vacancyNormalizedData.$inferInsert>).run();
    if (scoreRows.length) tx.insert(vacancyScores).values(scoreRows).run();
    if (applicationRows.length) tx.insert(applications).values(applicationRows).run();
    if (eventRows.length) tx.insert(applicationEvents).values(eventRows).run();
    if (outreachRows.length) tx.insert(outreachDrafts).values(outreachRows).run();
  });
}

export async function resetAllData() {
  db.transaction((tx) => {
    tx.delete(applicationEvents).run(); tx.delete(applications).run(); tx.delete(vacancyScores).run(); tx.delete(vacancyNormalizedData).run(); tx.delete(vacancies).run();
  });
}

export async function deleteProfile(id: string) {
  const all = db.select().from(candidateProfiles).all();
  if (all.length <= 1) throw new Error("At least one profile is required");
  const isActive = all.find((p) => p.id === id)?.isActive;
  db.delete(candidateProfiles).where(eq(candidateProfiles.id, id)).run();
  // FIX: If we deleted the active profile, activate the next available one.
  if (isActive) {
    const remaining = all.filter((p) => p.id !== id);
    if (remaining.length > 0) {
      db.update(candidateProfiles).set({ isActive: true, updatedAt: new Date() }).where(eq(candidateProfiles.id, remaining[0].id)).run();
    }
  }
}

export async function rescoreVacancies(profile: CandidateProfile) {
  const rows = db.select({ vacancy: vacancies, normalized: vacancyNormalizedData }).from(vacancies).innerJoin(vacancyNormalizedData, eq(vacancies.id, vacancyNormalizedData.vacancyId)).all();
  db.delete(vacancyScores).where(eq(vacancyScores.candidateProfileId, profile.id)).run();
  for (const row of rows) {
    const result = scoreVacancy(row.vacancy, { ...row.normalized, descriptionLanguage: row.normalized.descriptionLanguage ?? "Unknown", requiredLanguages: row.normalized.requiredLanguages ?? [] }, profile);
    db.insert(vacancyScores).values({ id: randomUUID(), vacancyId: row.vacancy.id, candidateProfileId: profile.id, ...result, scoredAt: new Date() }).run();
  }
}

export async function saveProfile(profile: CandidateProfile) {
  const now = new Date();
  const existing = db.select().from(candidateProfiles).where(eq(candidateProfiles.id, profile.id)).get();
  if (existing) db.update(candidateProfiles).set({ ...profile, updatedAt: now }).where(eq(candidateProfiles.id, profile.id)).run();
  else db.insert(candidateProfiles).values({ ...profile, createdAt: now, updatedAt: now }).run();
  await rescoreVacancies(profile);
}
