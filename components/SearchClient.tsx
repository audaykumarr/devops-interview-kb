"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { QuestionIndexEntry } from "@/lib/questions";
import { applyFilters, searchQuestions, type SearchFilters } from "@/lib/search";
import { labelize } from "@/lib/format";
import { QuestionGrid } from "./QuestionGrid";

const DIFFICULTIES = ["beginner", "intermediate", "advanced", "expert"];

export function SearchClient({ questions }: { questions: QuestionIndexEntry[] }) {
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("q") ?? "");
  const [difficulty, setDifficulty] = useState(searchParams.get("difficulty") ?? "");
  const [technology, setTechnology] = useState(searchParams.get("technology") ?? "");
  const [questionType, setQuestionType] = useState(searchParams.get("type") ?? "");

  const technologies = useMemo(
    () => Array.from(new Set(questions.flatMap((q) => q.technologies))).sort(),
    [questions],
  );
  const questionTypes = useMemo(
    () => Array.from(new Set(questions.flatMap((q) => q.question_type))).sort(),
    [questions],
  );

  const results = useMemo(() => {
    const filters: SearchFilters = {
      difficulty: difficulty || undefined,
      technology: technology || undefined,
      question_type: questionType || undefined,
    };
    const filtered = applyFilters(questions, filters);
    return searchQuestions(filtered, query);
  }, [questions, query, difficulty, technology, questionType]);

  const hasActiveFilters = Boolean(difficulty || technology || questionType);

  return (
    <div>
      <label htmlFor="search-input" className="sr-only">
        Search questions
      </label>
      <input
        id="search-input"
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search by title, tag, or technology..."
        autoFocus
        className="w-full rounded-md border border-slate-300 bg-white px-4 py-3 text-base text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500"
      />

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <select
          value={difficulty}
          onChange={(e) => setDifficulty(e.target.value)}
          className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
        >
          <option value="">All difficulties</option>
          {DIFFICULTIES.map((d) => (
            <option key={d} value={d}>
              {labelize(d)}
            </option>
          ))}
        </select>
        <select
          value={technology}
          onChange={(e) => setTechnology(e.target.value)}
          className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
        >
          <option value="">All technologies</option>
          {technologies.map((t) => (
            <option key={t} value={t}>
              {labelize(t)}
            </option>
          ))}
        </select>
        <select
          value={questionType}
          onChange={(e) => setQuestionType(e.target.value)}
          className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
        >
          <option value="">All types</option>
          {questionTypes.map((t) => (
            <option key={t} value={t}>
              {labelize(t)}
            </option>
          ))}
        </select>
        {hasActiveFilters && (
          <button
            type="button"
            onClick={() => {
              setDifficulty("");
              setTechnology("");
              setQuestionType("");
            }}
            className="text-xs font-medium text-indigo-600 hover:underline dark:text-indigo-400"
          >
            Clear filters
          </button>
        )}
      </div>

      <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">
        {results.length} {results.length === 1 ? "result" : "results"}
        {query.trim() && <> for &ldquo;{query.trim()}&rdquo;</>}
      </p>

      <div className="mt-3">
        <QuestionGrid questions={results} />
      </div>
    </div>
  );
}
