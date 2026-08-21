"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { DifficultyBadge } from "./Badge";
import { MarkdownSection } from "./MarkdownSection";
import type { PracticeEntry } from "@/lib/questions";
import type { TaxonomyCategory } from "@/lib/questions";

const DIFFICULTIES = ["beginner", "intermediate", "advanced", "expert"];
const STORAGE_KEY = "practice-progress";

type ProgressStatus = "known" | "review";
type ProgressMap = Record<string, ProgressStatus>;

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j]!, copy[i]!];
  }
  return copy;
}

export function PracticeClient({
  allCards,
  categories,
}: {
  allCards: PracticeEntry[];
  categories: TaxonomyCategory[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const category = searchParams.get("category") ?? "";
  const difficulty = searchParams.get("difficulty") ?? "";
  const reviewOnly = searchParams.get("review") === "1";

  const [order, setOrder] = useState(allCards);
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [progress, setProgress] = useState<ProgressMap>({});

  useEffect(() => {
    setOrder(shuffle(allCards));
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setProgress(JSON.parse(raw));
    } catch {}
  }, [allCards]);

  const filtered = useMemo(() => {
    return order.filter(
      (c) =>
        (!category || c.category === category) &&
        (!difficulty || c.difficulty === difficulty) &&
        (!reviewOnly || progress[c.id] === "review"),
    );
  }, [order, category, difficulty, reviewOnly, progress]);

  const card = filtered[index];
  const knownCount = filtered.filter((c) => progress[c.id] === "known").length;
  const reviewCount = filtered.filter((c) => progress[c.id] === "review").length;

  function persistProgress(next: ProgressMap) {
    setProgress(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {}
  }

  function resetProgress() {
    if (!window.confirm("Clear all saved practice progress on this device?")) return;
    persistProgress({});
  }

  function updateParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname, { scroll: false });
    setIndex(0);
    setRevealed(false);
    setCompleted(false);
  }

  function advance() {
    setRevealed(false);
    if (index + 1 < filtered.length) {
      setIndex(index + 1);
    } else {
      setCompleted(true);
    }
  }

  function markAndAdvance(status: ProgressStatus) {
    if (card) persistProgress({ ...progress, [card.id]: status });
    advance();
  }

  function restart() {
    setOrder(shuffle(allCards));
    setIndex(0);
    setRevealed(false);
    setCompleted(false);
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={category}
          onChange={(e) => updateParam("category", e.target.value)}
          className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
        >
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c.slug} value={c.slug}>
              {c.name}
            </option>
          ))}
        </select>

        <select
          value={difficulty}
          onChange={(e) => updateParam("difficulty", e.target.value)}
          className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
        >
          <option value="">All difficulties</option>
          {DIFFICULTIES.map((d) => (
            <option key={d} value={d}>
              {d[0]!.toUpperCase() + d.slice(1)}
            </option>
          ))}
        </select>

        <label className="flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-400">
          <input
            type="checkbox"
            checked={reviewOnly}
            onChange={(e) => updateParam("review", e.target.checked ? "1" : "")}
            className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 dark:border-slate-700"
          />
          Review only
        </label>

        <button
          type="button"
          onClick={restart}
          className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-900"
        >
          Shuffle
        </button>

        <button
          type="button"
          onClick={resetProgress}
          className="ml-auto text-xs text-slate-400 underline decoration-slate-300 underline-offset-2 hover:text-slate-600 dark:decoration-slate-700 dark:hover:text-slate-300"
        >
          Reset progress
        </button>
      </div>

      {!card ? (
        <p className="mt-10 text-center text-sm text-slate-500 dark:text-slate-400">
          {reviewOnly ? "Nothing marked for review with these filters." : "No questions match these filters yet."}
        </p>
      ) : completed ? (
        <div className="mt-10 rounded-lg border border-slate-200 bg-white p-8 text-center dark:border-slate-800 dark:bg-slate-900">
          <p className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            You&apos;ve gone through this set.
          </p>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            {knownCount} got it · {reviewCount} need review · {filtered.length} total
          </p>
          <button
            type="button"
            onClick={restart}
            className="mt-5 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500"
          >
            Practice Again
          </button>
        </div>
      ) : (
        <div className="mt-6">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Card {index + 1} of {filtered.length} · {knownCount} known · {reviewCount} to review
          </p>

          <div className="mt-3 rounded-lg border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
            <div className="flex flex-wrap items-center gap-1.5">
              <DifficultyBadge difficulty={card.difficulty} />
              {progress[card.id] && (
                <span className="text-xs text-slate-400 dark:text-slate-500">
                  Last marked: {progress[card.id] === "known" ? "Got it" : "Needs review"}
                </span>
              )}
            </div>

            <p className="mt-4 text-lg font-medium text-slate-900 dark:text-slate-100">{card.question}</p>

            {revealed && (
              <div className="mt-5 border-t border-slate-200 pt-4 dark:border-slate-800">
                <MarkdownSection content={card.shortAnswer} />
                <Link
                  href={card.url}
                  className="mt-3 inline-block text-sm text-indigo-600 hover:underline dark:text-indigo-400"
                >
                  View full explanation →
                </Link>
              </div>
            )}

            <div className="mt-6 flex gap-3">
              {!revealed ? (
                <>
                  <button
                    type="button"
                    onClick={() => setRevealed(true)}
                    className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500"
                  >
                    Reveal Answer
                  </button>
                  {filtered.length > 1 && (
                    <button
                      type="button"
                      onClick={advance}
                      className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-900"
                    >
                      Skip
                    </button>
                  )}
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => markAndAdvance("known")}
                    className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500"
                  >
                    Got it
                  </button>
                  <button
                    type="button"
                    onClick={() => markAndAdvance("review")}
                    className="rounded-md bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-500"
                  >
                    Need Review
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
