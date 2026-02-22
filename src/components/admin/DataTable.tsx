'use client';

import { useState, useMemo } from 'react';

export interface Column<T> {
  key: string;
  label: string;
  sortable?: boolean;
  render?: (item: T) => React.ReactNode;
  className?: string;
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  keyField: keyof T;
  onEdit?: (item: T) => void;
  onDelete?: (item: T) => void;
  pageSize?: number;
  searchable?: boolean;
  searchPlaceholder?: string;
  actions?: (item: T) => React.ReactNode;
}

export default function DataTable<T extends Record<string, any>>({
  data,
  columns,
  keyField,
  onEdit,
  onDelete,
  pageSize: initialPageSize = 10,
  searchable = true,
  searchPlaceholder = 'Search...',
  actions,
}: DataTableProps<T>) {
  const [search, setSearch] = useState('');
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);

  const filtered = useMemo(() => {
    if (!search.trim()) return data;
    const q = search.toLowerCase();
    return data.filter((item) =>
      columns.some((col) => {
        const val = item[col.key];
        return val != null && String(val).toLowerCase().includes(q);
      })
    );
  }, [data, search, columns]);

  const sorted = useMemo(() => {
    if (!sortColumn) return filtered;
    return [...filtered].sort((a, b) => {
      const aVal = a[sortColumn] ?? '';
      const bVal = b[sortColumn] ?? '';
      if (aVal < bVal) return sortDir === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filtered, sortColumn, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const paginated = sorted.slice((safePage - 1) * pageSize, safePage * pageSize);

  const handleSort = (key: string) => {
    if (sortColumn === key) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(key);
      setSortDir('asc');
    }
  };

  const hasActions = !!(onEdit || onDelete || actions);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
      {/* Toolbar */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        {searchable && (
          <input
            type="text"
            placeholder={searchPlaceholder}
            value={search}
            onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
            className="w-full sm:w-64 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-team-blue focus:border-transparent outline-none"
          />
        )}
        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
          <span>{sorted.length} item{sorted.length !== 1 ? 's' : ''}</span>
          <select
            value={pageSize}
            onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
            className="border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded px-2 py-1 text-sm"
          >
            {[10, 25, 50].map((n) => (
              <option key={n} value={n}>{n} per page</option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`px-4 py-3 text-left font-semibold text-gray-600 dark:text-gray-300 ${col.sortable !== false ? 'cursor-pointer select-none hover:text-gray-900 dark:hover:text-white' : ''} ${col.className || ''}`}
                  onClick={() => col.sortable !== false && handleSort(col.key)}
                >
                  <div className="flex items-center gap-1">
                    {col.label}
                    {col.sortable !== false && sortColumn === col.key && (
                      <span className="text-team-blue">{sortDir === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </div>
                </th>
              ))}
              {hasActions && (
                <th className="px-4 py-3 text-right font-semibold text-gray-600 dark:text-gray-300">Actions</th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
            {paginated.length === 0 ? (
              <tr>
                <td colSpan={columns.length + (hasActions ? 1 : 0)} className="px-4 py-12 text-center text-gray-400 dark:text-gray-500">
                  No items found.
                </td>
              </tr>
            ) : (
              paginated.map((item) => (
                <tr key={String(item[keyField])} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                  {columns.map((col) => (
                    <td key={col.key} className={`px-4 py-3 text-gray-900 dark:text-gray-200 ${col.className || ''}`}>
                      {col.render ? col.render(item) : String(item[col.key] ?? '')}
                    </td>
                  ))}
                  {hasActions && (
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {actions && actions(item)}
                        {onEdit && (
                          <button
                            onClick={() => onEdit(item)}
                            className="px-2.5 py-1 text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 rounded hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
                          >
                            Edit
                          </button>
                        )}
                        {onDelete && (
                          <button
                            onClick={() => onDelete(item)}
                            className="px-2.5 py-1 text-xs font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30 rounded hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors"
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <span className="text-sm text-gray-500 dark:text-gray-400">
            Page {safePage} of {totalPages}
          </span>
          <div className="flex gap-1">
            <button
              onClick={() => setCurrentPage(Math.max(1, safePage - 1))}
              disabled={safePage <= 1}
              className="px-3 py-1.5 text-sm rounded border border-gray-300 dark:border-gray-600 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors dark:text-gray-300"
            >
              Previous
            </button>
            <button
              onClick={() => setCurrentPage(Math.min(totalPages, safePage + 1))}
              disabled={safePage >= totalPages}
              className="px-3 py-1.5 text-sm rounded border border-gray-300 dark:border-gray-600 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors dark:text-gray-300"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
