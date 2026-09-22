'use client';

import React, { useState, useMemo } from 'react';
import Skeleton from './Skeleton';
import { useLanguage } from '@/contexts/LanguageContext';

export interface Column<T> {
  key: string;
  header: string;
  render?: (item: T) => React.ReactNode;
  sortable?: boolean;
  /** Hide this column below the `md` breakpoint to reduce horizontal scroll */
  hideBelowMd?: boolean;
  /** Extra classes for th/td (e.g. whitespace-nowrap) */
  className?: string;
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  loading?: boolean;
  onRowClick?: (item: T) => void;
  keyExtractor: (item: T) => string | number;
  disableHorizontalScroll?: boolean;
}

export default function DataTable<T extends Record<string, any>>({
  data,
  columns,
  loading = false,
  onRowClick,
  keyExtractor,
  disableHorizontalScroll = false,
}: DataTableProps<T>) {
  const { t } = useLanguage();
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const handleSort = (key: string) => {
    if (sortColumn === key) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(key);
      setSortDirection('asc');
    }
  };

  const sortedData = useMemo(() => {
    if (!sortColumn) return data;
    return [...data].sort((a, b) => {
      const aVal = a[sortColumn];
      const bVal = b[sortColumn];
      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [data, sortColumn, sortDirection]);

  if (loading) {
    return (
      <div className="glass-card rounded-xl overflow-hidden">
        <div className="p-6 space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      </div>
    );
  }

  const colVisibility = (column: Column<T>) =>
    column.hideBelowMd ? 'hidden md:table-cell' : '';

  return (
    <div className="glass-card rounded-xl overflow-hidden">
      <div className={disableHorizontalScroll ? 'overflow-hidden' : 'overflow-x-auto'}>
        <table className={`w-full min-w-0 ${disableHorizontalScroll ? 'table-fixed' : ''}`}>
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={`px-4 lg:px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider ${colVisibility(column)} ${
                    column.sortable ? 'cursor-pointer hover:text-slate-900' : ''
                  } ${column.className || ''}`}
                  onClick={() => column.sortable && handleSort(column.key)}
                >
                  <div className="flex items-center gap-2">
                    {column.header}
                    {column.sortable && sortColumn === column.key && (
                      <span className="text-xs">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {sortedData.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 lg:px-6 py-8 text-center text-slate-500">
                  {t('noResults')}
                </td>
              </tr>
            ) : (
              sortedData.map((item) => (
                <tr
                  key={keyExtractor(item)}
                  className={`hover:bg-slate-50 transition-colors ${onRowClick ? 'cursor-pointer' : ''}`}
                  onClick={() => onRowClick?.(item)}
                >
                  {columns.map((column) => (
                    <td
                      key={column.key}
                      className={`px-4 lg:px-6 py-4 text-sm text-slate-700 ${colVisibility(column)} ${column.className || ''}`}
                    >
                      {column.render ? column.render(item) : item[column.key]}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
