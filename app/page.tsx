import Link from "next/link";
import { SearchBox } from "@/components/SearchBox";
import { DifficultyBadge } from "@/components/Badge";
import { getAllQuestions, getAllTechnologies, getCategoriesWithCounts, getStatistics } from "@/lib/questions";
import { labelize } from "@/lib/format";

const DIFFICULTIES = ["beginner", "intermediate", "advanced", "expert"];

export default function HomePage() {
  const stats = getStatistics();
  const categories = getCategoriesWithCounts()
    .filter((c) => c.count > 0)
    .sort((a, b) => b.count - a.count);
  const technologies = getAllTechnologies().slice(0, 16);
  const questionTypes = Object.entries(stats.by_question_type).sort((a, b) => b[1] - a[1]);
  const allQuestions = getAllQuestions();

  return (
    <div>
      <section className="text-center">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100 sm:text-4xl">
          DevOps Interview Knowledge Base
        </h1>
        <p className="mx-auto mt-3 max-w-2xl text-slate-600 dark:text-slate-400">
          Practical, scenario-driven interview prep — from foundational concepts to real
          production troubleshooting. Every question and answer is original and Git-sourced.
        </p>
        <div className="mx-auto mt-6 max-w-xl">
          <SearchBox autoFocus />
        </div>
      </section>

      <section className="mt-10">
        <SectionHeading>Browse by Category</SectionHeading>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          {categories.map((c) => (
            <Link
              key={c.slug}
              href={`/${c.slug}`}
              className="flex items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-2.5 text-sm hover:border-slate-300 hover:shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700"
            >
              <span className="text-slate-800 dark:text-slate-200">{c.name}</span>
              <span className="text-xs text-slate-400 dark:text-slate-500">{c.count}</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="mt-12">
        <SectionHeading>Browse by Difficulty</SectionHeading>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {DIFFICULTIES.map((level) => (
            <Link
              key={level}
              href={`/difficulty/${level}`}
              className="rounded-lg border border-slate-200 bg-white p-4 text-center hover:border-slate-300 hover:shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700"
            >
              <DifficultyBadge difficulty={level} />
              <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                {stats.by_difficulty[level] ?? 0} questions
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="mt-12">
        <SectionHeading>Browse by Technology</SectionHeading>
        <div className="flex flex-wrap gap-2">
          {technologies.map((t) => (
            <Link
              key={t.slug}
              href={`/technologies/${t.slug}`}
              className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 hover:border-slate-300 hover:shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-slate-700"
            >
              {labelize(t.slug)} <span className="text-slate-400 dark:text-slate-500">({t.count})</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="mt-12">
        <SectionHeading>Browse by Question Type</SectionHeading>
        <div className="flex flex-wrap gap-2">
          {questionTypes.map(([type, count]) => (
            <Link
              key={type}
              href={`/search?type=${type}`}
              className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 hover:border-slate-300 hover:shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-slate-700"
            >
              {labelize(type)} <span className="text-slate-400 dark:text-slate-500">({count})</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="mt-12">
        <SectionHeading>Recently Updated</SectionHeading>
        <ul className="space-y-2">
          {stats.recently_updated.slice(0, 5).map((item) => {
            const full = allQuestions.find((q) => q.id === item.id);
            if (!full) return null;
            return (
              <li key={item.id}>
                <Link
                  href={full.url}
                  className="flex items-center justify-between gap-3 rounded-md border border-slate-200 bg-white px-3 py-2.5 text-sm hover:border-slate-300 hover:shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700"
                >
                  <span className="text-slate-800 dark:text-slate-200">{item.title}</span>
                  <DifficultyBadge difficulty={full.difficulty} />
                </Link>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return <h2 className="mb-4 text-lg font-semibold text-slate-900 dark:text-slate-100">{children}</h2>;
}
