export function Footer() {
  return (
    <footer className="mt-16 border-t border-slate-200 py-8 text-sm text-slate-500 dark:border-slate-800 dark:text-slate-400">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
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
      </div>
    </footer>
  );
}
