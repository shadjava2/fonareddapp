import React from 'react';
import { ReportTable } from '@/types/report';

export function toPairs(obj?: Record<string, any>): [string, string][] {
  if (!obj) return [];
  return Object.entries(obj).map(([k, v]) => [k, String(v ?? '')]);
}

export function fileNameFrom(id: number, type: string, dateStr: string) {
  const safeDate = dateStr.replace(/[^\d-]/g, '');
  return `rapport-${type}-${id}-${safeDate}.pdf`;
}

export function TableHtml({ table }: { table: ReportTable }): React.ReactElement {
  return (
    <div className="space-y-2">
      {table.title ? <div className="text-sm font-medium">{table.title}</div> : null}
      <div className="overflow-x-auto rounded-md border border-gray-200">
        <table className="min-w-full border-collapse text-sm">
          <thead>
            <tr>
              {table.headers.map((h) => (
                <th
                  key={h}
                  className="border-b bg-gray-50 px-3 py-2 text-left font-medium text-gray-700"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {table.rows.map((row, i) => (
              <tr key={i}>
                {row.map((cell, j) => (
                  <td key={j} className="border-b px-3 py-2 align-top">
                    {String(cell)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

