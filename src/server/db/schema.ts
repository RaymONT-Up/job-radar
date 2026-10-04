import { sql } from "drizzle-orm";
import { blob, index, integer, real, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
import type { ApplicationMethod, ApplicationStatus, OutreachStatus, ScoringWeights, VacancyVerificationStatus } from "@/entities/types";

export const candidateProfiles = sqliteTable("candidate_profiles", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  targetTitles: text("target_titles", { mode: "json" }).$type<string[]>().notNull(),
  yearsExperience: real("years_experience").notNull(),
  location: text("location").notNull(),
  remotePreference: text("remote_preference").notNull(),
  salaryTarget: integer("salary_target").notNull(),
  salaryFloor: integer("salary_floor").notNull(),
  salaryCurrency: text("salary_currency").notNull(),
  strongSkills: text("strong_skills", { mode: "json" }).$type<string[]>().notNull(),
  secondarySkills: text("secondary_skills", { mode: "json" }).$type<string[]>().notNull(),
  strongDomains: text("strong_domains", { mode: "json" }).$type<string[]>().notNull(),
  proofPoints: text("proof_points", { mode: "json" }).$type<string[]>().notNull().default(sql`'[]'`),
  positiveKeywords: text("positive_keywords", { mode: "json" }).$type<string[]>().notNull(),
  negativeKeywords: text("negative_keywords", { mode: "json" }).$type<string[]>().notNull(),
  hardStopKeywords: text("hard_stop_keywords", { mode: "json" }).$type<string[]>().notNull(),
  preferredLocations: text("preferred_locations", { mode: "json" }).$type<string[]>().notNull(),
  allowedRemoteRegions: text("allowed_remote_regions", { mode: "json" }).$type<string[]>().notNull(),
  languages: text("languages", { mode: "json" }).$type<string[]>().notNull(),
  languagePolicy: text("language_policy").$type<"strict" | "flexible">().notNull().default("strict"),
  weights: text("weights", { mode: "json" }).$type<ScoringWeights>().notNull(),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(false),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
});

export const vacancies = sqliteTable("vacancies", {
  id: text("id").primaryKey(),
  source: text("source").notNull(),
  sourceId: text("source_id"),
  url: text("url"),
  canonicalUrl: text("canonical_url"),
  title: text("title").notNull(),
  company: text("company").notNull(),
  description: text("description").notNull(),
  location: text("location"),
  remoteType: text("remote_type"),
  salaryMin: integer("salary_min"),
  salaryMax: integer("salary_max"),
  salaryCurrency: text("salary_currency"),
  experienceMin: integer("experience_min"),
  experienceMax: integer("experience_max"),
  publishedAt: integer("published_at", { mode: "timestamp" }),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  archivedAt: integer("archived_at", { mode: "timestamp" }),
  isDemo: integer("is_demo", { mode: "boolean" }).notNull().default(false),
  verificationStatus: text("verification_status").$type<VacancyVerificationStatus>().notNull().default("unchecked"),
  verifiedAt: integer("verified_at", { mode: "timestamp" }),
  verificationReason: text("verification_reason"),
  companyWebsite: text("company_website"),
  companyEmail: text("company_email"),
  companyDataSource: text("company_data_source"),
}, (table) => [
  uniqueIndex("uq_vacancies_source_source_id").on(table.source, table.sourceId),
  index("idx_vacancies_published_at").on(table.publishedAt),
  index("idx_vacancies_verification_status").on(table.verificationStatus),
]);

export const vacancyNormalizedData = sqliteTable("vacancy_normalized_data", {
  vacancyId: text("vacancy_id").primaryKey().references(() => vacancies.id, { onDelete: "cascade" }),
  skills: text("skills", { mode: "json" }).$type<string[]>().notNull(),
  domains: text("domains", { mode: "json" }).$type<string[]>().notNull(),
  detectedLanguage: text("detected_language"),
  descriptionLanguage: text("description_language").$type<"Russian" | "English" | "Mixed" | "Unknown">(),
  requiredLanguages: text("required_languages", { mode: "json" }).$type<string[]>(),
  detectedRemote: text("detected_remote"),
  detectedSeniority: text("detected_seniority"),
  detectedYearsMin: integer("detected_years_min"),
  detectedYearsMax: integer("detected_years_max"),
  detectedSalary: text("detected_salary", { mode: "json" }).$type<{ min: number | null; max: number | null; currency: string } | null>(),
  locationRestrictions: text("location_restrictions", { mode: "json" }).$type<string[]>().notNull(),
  rawSignals: text("raw_signals", { mode: "json" }).$type<Record<string, string | number | boolean | string[] | null>>().notNull(),
});

