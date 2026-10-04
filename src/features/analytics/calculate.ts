import type { ApplicationMethod, ApplicationStatus, FitBucket } from "@/entities/types";

export interface FunnelRecord { source: string; bucket: FitBucket; status: ApplicationStatus; method?: ApplicationMethod }
export interface StageMetric { stage: string; count: number; conversion: number | null }
export interface BreakdownMetric { label: string; applications: number; replies: number; replyRate: number | null; insufficient: boolean }
export interface ConversionDiagnosis { stage: string; headline: string; action: string; evidence: string }

const ranks: Partial<Record<ApplicationStatus, number>> = { APPLIED: 1, REPLIED: 2, HR: 3, TECH: 4, FINAL: 5, OFFER: 6 };
const stages = ["Applications", "Replies", "HR", "Tech", "Final", "Offers"];

function reached(status: ApplicationStatus, required: number) {
  if (status === "REJECTED") return required === 1;
  return (ranks[status] ?? 0) >= required;
}

export function calculateAnalytics(records: FunnelRecord[]) {
  const counts = stages.map((_, index) => records.filter((record) => reached(record.status, index + 1)).length);
  const funnel: StageMetric[] = stages.map((stage, index) => ({
    stage,
    count: counts[index],
    conversion: index === 0 || counts[index - 1] === 0 ? null : Math.round((counts[index] / counts[index - 1]) * 100),
  }));
  const breakdown = (key: "source" | "bucket" | "method"): BreakdownMetric[] => [...new Set(records.map((record) => record[key] ?? "unknown"))].map((label) => {
    const group = records.filter((record) => (record[key] ?? "unknown") === label);
    const applications = group.filter((record) => reached(record.status, 1)).length;
    const replies = group.filter((record) => reached(record.status, 2)).length;
    return { label, applications, replies, replyRate: applications ? Math.round((replies / applications) * 100) : null, insufficient: applications < 5 };
  }).sort((a, b) => b.applications - a.applications);
  const [applied, replies, hr, tech, , offers] = counts;
  const diagnosis: ConversionDiagnosis = applied < 5
    ? { stage: "baseline", headline: "Сначала соберите честную базу", action: "Сделайте 5 точечных откликов через Offer Sprint и отметьте тактику каждого. До этого менять стратегию рано.", evidence: `${applied}/5 откликов для первой осмысленной выборки` }
    : replies / applied < 0.15
      ? { stage: "reply", headline: "Узкое место — первый ответ", action: "Сократите массовые отклики. Используйте только проверенные A/B-вакансии, доказательство в первых строках и прямой контакт в день отклика.", evidence: `${Math.round((replies / applied) * 100)}% откликов получили ответ` }
      : replies > 0 && hr / replies < 0.5
        ? { stage: "screen", headline: "Узкое место — позиционирование на скрининге", action: "Отрепетируйте 60-секундный рассказ: роль → 2 результата → почему эта задача. Зафиксируйте зарплату, язык и формат до звонка.", evidence: `${Math.round((hr / replies) * 100)}% ответов дошли до HR` }
        : hr > 0 && tech / hr < 0.5
          ? { stage: "technical", headline: "Узкое место — техническое интервью", action: "Подготовьте три глубоких кейса: архитектура, производительность и сбой в production. Для каждого — контекст, решение, компромисс, измеримый результат.", evidence: `${Math.round((tech / hr) * 100)}% HR-этапов дошли до технического` }
          : tech >= 2 && offers / tech < 0.25
            ? { stage: "offer", headline: "Узкое место — финальная конверсия", action: "После каждого интервью записывайте вопросы и слабые ответы. На финале проверяйте ожидания, риски найма и критерии решения у hiring manager.", evidence: `${Math.round((offers / tech) * 100)}% технических процессов дали оффер` }
            : { stage: "healthy", headline: "Воронка выглядит здоровой", action: "Сохраняйте качество, удваивайте только лучший источник и тактику — не общий объём откликов.", evidence: `${offers} офферов из ${applied} откликов` };
  return { funnel, bySource: breakdown("source"), byBucket: breakdown("bucket"), byMethod: breakdown("method"), diagnosis };
}
