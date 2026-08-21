import Link from "next/link";

export default function NotFound() {
  return (
    <div className="py-20 text-center">
      <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">Page not found</h1>
      <p className="mt-2 text-slate-600 dark:text-slate-400">The page you&rsquo;re looking for doesn&rsquo;t exist.</p>
      <Link
        href="/"
        className="mt-6 inline-block rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500"
      >
        Back to home
      </Link>
    </div>
  );
}