export const vacancyScores = sqliteTable("vacancy_scores", {
  id: text("id").primaryKey(),
  vacancyId: text("vacancy_id").notNull().references(() => vacancies.id, { onDelete: "cascade" }),
  candidateProfileId: text("candidate_profile_id").notNull().references(() => candidateProfiles.id, { onDelete: "cascade" }),
  score: integer("score").notNull(),
  bucket: text("bucket").notNull(),
  positiveReasons: text("positive_reasons", { mode: "json" }).$type<string[]>().notNull(),
  negativeReasons: text("negative_reasons", { mode: "json" }).$type<string[]>().notNull(),
  hardStops: text("hard_stops", { mode: "json" }).$type<string[]>().notNull(),
  breakdown: text("breakdown", { mode: "json" }).$type<Record<string, number>>().notNull(),
  recommendation: text("recommendation").notNull(),
  scoredAt: integer("scored_at", { mode: "timestamp" }).notNull(),
}, (table) => [
  uniqueIndex("uq_scores_vacancy_profile").on(table.vacancyId, table.candidateProfileId),
  index("idx_scores_profile_score").on(table.candidateProfileId, table.score),
]);

export const applications = sqliteTable("applications", {
  id: text("id").primaryKey(),
  vacancyId: text("vacancy_id").notNull().references(() => vacancies.id, { onDelete: "cascade" }),
  candidateProfileId: text("candidate_profile_id").notNull().references(() => candidateProfiles.id, { onDelete: "cascade" }),
  status: text("status").$type<ApplicationStatus>().notNull().default("FOUND"),
  appliedAt: integer("applied_at", { mode: "timestamp" }),
  lastContactAt: integer("last_contact_at", { mode: "timestamp" }),
  followUpAt: integer("follow_up_at", { mode: "timestamp" }),
  contactName: text("contact_name"),
  contactRole: text("contact_role"),
  contactUrl: text("contact_url"),
  notes: text("notes"),
  rejectionReason: text("rejection_reason"),
  applicationMethod: text("application_method").$type<ApplicationMethod>().notNull().default("tailored"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
}, (table) => [
  uniqueIndex("uq_applications_vacancy_profile").on(table.vacancyId, table.candidateProfileId),
  index("idx_applications_profile_status").on(table.candidateProfileId, table.status),
  index("idx_applications_follow_up").on(table.followUpAt),
]);

export const applicationEvents = sqliteTable("application_events", {
  id: text("id").primaryKey(),
  applicationId: text("application_id").notNull().references(() => applications.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  previousStatus: text("previous_status"),
  newStatus: text("new_status"),
  metadata: text("metadata", { mode: "json" }).$type<Record<string, unknown>>().notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
}, (table) => [index("idx_events_application_created").on(table.applicationId, table.createdAt)]);

export const outreachDrafts = sqliteTable("outreach_drafts", {
  id: text("id").primaryKey(),
  vacancyId: text("vacancy_id").notNull().references(() => vacancies.id, { onDelete: "cascade" }),
  candidateProfileId: text("candidate_profile_id").notNull().references(() => candidateProfiles.id, { onDelete: "cascade" }),
  recipient: text("recipient").notNull(),
  subject: text("subject").notNull(),
  body: text("body").notNull(),
  resumeName: text("resume_name"),
  resumeType: text("resume_type"),
  resumeData: blob("resume_data", { mode: "buffer" }).$type<Buffer>(),
  status: text("status").$type<OutreachStatus>().notNull().default("draft"),
  providerMessageId: text("provider_message_id"),
  error: text("error"),
  approvedAt: integer("approved_at", { mode: "timestamp" }),
  sentAt: integer("sent_at", { mode: "timestamp" }),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
}, (table) => [
  uniqueIndex("uq_outreach_vacancy_profile").on(table.vacancyId, table.candidateProfileId),
  index("idx_outreach_status").on(table.status),
]);

export const sourceCredentials = sqliteTable("source_credentials", {
  id: text("id").primaryKey(),
  source: text("source").notNull(),
  credentialKey: text("credential_key").notNull(),
  encryptedValue: text("encrypted_value").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
}, (table) => [uniqueIndex("uq_source_credentials_source_key").on(table.source, table.credentialKey)]);
