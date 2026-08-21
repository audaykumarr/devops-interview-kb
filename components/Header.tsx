import Link from "next/link";
import { SearchBox } from "./SearchBox";
import { ThemeToggle } from "./ThemeToggle";

export function Header() {
  return (
    <header className="border-b border-slate-200 bg-white/80 backdrop-blur dark:border-slate-800 dark:bg-slate-950/80 sticky top-0 z-10">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3 px-4 py-3 sm:px-6">
        <Link href="/" className="flex items-center gap-2 text-sm font-bold tracking-tight text-slate-900 dark:text-slate-100 sm:text-base">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-gradient-to-br from-slate-900 to-indigo-950 font-mono text-indigo-400">
            &gt;
          </span>
          DevOps Interview KB
        </Link>
        <nav className="flex items-center gap-4 text-sm text-slate-600 dark:text-slate-400">
          <Link href="/search" className="hover:text-slate-900 dark:hover:text-slate-100">
            Search
          </Link>
          <Link href="/practice" className="hover:text-slate-900 dark:hover:text-slate-100">
            Practice
          </Link>
          <Link href="/contact" className="hover:text-slate-900 dark:hover:text-slate-100">
            Contact
          </Link>
          <a
            href="https://github.com/audaykumarr/devops-interview-kb"
            className="hover:text-slate-900 dark:hover:text-slate-100"
          >
            GitHub
          </a>
        </nav>
        <div className="ml-auto flex w-full items-center gap-3 sm:w-auto">
          <div className="flex-1 sm:w-64 sm:flex-none">
            <SearchBox compact />
          </div>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
