import React from 'react';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?:
    | 'default'
    | 'primary'
    | 'success'
    | 'warning'
    | 'danger'
    | 'purple'
    | 'info'
    | 'neutral';
  size?: 'sm' | 'md';
  dot?: boolean;
}

const variantStyles = {
  default: 'bg-slate-800 text-slate-200 border-slate-700',
  primary: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
  success: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  warning: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  danger: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
  purple: 'bg-purple-500/15 text-purple-300 border-purple-500/30',
  info: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
  neutral: 'bg-slate-900/80 text-slate-400 border-slate-800',
};

const dotColors = {
  default: 'bg-slate-400',
  primary: 'bg-blue-400',
  success: 'bg-emerald-400',
  warning: 'bg-amber-400',
  danger: 'bg-rose-400',
  purple: 'bg-purple-400',
  info: 'bg-sky-400',
  neutral: 'bg-slate-500',
};

export function Badge({
  className = '',
  variant = 'default',
  size = 'md',
  dot = false,
  children,
  ...props
}: BadgeProps) {
  const sizeClass = size === 'sm' ? 'px-1.5 py-0.2 text-[10px]' : 'px-2 py-0.5 text-xs';

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-medium border font-mono tracking-tight ${variantStyles[variant]} ${sizeClass} ${className}`}
      {...props}
    >
      {dot && (
        <span
          className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotColors[variant]}`}
          aria-hidden="true"
        />
      )}
      {children}
    </span>
  );
}
