"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { labelize } from "@/lib/format";

export interface FilterDefinition {
  /** URL search param key, e.g. "difficulty", "technology", "type", "category". */
  key: string;
  label: string;
  options: string[];
}

export function FilterBar({ filters }: { filters: FilterDefinition[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function updateParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  }

  const hasActiveFilters = filters.some((f) => searchParams.get(f.key));

  return (
    <div className="mb-6 flex flex-wrap items-center gap-3">
      {filters.map((filter) => (
        <label key={filter.key} className="flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-400">
          <span className="sr-only">{filter.label}</span>
          <select
            value={searchParams.get(filter.key) ?? ""}
            onChange={(e) => updateParam(filter.key, e.target.value)}
            className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-700 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
          >
            <option value="">All {filter.label.toLowerCase()}</option>
            {filter.options.map((opt) => (
              <option key={opt} value={opt}>
                {labelize(opt)}
              </option>
            ))}
          </select>
        </label>
      ))}
      {hasActiveFilters && (
        <button
          type="button"
          onClick={() => router.push(pathname)}
          className="text-xs font-medium text-indigo-600 hover:underline dark:text-indigo-400"
        >
          Clear filters
        </button>
      )}
    </div>
  );
}
