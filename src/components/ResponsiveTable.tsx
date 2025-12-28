import React, { memo } from 'react';

interface ResponsiveTableProps {
  children: React.ReactNode;
  className?: string;
}

export const ResponsiveTable = memo(function ResponsiveTable({ children, className = '' }: ResponsiveTableProps) {
  return (
    <div className="w-full overflow-x-auto -mx-4 sm:mx-0">
      <div className="inline-block min-w-full align-middle px-4 sm:px-0">
        <div className={`overflow-hidden ${className}`}>
          {children}
        </div>
      </div>
    </div>
  );
});

interface ResponsiveTableWrapperProps {
  children: React.ReactNode;
  minWidth?: string;
}

export const ResponsiveTableWrapper = memo(function ResponsiveTableWrapper({ children, minWidth = '800px' }: ResponsiveTableWrapperProps) {
  return (
    <div className="w-full overflow-x-auto scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-gray-800">
      <div style={{ minWidth }} className="w-full">
        {children}
      </div>
    </div>
  );
});

interface MobileCardProps {
  data: Record<string, any>;
  fields: {
    key: string;
    label: string;
    render?: (value: any, row: Record<string, any>) => React.ReactNode;
  }[];
  onClick?: () => void;
}

export const MobileCard = memo(function MobileCard({ data, fields, onClick }: MobileCardProps) {
  return (
    <div
      onClick={onClick}
      className={`bg-gray-800 border border-gray-700 rounded-lg p-4 space-y-3 ${
        onClick ? 'cursor-pointer hover:bg-gray-750 active:bg-gray-700 transition-colors' : ''
      }`}
    >
      {fields.map((field) => (
        <div key={field.key} className="flex justify-between items-start gap-4">
          <span className="text-sm text-gray-400 font-medium min-w-[100px]">{field.label}</span>
          <span className="text-sm text-white text-right flex-1 break-words">
            {field.render ? field.render(data[field.key], data) : data[field.key]}
          </span>
        </div>
      ))}
    </div>
  );
});

interface ResponsiveViewProps {
  data: any[];
  columns: {
    key: string;
    label: string;
    render?: (value: any, row: any) => React.ReactNode;
    mobileHidden?: boolean;
  }[];
  renderRow?: (row: any, index: number) => React.ReactNode;
  onRowClick?: (row: any) => void;
  emptyMessage?: string;
}

export function ResponsiveView({
  data,
  columns,
  renderRow,
  onRowClick,
  emptyMessage = 'No data available',
}: ResponsiveViewProps) {
  if (data.length === 0) {
    return (
      <div className="text-center py-12 text-gray-400">
        <p>{emptyMessage}</p>
      </div>
    );
  }

  return (
    <>
      <div className="hidden md:block">
        <ResponsiveTableWrapper>
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-700">
                {columns.map((col) => (
                  <th
                    key={col.key}
                    className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider"
                  >
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {data.map((row, index) =>
                renderRow ? (
                  renderRow(row, index)
                ) : (
                  <tr
                    key={index}
                    onClick={() => onRowClick?.(row)}
                    className={onRowClick ? 'cursor-pointer hover:bg-gray-750 transition-colors' : ''}
                  >
                    {columns.map((col) => (
                      <td key={col.key} className="px-4 py-4 text-sm text-white">
                        {col.render ? col.render(row[col.key], row) : row[col.key]}
                      </td>
                    ))}
                  </tr>
                )
              )}
            </tbody>
          </table>
        </ResponsiveTableWrapper>
      </div>

      <div className="md:hidden space-y-3">
        {data.map((row, index) => (
          <MobileCard
            key={index}
            data={row}
            fields={columns.filter((col) => !col.mobileHidden)}
            onClick={() => onRowClick?.(row)}
          />
        ))}
      </div>
    </>
  );
}
