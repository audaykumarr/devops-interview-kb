export function Footer() {
  return (
    <footer className="mt-16 border-t border-slate-200 py-8 text-sm text-slate-500 dark:border-slate-800 dark:text-slate-400">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 sm:px-6">
        <p>
          Content is Git-driven and open source. See{" "}
          <a
            href="https://github.com/audaykumarr/devops-interview-kb/blob/main/CONTRIBUTING.md"
            className="underline decoration-slate-300 underline-offset-2 hover:text-slate-700 dark:decoration-slate-700 dark:hover:text-slate-200"
          >
            CONTRIBUTING.md
          </a>{" "}
          to add or improve a question.
        </p>
        <a
          href="https://x.com/devopskb"
          className="-my-2 flex items-center gap-1.5 py-2 hover:text-slate-700 dark:hover:text-slate-200"
        >
          <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden="true">
            <path d="M18.9 2H22l-7.5 8.6L23 22h-6.9l-5.4-6.5L4.5 22H1.3l8.1-9.2L1 2h7.1l4.9 5.9L18.9 2Zm-1.2 18h1.7L6.4 4H4.6l13.1 16Z" />
          </svg>
          @devopskb
        </a>
      </div>
    </footer>
  );
}
