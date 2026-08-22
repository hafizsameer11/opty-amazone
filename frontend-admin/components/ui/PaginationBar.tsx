'use client';

import Button from '@/components/ui/Button';

export interface PaginationMeta {
  current_page: number;
  last_page: number;
  total: number;
  from: number | null;
  to: number | null;
}

interface PaginationBarProps {
  meta: PaginationMeta | null;
  loading?: boolean;
  onPageChange: (page: number) => void;
}

export default function PaginationBar({ meta, loading, onPageChange }: PaginationBarProps) {
  if (!meta || meta.last_page <= 1) {
    return null;
  }

  const { current_page: current, last_page: last, total, from, to } = meta;
  const range =
    from != null && to != null
      ? `${from}–${to} of ${total}`
      : `Page ${current} of ${last} (${total} total)`;

  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mt-6 pt-4 border-t border-slate-100">
      <p className="text-sm text-slate-500">{range}</p>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={loading || current <= 1}
          onClick={() => onPageChange(current - 1)}
        >
          Previous
        </Button>
        <span className="text-sm text-slate-700 px-2">
          {current} / {last}
        </span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={loading || current >= last}
          onClick={() => onPageChange(current + 1)}
        >
          Next
        </Button>
      </div>
    </div>
  );
}
