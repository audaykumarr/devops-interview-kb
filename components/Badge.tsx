import { labelize } from "@/lib/format";

const DIFFICULTY_STYLES: Record<string, string> = {
  beginner: "bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-500/10 dark:text-emerald-400 dark:ring-emerald-500/30",
  intermediate: "bg-sky-50 text-sky-700 ring-sky-600/20 dark:bg-sky-500/10 dark:text-sky-400 dark:ring-sky-500/30",
  advanced: "bg-amber-50 text-amber-700 ring-amber-600/20 dark:bg-amber-500/10 dark:text-amber-400 dark:ring-amber-500/30",
  expert: "bg-rose-50 text-rose-700 ring-rose-600/20 dark:bg-rose-500/10 dark:text-rose-400 dark:ring-rose-500/30",
};

const NEUTRAL_STYLE =
  "bg-slate-100 text-slate-700 ring-slate-600/10 dark:bg-slate-500/10 dark:text-slate-300 dark:ring-slate-500/20";

const TECH_STYLE =
  "bg-indigo-50 text-indigo-700 ring-indigo-600/20 dark:bg-indigo-500/10 dark:text-indigo-400 dark:ring-indigo-500/30";

interface BadgeProps {
  children: React.ReactNode;
  variant?: "difficulty" | "neutral" | "technology";
  value?: string;
}

export function Badge({ children, variant = "neutral", value }: BadgeProps) {
  const style =
    variant === "difficulty" && value
      ? (DIFFICULTY_STYLES[value] ?? NEUTRAL_STYLE)
      : variant === "technology"
        ? TECH_STYLE
        : NEUTRAL_STYLE;

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${style}`}
    >
      {children}
    </span>
  );
}

export function DifficultyBadge({ difficulty }: { difficulty: string }) {
  return (
    <Badge variant="difficulty" value={difficulty}>
      {labelize(difficulty)}
    </Badge>
  );
}

export function TechnologyBadge({ technology }: { technology: string }) {
  return <Badge variant="technology">{labelize(technology)}</Badge>;
}

export function TypeBadge({ type }: { type: string }) {
  return <Badge>{labelize(type)}</Badge>;
}
