import { NextResponse } from "next/server";
import { verifyVacancyAvailability } from "@/server/integrations/availability";
import { getVacanciesForVerification, updateVacancyVerification } from "@/server/repository";
import { vacancyVerifyLimiter } from "@/shared/lib/rate-limit";

async function mapLimit<T, R>(items: T[], limit: number, mapper: (item: T) => Promise<R>) {
  const output: R[] = [];
  let cursor = 0;
  async function worker() {
    while (cursor < items.length) {
      const index = cursor++;
      output[index] = await mapper(items[index]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return output;
}

export async function POST(request: Request) {
  if (!vacancyVerifyLimiter.allow(request)) {
    return NextResponse.json({ error: "Подождите 30 сек. перед повторной проверкой." }, { status: 429 });
  }
  try {
    const vacancies = await getVacanciesForVerification();
    const checks = await mapLimit(vacancies, 4, async (vacancy) => {
      const verification = await verifyVacancyAvailability(vacancy);
      await updateVacancyVerification(vacancy.id, verification);
      return verification.status;
    });
    return NextResponse.json({
      checked: checks.length,
      active: checks.filter((status) => status === "active").length,
      unavailable: checks.filter((status) => status === "unavailable").length,
      unknown: checks.filter((status) => status === "unknown").length,
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Проверка не удалась" }, { status: 500 });
  }
}
