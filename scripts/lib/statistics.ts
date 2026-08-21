import type { QuestionRecord } from "./validate";

export interface Statistics {
  generated_at: string;
  total_questions: number;
  by_category: Record<string, number>;
  by_difficulty: Record<string, number>;
  by_technology: Record<string, number>;
  by_question_type: Record<string, number>;
  by_status: Record<string, number>;
  recently_updated: { id: string; title: string; last_updated: string }[];
}

function increment(map: Record<string, number>, key: string): void {
  map[key] = (map[key] ?? 0) + 1;
}

export function computeStatistics(records: QuestionRecord[], now: Date = new Date()): Statistics {
  const byCategory: Record<string, number> = {};
  const byDifficulty: Record<string, number> = {};
  const byTechnology: Record<string, number> = {};
  const byQuestionType: Record<string, number> = {};
  const byStatus: Record<string, number> = {};

  for (const r of records) {
    increment(byCategory, r.data.category);
    increment(byDifficulty, r.data.difficulty);
    increment(byStatus, r.data.status);
    for (const tech of r.data.technologies) increment(byTechnology, tech);
    for (const type of r.data.question_type) increment(byQuestionType, type);
  }

  const recentlyUpdated = [...records]
    .sort((a, b) => (a.data.last_updated < b.data.last_updated ? 1 : a.data.last_updated > b.data.last_updated ? -1 : 0))
    .slice(0, 10)
    .map((r) => ({ id: r.data.id, title: r.data.title, last_updated: r.data.last_updated }));

  return {
    generated_at: now.toISOString(),
    total_questions: records.length,
    by_category: byCategory,
    by_difficulty: byDifficulty,
    by_technology: byTechnology,
    by_question_type: byQuestionType,
    by_status: byStatus,
    recently_updated: recentlyUpdated,
  };
}
