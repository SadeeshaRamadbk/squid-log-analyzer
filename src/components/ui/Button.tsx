import React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'primary' | 'danger' | 'ghost' | 'outline' | 'success';
  size?: 'xs' | 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

const variantStyles = {
  default:
    'bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700/80 shadow-sm',
  primary:
    'bg-indigo-600 hover:bg-indigo-500 text-white border border-indigo-500 shadow-sm shadow-indigo-500/25',
  danger:
    'bg-rose-600 hover:bg-rose-500 text-white border border-rose-500 shadow-sm shadow-rose-600/25',
  success:
    'bg-emerald-600 hover:bg-emerald-500 text-white border border-emerald-500 shadow-sm shadow-emerald-600/25',
  ghost:
    'bg-transparent hover:bg-slate-800/80 text-slate-300 hover:text-white border-transparent',
  outline:
    'bg-transparent hover:bg-slate-800/50 text-slate-300 hover:text-white border border-slate-700',
};

const sizeStyles = {
  xs: 'h-6 px-2 text-[11px] rounded-md gap-1',
  sm: 'h-7.5 px-2.5 text-xs rounded-lg gap-1.5',
  md: 'h-8.5 px-3.5 text-xs rounded-lg gap-2',
  lg: 'h-10 px-4 text-sm rounded-xl gap-2',
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = '', variant = 'default', size = 'sm', isLoading = false, disabled, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        aria-busy={isLoading}
        className={`inline-flex items-center justify-center font-medium transition-colors cursor-pointer select-none focus-visible:outline-2 focus-visible:outline-indigo-500 focus-visible:outline-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
        {...props}
      >
        {isLoading && (
          <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin shrink-0" />
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
