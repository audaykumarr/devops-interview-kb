import type { QuestionRecord } from "./validate";

export interface PracticeEntry {
  id: string;
  title: string;
  category: string;
  subcategory: string;
  difficulty: string;
  technologies: string[];
  question_type: string[];
  question: string;
  shortAnswer: string;
  url: string;
}

export function buildPracticeSet(records: QuestionRecord[]): PracticeEntry[] {
  return records
    .map((r) => ({
      id: r.data.id,
      title: r.data.title,
      category: r.data.category,
      subcategory: r.data.subcategory,
      difficulty: r.data.difficulty,
      technologies: r.data.technologies,
      question_type: r.data.question_type,
      question: r.sections.get("Question") ?? r.data.title,
      shortAnswer: r.sections.get("Short Answer") ?? "",
      url: `/questions/${r.data.category}/${r.data.subcategory}/${r.slug}`,
    }))
    .sort((a, b) => a.id.localeCompare(b.id));
}
