import type { VacancyVerificationStatus } from "@/entities/types";

export interface VerificationResult {
  status: VacancyVerificationStatus;
  reason: string;
  checkedAt: Date;
}

interface VerifiableVacancy {
  source: string;
  sourceId: string | null;
  url: string | null;
  isDemo: boolean;
}

const closedMarkers = [
  /вакансия более недоступна/i,
  /вакансия (?:закрыта|в архиве)/i,
  /vacancy (?:is )?no longer available/i,
  /job (?:is )?no longer available/i,
  /this job has expired/i,
  /position has been filled/i,
];

function result(status: VacancyVerificationStatus, reason: string): VerificationResult {
  return { status, reason, checkedAt: new Date() };
}

async function request(url: string, headers: HeadersInit = {}) {
  return fetch(url, {
    redirect: "follow",
    headers: {
      "User-Agent": "JobRadar/0.2 (availability verification; local-first)",
      Accept: "text/html,application/json;q=0.9,*/*;q=0.8",
      Range: "bytes=0-262143",
      ...headers,
    },
    signal: AbortSignal.timeout(12_000),
  });
}

export async function verifyVacancyAvailability(vacancy: VerifiableVacancy): Promise<VerificationResult> {
  if (vacancy.isDemo) return result("demo", "Учебная запись без внешней вакансии");
  if (!vacancy.url) return result("unknown", "Нет ссылки для проверки");

  try {
    const target = vacancy.source === "HH" && vacancy.sourceId
      ? `https://api.hh.ru/vacancies/${encodeURIComponent(vacancy.sourceId)}`
      : vacancy.url;
    const response = await request(target, vacancy.source === "HH" ? { Accept: "application/json" } : {});
    if (response.status === 404 || response.status === 410) return result("unavailable", `Источник вернул ${response.status}`);
    if ([401, 403, 429].includes(response.status)) return result("unknown", `Источник ограничил автоматическую проверку (${response.status})`);
    if (!response.ok) return result("unknown", `Неожиданный ответ источника (${response.status})`);
    if (vacancy.source === "HH") return result("active", "Подтверждено официальным API HeadHunter");

    const contentType = response.headers.get("content-type") ?? "";
    if (/text\/html|text\/plain|application\/json/i.test(contentType)) {
      const body = (await response.text()).slice(0, 262_144);
      if (closedMarkers.some((marker) => marker.test(body))) return result("unavailable", "Страница сообщает, что вакансия закрыта");
    }
    return result("active", "Страница вакансии доступна");
  } catch (error) {
    return result("unknown", error instanceof Error && error.name === "TimeoutError" ? "Источник не ответил вовремя" : "Не удалось проверить источник");
  }
}
