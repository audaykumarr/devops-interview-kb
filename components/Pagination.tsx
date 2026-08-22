import Link from "next/link";

export function Pagination({
  currentPage,
  totalPages,
  hrefFor,
}: {
  currentPage: number;
  totalPages: number;
  hrefFor: (page: number) => string;
}) {
  if (totalPages <= 1) return null;

  return (
    <nav aria-label="Pagination" className="mt-8 flex items-center justify-center gap-3">
      <PageLink page={currentPage - 1} disabled={currentPage <= 1} hrefFor={hrefFor}>
        Previous
      </PageLink>
      <span className="text-sm text-slate-500 dark:text-slate-400">
        Page {currentPage} of {totalPages}
      </span>
      <PageLink page={currentPage + 1} disabled={currentPage >= totalPages} hrefFor={hrefFor}>
        Next
      </PageLink>
    </nav>
  );
}

function PageLink({
  page,
  disabled,
  hrefFor,
  children,
}: {
  page: number;
  disabled: boolean;
  hrefFor: (page: number) => string;
  children: React.ReactNode;
}) {
  if (disabled) {
    return (
      <span className="rounded-md border border-slate-200 px-3 py-1.5 text-sm text-slate-300 dark:border-slate-800 dark:text-slate-700">
        {children}
      </span>
    );
  }
  return (
    <Link
      href={hrefFor(page)}
      className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-900"
    >
      {children}
    </Link>
  );
}
