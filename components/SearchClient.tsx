"use client";

import { useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { QuestionIndexEntry } from "@/lib/questions";
import { applyFilters, searchQuestions, type SearchFilters } from "@/lib/search";
import { labelize } from "@/lib/format";
import { paginate } from "@/lib/pagination";
import { INTERVIEW_LEVELS, INTERVIEW_LEVEL_LABELS, type InterviewLevel } from "@/scripts/lib/interview-level";
import { Pagination } from "./Pagination";
import { QuestionGrid } from "./QuestionGrid";

const DIFFICULTIES = ["beginner", "intermediate", "advanced", "expert"];

export function SearchClient({ questions }: { questions: QuestionIndexEntry[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const query = searchParams.get("q") ?? "";
  const difficulty = searchParams.get("difficulty") ?? "";
  const technology = searchParams.get("technology") ?? "";
  const questionType = searchParams.get("type") ?? "";
  const category = searchParams.get("category") ?? "";
  const level = searchParams.get("level") ?? "";
  const requestedPage = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10) || 1);

  function updateParam(key: string, value: string, opts?: { push?: boolean }) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    if (key !== "page") params.delete("page");
    const qs = params.toString();
    const url = qs ? `${pathname}?${qs}` : pathname;
    if (opts?.push) router.push(url, { scroll: false });
    else router.replace(url, { scroll: false });
  }

  const categories = useMemo(() => Array.from(new Set(questions.map((q) => q.category))).sort(), [questions]);
  const technologies = useMemo(
    () => Array.from(new Set(questions.flatMap((q) => q.technologies))).sort(),
    [questions],
  );
  const questionTypes = useMemo(
    () => Array.from(new Set(questions.flatMap((q) => q.question_type))).sort(),
    [questions],
  );
  const levels = useMemo(() => {
    const present = new Set(questions.flatMap((q) => q.interview_level));
    return INTERVIEW_LEVELS.filter((l) => present.has(l));
  }, [questions]);

  const results = useMemo(() => {
    const filters: SearchFilters = {
      difficulty: difficulty || undefined,
      technology: technology || undefined,
      question_type: questionType || undefined,
      category: category || undefined,
      interview_level: level || undefined,
    };
    const filtered = applyFilters(questions, filters);
    return searchQuestions(filtered, query);
  }, [questions, query, difficulty, technology, questionType, category, level]);

  const { items: pageItems, currentPage, totalPages } = paginate(results, requestedPage);

  const hrefFor = (page: number) => {
    const params = new URLSearchParams(searchParams.toString());
    if (page > 1) params.set("page", String(page));
    else params.delete("page");
    const qs = params.toString();
    return qs ? `${pathname}?${qs}` : pathname;
  };

  const hasActiveFilters = Boolean(difficulty || technology || questionType || category || level);

  return (
    <div>
      <label htmlFor="search-input" className="sr-only">
        Search questions
      </label>
      <input
        id="search-input"
        type="search"
        value={query}
        onChange={(e) => updateParam("q", e.target.value)}
        placeholder="Search by title, tag, or technology..."
        autoFocus
        className="w-full rounded-md border border-slate-300 bg-white px-4 py-3 text-base text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500"
      />

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-400">
          <span className="sr-only">Category</span>
          <select
            value={category}
            onChange={(e) => updateParam("category", e.target.value, { push: true })}
            className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
          >
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {labelize(c)}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-400">
          <span className="sr-only">Difficulty</span>
          <select
            value={difficulty}
            onChange={(e) => updateParam("difficulty", e.target.value, { push: true })}
            className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
          >
            <option value="">All difficulties</option>
            {DIFFICULTIES.map((d) => (
              <option key={d} value={d}>
                {labelize(d)}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-400">
          <span className="sr-only">Technology</span>
          <select
            value={technology}
            onChange={(e) => updateParam("technology", e.target.value, { push: true })}
            className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
          >
            <option value="">All technologies</option>
            {technologies.map((t) => (
              <option key={t} value={t}>
                {labelize(t)}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-400">
          <span className="sr-only">Question type</span>
          <select
            value={questionType}
            onChange={(e) => updateParam("type", e.target.value, { push: true })}
            className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
          >
            <option value="">All types</option>
            {questionTypes.map((t) => (
              <option key={t} value={t}>
                {labelize(t)}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-400">
          <span className="sr-only">Interview level</span>
          <select
            value={level}
            onChange={(e) => updateParam("level", e.target.value, { push: true })}
            className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
          >
            <option value="">All interview levels</option>
            {levels.map((l) => (
              <option key={l} value={l}>
                {INTERVIEW_LEVEL_LABELS[l as InterviewLevel]}
              </option>
            ))}
          </select>
        </label>
        {hasActiveFilters && (
          <button
            type="button"
            onClick={() => {
              const params = new URLSearchParams(searchParams.toString());
              params.delete("difficulty");
              params.delete("technology");
              params.delete("type");
              params.delete("category");
              params.delete("level");
              params.delete("page");
              const qs = params.toString();
              router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
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
        <QuestionGrid questions={pageItems} />
        <Pagination currentPage={currentPage} totalPages={totalPages} hrefFor={hrefFor} />
      </div>
    </div>
  );
}
