'use client';

import React, { useState } from 'react';
import { Download, SlidersHorizontal, ChevronDown, Check } from 'lucide-react';

export interface ColumnDef {
  key: string;
  label: string;
  visible?: boolean;
}

interface TableToolbarProps {
  pageSize?: number;
  onPageSizeChange?: (size: number) => void;
  pageSizeOptions?: number[];
  columns?: ColumnDef[];
  onToggleColumn?: (key: string) => void;
  onExportCsv?: () => void;
  totalRecords?: number;
  extraActions?: React.ReactNode;
}

export function TableToolbar({
  pageSize,
  onPageSizeChange,
  pageSizeOptions = [25, 50, 100, 250],
  columns,
  onToggleColumn,
  onExportCsv,
  totalRecords,
  extraActions,
}: TableToolbarProps) {
  const [colMenuOpen, setColMenuOpen] = useState(false);

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 py-2 text-xs">
      {/* Left: Total records & Extra actions */}
      <div className="flex items-center gap-2 text-slate-400">
        {totalRecords !== undefined && (
          <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-slate-800/80 text-slate-300 border border-slate-700/60">
            {totalRecords.toLocaleString()} rows
          </span>
        )}
        {extraActions}
      </div>

      {/* Right: Controls (Page Size, Column Visibility, CSV Export) */}
      <div className="flex items-center gap-2">
        {/* Page Size Selector */}
        {pageSize !== undefined && onPageSizeChange && (
          <div className="flex items-center gap-1.5 bg-slate-950/60 border border-slate-800 rounded-lg px-2 py-1 text-slate-300">
            <label htmlFor="page-size-select" className="text-slate-400 text-[11px] font-medium">Show:</label>
            <select
              id="page-size-select"
              aria-label="Select number of records per page"
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              className="bg-transparent text-slate-200 focus:outline-none cursor-pointer font-mono text-xs"
            >
              {pageSizeOptions.map((opt) => (
                <option key={opt} value={opt} className="bg-slate-900 text-slate-200">
                  {opt}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Column Visibility Dropdown */}
        {columns && columns.length > 0 && onToggleColumn && (
          <div className="relative">
            <button
              type="button"
              onClick={() => setColMenuOpen((prev) => !prev)}
              aria-label="Toggle column visibility"
              aria-haspopup="menu"
              aria-expanded={colMenuOpen}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-300 transition-colors cursor-pointer text-xs"
              title="Show or hide columns"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400" />
              <span>Columns</span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {colMenuOpen && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setColMenuOpen(false)} />
                <div
                  role="menu"
                  aria-label="Column visibility options"
                  onKeyDown={(e) => { if (e.key === 'Escape') setColMenuOpen(false); }}
                  className="absolute right-0 mt-1 w-44 bg-slate-900 border border-slate-700 rounded-xl shadow-xl z-40 p-2 space-y-1 divide-y divide-slate-800/60 animate-in fade-in zoom-in-95 duration-100"
                >
                  <div className="text-[10px] uppercase font-bold text-slate-400 px-2 py-1 tracking-wider">
                    Visible Columns
                  </div>
                  <div className="pt-1 space-y-1">
                    {columns.map((col) => (
                      <button
                        key={col.key}
                        type="button"
                        role="menuitemcheckbox"
                        aria-checked={col.visible !== false}
                        onClick={() => onToggleColumn(col.key)}
                        className="w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-xs hover:bg-slate-800 text-slate-200 cursor-pointer"
                      >
                        <span className="truncate">{col.label}</span>
                        {col.visible !== false && <Check className="w-3.5 h-3.5 text-indigo-400" />}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* CSV Export Button */}
        {onExportCsv && (
          <button
            type="button"
            onClick={onExportCsv}
            aria-label="Export table to CSV"
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 transition-colors font-medium cursor-pointer text-xs"
            title="Download filtered records as CSV spreadsheet"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
        )}
      </div>
    </div>
  );
}
