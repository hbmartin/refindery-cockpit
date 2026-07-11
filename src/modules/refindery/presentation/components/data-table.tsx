import type { ReactNode } from 'react';

import { cn } from '@/platform/lib/tailwind/utils';

export type Column<T> = {
  key: string;
  header: ReactNode;
  cell: (row: T) => ReactNode;
  className?: string;
  align?: 'left' | 'right' | 'center';
};

type DataTableProps<T> = {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  onRowClick?: (row: T) => void;
  className?: string;
  dense?: boolean;
};

const alignClass = (align?: 'left' | 'right' | 'center') =>
  align === 'right'
    ? 'text-right'
    : align === 'center'
      ? 'text-center'
      : 'text-left';

/**
 * Dense, dark-first table for the cockpit. Not virtualized — callers cap rows
 * (medium corpus). Numeric columns use tabular figures via `font-mono`.
 */
export function DataTable<T>({
  columns,
  rows,
  rowKey,
  onRowClick,
  className,
  dense = true,
}: DataTableProps<T>) {
  return (
    <div
      className={cn(
        'w-full overflow-x-auto rounded-lg border border-border/60',
        className
      )}
    >
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-border/60 bg-muted/40 text-xs text-muted-foreground">
            {columns.map((col) => (
              <th
                key={col.key}
                className={cn(
                  'px-3 py-2 font-medium whitespace-nowrap',
                  alignClass(col.align),
                  col.className
                )}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={rowKey(row)}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              className={cn(
                'border-b border-border/40 last:border-0',
                onRowClick && 'cursor-pointer hover:bg-muted/40'
              )}
            >
              {columns.map((col) => (
                <td
                  key={col.key}
                  className={cn(
                    dense ? 'px-3 py-1.5' : 'px-3 py-2.5',
                    'align-middle',
                    alignClass(col.align),
                    col.className
                  )}
                >
                  {col.cell(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
