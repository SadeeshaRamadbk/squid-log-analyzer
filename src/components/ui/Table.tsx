import React from 'react';

export function Table({
  className = '',
  children,
  ...props
}: React.TableHTMLAttributes<HTMLTableElement>) {
  return (
    <div className="relative w-full overflow-auto">
      <table
        className={`w-full text-left border-collapse text-sm text-slate-200 ${className}`}
        {...props}
      >
        {children}
      </table>
    </div>
  );
}

export function TableHeader({
  className = '',
  children,
  ...props
}: React.HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <thead
      className={`bg-slate-900/95 backdrop-blur sticky top-0 z-10 text-xs font-semibold text-slate-300 uppercase tracking-wider border-b border-slate-800 ${className}`}
      {...props}
    >
      {children}
    </thead>
  );
}

export function TableBody({
  className = '',
  children,
  ...props
}: React.HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <tbody
      className={`divide-y divide-slate-800/50 ${className}`}
      {...props}
    >
      {children}
    </tbody>
  );
}

export function TableRow({
  className = '',
  selected = false,
  children,
  ...props
}: React.HTMLAttributes<HTMLTableRowElement> & { selected?: boolean }) {
  return (
    <tr
      data-selected={selected}
      className={`transition-colors hover:bg-slate-800/40 even:bg-slate-900/25 odd:bg-transparent data-[selected=true]:bg-indigo-950/50 ${className}`}
      {...props}
    >
      {children}
    </tr>
  );
}

export function TableHead({
  className = '',
  children,
  ...props
}: React.ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      scope="col"
      className={`px-4 py-3 font-semibold text-slate-300 align-middle ${className}`}
      {...props}
    >
      {children}
    </th>
  );
}

export function TableCell({
  className = '',
  numeric = false,
  children,
  ...props
}: React.TdHTMLAttributes<HTMLTableCellElement> & { numeric?: boolean }) {
  return (
    <td
      className={`px-4 py-3 align-middle text-slate-200 ${
        numeric ? 'text-right font-mono tabular-nums' : ''
      } ${className}`}
      {...props}
    >
      {children}
    </td>
  );
}

export function TableCaption({
  className = '',
  children,
  ...props
}: React.HTMLAttributes<HTMLTableCaptionElement>) {
  return (
    <caption
      className={`sr-only ${className}`}
      {...props}
    >
      {children}
    </caption>
  );
}
