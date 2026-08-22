/** Shape of Laravel's LengthAwarePaginator JSON payload (inside API `data`). */
export interface LaravelPaginator<T> {
  data: T[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
  from: number | null;
  to: number | null;
}

export function isPaginatorPayload<T>(value: unknown): value is LaravelPaginator<T> {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return Array.isArray(v.data) && typeof v.current_page === 'number' && typeof v.last_page === 'number';
}
