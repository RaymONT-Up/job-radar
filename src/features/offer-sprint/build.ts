import type { ApplicationStatus, CandidateProfile, NormalizedVacancy, ScoreResult, VacancyInput, VacancyVerificationStatus } from "@/entities/types";

const canonical = (value: string) => value.toLowerCase().replace(/[+.#]/g, "").replace(/[^a-z0-9а-яё]+/gi, " ").trim();
const aliases: Record<string, string> = { node: "nodejs", nodejs: "nodejs", reactjs: "react", nextjs: "nextjs" };
const skillCanonical = (value: string) => aliases[canonical(value).replace(/\s/g, "")] ?? canonical(value);
const overlaps = (left: string, right: string) => {
  if (skillCanonical(left) === skillCanonical(right)) return true;
  const leftTokens = new Set(canonical(left).split(" ").filter((item) => item.length > 2));
  return canonical(right).split(" ").some((item) => item.length > 2 && leftTokens.has(item));
};

export interface OfferSprint {
  verdict: "go" | "hold" | "stop";
  nextAction: string;
  matchedSkills: string[];
  missingSkills: string[];
  proofPoints: string[];
  resumeHeadline: string;
  recruiterMessage: string;
  applicationChecklist: string[];
  interviewQuestions: string[];
}

export function buildOfferSprint({
  vacancy,
  normalized,
  score,
  profile,
  status,
  verificationStatus,
}: {
  vacancy: VacancyInput;
  normalized: NormalizedVacancy;
  score: ScoreResult;
  profile: CandidateProfile;
  status: ApplicationStatus;
  verificationStatus: VacancyVerificationStatus;
}): OfferSprint {
  const skills = [...profile.strongSkills, ...profile.secondarySkills];
  const matchedSkills = normalized.skills.filter((required) => skills.some((known) => overlaps(required, known)));
  const missingSkills = normalized.skills.filter((required) => !skills.some((known) => overlaps(required, known)));
  const signals = [...normalized.skills, ...normalized.domains];
  const relevantProof = profile.proofPoints
    .map((proof) => ({ proof, score: signals.filter((signal) => overlaps(proof, signal)).length }))
    .sort((a, b) => b.score - a.score)
    .filter((item, index) => item.score > 0 || index < 2)
    .slice(0, 3)
    .map((item) => item.proof);
  const proofPoints = relevantProof.length ? relevantProof : profile.proofPoints.slice(0, 3);

  const isClosed = verificationStatus === "unavailable";
  const blocked = score.hardStops.length > 0;
  const verdict: OfferSprint["verdict"] = isClosed || blocked ? "stop" : verificationStatus === "unknown" || verificationStatus === "unchecked" ? "hold" : "go";
  const nextAction = isClosed
    ? "Не тратить время: вакансия закрыта и исключена из очереди."
    : blocked
      ? `Не откликаться, пока не сняты стоп-факторы: ${score.hardStops.join("; ")}.`
      : ["APPLIED", "REPLIED"].includes(status)
        ? "Отправить короткий follow-up с одним релевантным результатом."
        : ["HR", "TECH", "FINAL"].includes(status)
          ? "Подготовить три доказательства и вопросы ниже к следующему интервью."
          : verificationStatus === "unknown" || verificationStatus === "unchecked"
            ? "Сначала открыть оригинал и вручную подтвердить, что вакансия активна."
            : "Сделать точечный отклик и написать рекрутеру в тот же день."

  const primarySkills = matchedSkills.slice(0, 4);
  const domain = normalized.domains[0] ?? profile.strongDomains[0] ?? "продуктовых интерфейсах";
  const strongestProof = proofPoints[0] ?? `Коммерческий опыт ${profile.yearsExperience}+ лет с ${primarySkills.join(", ")}`;
  const resumeHeadline = `${vacancy.title} · ${profile.yearsExperience}+ лет · ${primarySkills.slice(0, 3).join(" / ") || profile.strongSkills.slice(0, 3).join(" / ")}`;
  const recruiterMessage = `Здравствуйте! Увидел вакансию ${vacancy.title} в ${vacancy.company}. У меня ${profile.yearsExperience}+ лет коммерческого frontend-опыта, включая ${domain}. Самое релевантное: ${strongestProof}. По стеку совпадают ${primarySkills.join(", ") || profile.strongSkills.slice(0, 3).join(", ")}. Если позиция ещё активна, буду рад коротко обсудить задачи команды.`;
  const applicationChecklist = [
    `Поставить в заголовок резюме: «${resumeHeadline}»`,
    ...proofPoints.map((proof) => `Поднять выше в резюме: ${proof}`),
    ...(missingSkills.length ? [`Не заявлять без доказательств: ${missingSkills.slice(0, 3).join(", ")}`] : []),
    "После отклика отправить персональное сообщение, а не ждать только ответа ATS.",
  ];
  const interviewQuestions = [
    `Как сейчас устроены архитектура и границы ответственности frontend-команды в ${vacancy.company}?`,
    primarySkills.length ? `Какие задачи по ${primarySkills.slice(0, 2).join(" и ")} будут самыми важными в первые 90 дней?` : "Как выглядит результат первых 90 дней на этой позиции?",
    `Какие продуктовые или технические метрики важнее всего для ${vacancy.title}?`,
    missingSkills.length ? `Насколько критичен опыт с ${missingSkills.slice(0, 2).join(" и ")}, и можно ли закрыть разрыв в первые недели?` : "Какая инженерная проблема сейчас сильнее всего тормозит команду?",
    "Почему открыли позицию и что отличает кандидатов, которые доходят до оффера?",
  ];

  return { verdict, nextAction, matchedSkills, missingSkills, proofPoints, resumeHeadline, recruiterMessage, applicationChecklist, interviewQuestions };
}
