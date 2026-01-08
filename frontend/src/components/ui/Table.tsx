import React from 'react';
import { TableProps, TableColumn } from '@/types';
import { ChevronUp, ChevronDown } from 'lucide-react';
import { cn } from '@/utils';

const Table: React.FC<TableProps> = ({
  columns,
  data,
  loading = false,
  pagination,
  onPageChange,
  onSort,
  sortColumn,
  sortDirection,
}) => {
  const handleSort = (column: string) => {
    if (!onSort) return;
    
    const newDirection = sortColumn === column && sortDirection === 'asc' ? 'desc' : 'asc';
    onSort(column, newDirection);
  };

  if (loading) {
    return (
      <div className="card">
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-secondary-50 dark:bg-secondary-700">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={cn(
                    'px-4 py-3 text-left text-xs font-medium text-secondary-500 dark:text-secondary-400 uppercase tracking-wider',
                    column.width && `w-${column.width}`,
                    column.align === 'center' && 'text-center',
                    column.align === 'right' && 'text-right',
                    column.sortable && 'cursor-pointer hover:text-secondary-700 dark:hover:text-secondary-300'
                  )}
                  onClick={() => column.sortable && handleSort(column.key)}
                >
                  <div className={cn(
                    'flex items-center gap-2',
                    column.align === 'center' && 'justify-center',
                    column.align === 'right' && 'justify-end'
                  )}>
                    {column.label}
                    {column.sortable && sortColumn === column.key && (
                      sortDirection === 'asc' ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-secondary-800 divide-y divide-secondary-200 dark:divide-secondary-700">
            {data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-8 text-center text-secondary-500 dark:text-secondary-400">
                  No data available
                </td>
              </tr>
            ) : (
              data.map((row, rowIndex) => (
                <tr key={rowIndex} className="hover:bg-secondary-50 dark:hover:bg-secondary-700">
                  {columns.map((column) => (
                    <td
                      key={column.key}
                      className={cn(
                        'px-4 py-3 text-sm text-secondary-900 dark:text-white',
                        column.align === 'center' && 'text-center',
                        column.align === 'right' && 'text-right'
                      )}
                    >
                      {column.render ? column.render(row[column.key], row) : (row[column.key] !== undefined && row[column.key] !== null ? row[column.key] : '-')}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination && onPageChange && (
        <div className="px-4 py-3 bg-secondary-50 dark:bg-secondary-700 border-t border-secondary-200 dark:border-secondary-600">
          <div className="flex items-center justify-between">
            <div className="text-sm text-secondary-700 dark:text-secondary-300">
              Showing {((pagination.currentPage - 1) * pagination.itemsPerPage) + 1} to{' '}
              {Math.min(pagination.currentPage * pagination.itemsPerPage, pagination.totalItems)} of{' '}
              {pagination.totalItems} results
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => onPageChange(pagination.currentPage - 1)}
                disabled={pagination.currentPage === 1}
                className="px-3 py-1 text-sm text-secondary-500 dark:text-secondary-400 hover:text-secondary-700 dark:hover:text-secondary-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <span className="text-sm text-secondary-700 dark:text-secondary-300">
                Page {pagination.currentPage} of {pagination.totalPages}
              </span>
              <button
                onClick={() => onPageChange(pagination.currentPage + 1)}
                disabled={pagination.currentPage === pagination.totalPages}
                className="px-3 py-1 text-sm text-secondary-500 dark:text-secondary-400 hover:text-secondary-700 dark:hover:text-secondary-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Table;
