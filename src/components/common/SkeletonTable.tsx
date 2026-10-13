import React from 'react';

interface SkeletonTableProps {
  rows?: number;
  columns?: number;
}

export function SkeletonTable({ rows = 6, columns = 6 }: SkeletonTableProps) {
  return (
    <div className="w-full animate-pulse space-y-2 py-3">
      {/* Skeleton header */}
      <div className="h-7 bg-slate-800/60 rounded-lg w-full mb-3" />
      {/* Skeleton rows */}
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 py-2 px-1 border-b border-slate-800/40">
          {Array.from({ length: columns }).map((_, j) => (
            <div
              key={j}
              className={`h-4 bg-slate-800/50 rounded ${
                j === 0 ? 'w-24' : j === 1 ? 'w-36' : 'flex-1'
              }`}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
