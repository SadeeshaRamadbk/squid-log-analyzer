import { anonymizeUsername } from './privacy';

export interface ExportCsvOptions {
  anonymizeUsernames?: boolean;
}

/**
 * Utility to export an array of JSON objects as a CSV file downloaded in the browser
 */
export function exportToCsv<T extends Record<string, any>>(
  filename: string,
  rows: T[],
  columns: Array<{ key: keyof T | string; header: string }>,
  options: ExportCsvOptions = {}
): void {
  if (!rows || rows.length === 0) {
    alert('No data available to export.');
    return;
  }

  const escapeCell = (val: any, colKey?: string): string => {
    if (val === null || val === undefined) return '""';
    let str = String(val);
    if (options.anonymizeUsernames && (colKey === 'userName' || colKey === 'user' || colKey === 'user_name')) {
      str = anonymizeUsername(str);
    }
    str = str.replace(/"/g, '""');
    return `"${str}"`;
  };

  const headers = columns.map((col) => escapeCell(col.header)).join(',');
  const lines = rows.map((row) =>
    columns.map((col) => escapeCell(row[col.key as keyof T], String(col.key))).join(',')
  );

  const csvContent = '\uFEFF' + [headers, ...lines].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}_${new Date().toISOString().substring(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
