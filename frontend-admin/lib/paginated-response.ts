import type { PaginationMeta } from '@/components/ui/PaginationBar';
import { isPaginatorPayload } from '@/lib/laravel-pagination';

export function rowsAndMetaFromAdminList<T>(payload: unknown): { rows: T[]; meta: PaginationMeta | null } {
  if (isPaginatorPayload<T>(payload)) {
    return {
      rows: payload.data,
      meta: {
        current_page: payload.current_page,
        last_page: payload.last_page,
        total: payload.total,
        from: payload.from ?? null,
        to: payload.to ?? null,
      },
    };
  }
  return { rows: [], meta: null };
}
