import type { VacancyInput } from "@/entities/types";

export interface JobSourceAdapter {
  readonly source: string;
  fetch(options: { queries: string[]; limit?: number }): Promise<{ vacancies: VacancyInput[]; fetched: number }>;
  normalize(raw: unknown): VacancyInput;
}
