export const APPLICATION_STATUSES = [
  "FOUND",
  "SHORTLISTED",
  "APPLIED",
  "REPLIED",
  "HR",
  "TECH",
  "FINAL",
  "OFFER",
  "REJECTED",
  "WITHDRAWN",
] as const;

export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];
export type FitBucket = "A" | "B" | "C";

export interface ScoringWeights {
  titleMatch: number;
  skillMatch: number;
  domainMatch: number;
  salaryMatch: number;
  remoteMatch: number;
  experienceMatch: number;
  freshness: number;
  languageMatch: number;
}

export interface CandidateProfile {
  id: string;
  name: string;
  targetTitles: string[];
  yearsExperience: number;
  location: string;
  remotePreference: "remote" | "hybrid" | "onsite" | "any";
  salaryTarget: number;
  salaryFloor: number;
  salaryCurrency: string;
  strongSkills: string[];
  secondarySkills: string[];
  strongDomains: string[];
  proofPoints: string[];
  positiveKeywords: string[];
  negativeKeywords: string[];
  hardStopKeywords: string[];
  preferredLocations: string[];
  allowedRemoteRegions: string[];
  languages: string[];
  languagePolicy: "strict" | "flexible";
  weights: ScoringWeights;
  isActive?: boolean;
}

export interface VacancyInput {
  id?: string;
  source: string;
  sourceId?: string | null;
  url?: string | null;
  title: string;
  company: string;
  description: string;
  location?: string | null;
  remoteType?: string | null;
  salaryMin?: number | null;
  salaryMax?: number | null;
  salaryCurrency?: string | null;
  experienceMin?: number | null;
  experienceMax?: number | null;
  publishedAt?: Date | string | null;
  createdAt?: Date | string;
  isDemo?: boolean;
  verificationStatus?: VacancyVerificationStatus;
  verifiedAt?: Date | string | null;
  verificationReason?: string | null;
  companyWebsite?: string | null;
  companyEmail?: string | null;
  companyDataSource?: string | null;
}

export interface NormalizedVacancy {
  skills: string[];
  domains: string[];
  detectedLanguage: string | null;
  descriptionLanguage: "Russian" | "English" | "Mixed" | "Unknown";
  requiredLanguages: string[];
  detectedRemote: string | null;
  detectedSeniority: string | null;
  detectedYearsMin: number | null;
  detectedYearsMax: number | null;
  detectedSalary: { min: number | null; max: number | null; currency: string } | null;
  locationRestrictions: string[];
  rawSignals: Record<string, string | number | boolean | string[] | null>;
}

export interface ScoreResult {
  score: number;
  bucket: FitBucket;
  positiveReasons: string[];
  negativeReasons: string[];
  hardStops: string[];
  breakdown: Record<string, number>;
  recommendation: string;
}

export type VacancyVerificationStatus = "unchecked" | "active" | "unavailable" | "unknown" | "demo";
export type ApplicationMethod = "tailored" | "direct_outreach" | "referral" | "quick_apply";
export type OutreachStatus = "draft" | "approved" | "sent" | "failed";

export interface AiOfferPackage {
  strategy: string;
  resumeHeadline: string;
  recruiterMessage: string;
  coverLetter: string;
  followUpMessage: string;
  interviewPitch: string;
  interviewQuestions: string[];
  risks: string[];
}
