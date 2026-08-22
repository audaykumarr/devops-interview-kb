export const PAGE_SIZE = 24;

export interface PageResult<T> {
  items: T[];
  currentPage: number;
  totalPages: number;
  startIndex: number;
}

export function paginate<T>(items: T[], requestedPage: number): PageResult<T> {
  const totalPages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
  const currentPage = Math.min(Math.max(1, requestedPage), totalPages);
  const startIndex = (currentPage - 1) * PAGE_SIZE;
  return {
    items: items.slice(startIndex, startIndex + PAGE_SIZE),
    currentPage,
    totalPages,
    startIndex,
  };
}
