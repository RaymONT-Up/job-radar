import { z } from "zod";

const recordArray = z.array(z.record(z.string(), z.unknown()));

export const backupSchema = z.object({
  version: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  profiles: recordArray.min(1),
  vacancies: recordArray,
  normalized: recordArray,
  scores: recordArray,
  applications: recordArray,
  events: recordArray,
  outreach: recordArray.optional().default([]),
});
