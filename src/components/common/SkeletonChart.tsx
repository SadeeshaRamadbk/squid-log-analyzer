import React from 'react';

interface SkeletonChartProps {
  height?: string;
  title?: string;
}

export function SkeletonChart({ height = 'h-80', title }: SkeletonChartProps) {
  return (
    <div className={`bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow-sm animate-pulse ${height} flex flex-col justify-between`}>
      {/* Skeleton Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="space-y-1.5">
          <div className="h-4 bg-slate-800 rounded w-48" />
          <div className="h-3 bg-slate-800/60 rounded w-72" />
        </div>
        <div className="h-7 bg-slate-800 rounded w-32 hidden sm:block" />
      </div>

      {/* Mock Chart Area */}
      <div className="flex-1 flex items-end gap-2 pt-6 pb-2 px-2 border-b border-l border-slate-800/80">
        <div className="h-1/3 bg-slate-800/40 rounded-t w-full" />
        <div className="h-1/2 bg-slate-800/50 rounded-t w-full" />
        <div className="h-2/3 bg-slate-800/60 rounded-t w-full" />
        <div className="h-4/5 bg-slate-800/70 rounded-t w-full" />
        <div className="h-3/5 bg-slate-800/60 rounded-t w-full" />
        <div className="h-2/5 bg-slate-800/50 rounded-t w-full" />
        <div className="h-3/4 bg-slate-800/60 rounded-t w-full" />
        <div className="h-1/2 bg-slate-800/40 rounded-t w-full" />
      </div>

      {/* Mock X-Axis Labels */}
      <div className="flex justify-between pt-2 px-1">
        <div className="h-2.5 bg-slate-800/50 rounded w-10" />
        <div className="h-2.5 bg-slate-800/50 rounded w-10" />
        <div className="h-2.5 bg-slate-800/50 rounded w-10" />
        <div className="h-2.5 bg-slate-800/50 rounded w-10" />
      </div>
    </div>
  );
}
