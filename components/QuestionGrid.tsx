import type { QuestionIndexEntry } from "@/lib/questions";
import { QuestionCard } from "./QuestionCard";

export function QuestionGrid({ questions }: { questions: QuestionIndexEntry[] }) {
  if (questions.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
        No questions match these filters yet.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {questions.map((q) => (
        <QuestionCard key={q.id} question={q} />
      ))}
    </div>
  );
}
