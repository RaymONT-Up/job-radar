import { z } from "zod";

const stringList = z.array(z.string().min(1));
export const candidateProfileSchema = z.object({
  id: z.string().min(1), name: z.string().min(2), targetTitles: stringList.min(1), yearsExperience: z.number().min(0).max(60),
  location: z.string(), remotePreference: z.enum(["remote", "hybrid", "onsite", "any"]), salaryTarget: z.number().min(0), salaryFloor: z.number().min(0), salaryCurrency: z.string().min(3).max(3),
  strongSkills: stringList, secondarySkills: stringList, strongDomains: stringList, proofPoints: stringList.default([]), positiveKeywords: stringList, negativeKeywords: stringList, hardStopKeywords: stringList,
  preferredLocations: stringList, allowedRemoteRegions: stringList, languages: stringList,
  languagePolicy: z.enum(["strict", "flexible"]).default("strict"),
  weights: z.object({ titleMatch: z.number().min(0).max(50), skillMatch: z.number().min(0).max(50), domainMatch: z.number().min(0).max(50), salaryMatch: z.number().min(0).max(50), remoteMatch: z.number().min(0).max(50), experienceMatch: z.number().min(0).max(50), freshness: z.number().min(0).max(50), languageMatch: z.number().min(0).max(50).default(10) }),
  isActive: z.boolean().optional(),
}).refine((value) => value.salaryTarget >= value.salaryFloor, { message: "Salary target must be at least the floor", path: ["salaryTarget"] });
