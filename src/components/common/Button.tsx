import React from 'react';
import { Spinner, type SpinnerVariant } from './Spinner';

export type ButtonVariant =
  | 'primary' // Gradient purple-to-indigo with glow
  | 'solid' // Solid purple with shadow
  | 'secondary' // Dark card background with subtle border
  | 'outline' // Semi-transparent background with border
  | 'ghost' // Minimal background on hover
  | 'danger' // Rose tinted background & border
  | 'indigo' // Indigo tinted background & border
  | 'pill' // Filter pill buttons (list filters)
  | 'tab'; // Header status tab buttons (All, Ready, etc.)

export type ButtonSize = 'xs' | 'sm' | 'md' | 'lg';

export type TabTheme = 'blue' | 'emerald' | 'amber' | 'rose' | 'purple';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  active?: boolean;
  tabTheme?: TabTheme;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  badge?: React.ReactNode;
  isLoading?: boolean;
  isIconOnly?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'secondary',
  size = 'sm',
  active = false,
  tabTheme = 'purple',
  icon,
  iconPosition = 'left',
  badge,
  isLoading = false,
  isIconOnly = false,
  disabled,
  className = '',
  children,
  ...props
}) => {
  // Base classes for all buttons
  const baseClasses =
    'inline-flex items-center justify-center font-medium transition-all select-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed';

  // Normal text + icon size definitions
  const standardSizeClasses: Record<ButtonSize, string> = {
    xs: 'px-2 py-1 text-[11px] gap-1 rounded-lg',
    sm: 'px-3 py-1.5 text-xs gap-1.5 rounded-lg',
    md: 'px-4 py-2 text-xs font-semibold gap-2 rounded-xl',
    lg: 'px-6 py-3 text-sm font-bold gap-2.5 rounded-xl',
  };

  // Icon-only size definitions
  const iconOnlySizeClasses: Record<ButtonSize, string> = {
    xs: 'p-1 rounded-md text-xs',
    sm: 'p-1.5 rounded-lg text-xs',
    md: 'p-2 rounded-xl text-sm',
    lg: 'p-3 rounded-xl text-base',
  };

  const sizeClass = isIconOnly ? iconOnlySizeClasses[size] : standardSizeClasses[size];

  // Tab theme colors when active
  const tabActiveClasses: Record<TabTheme, string> = {
    blue: 'bg-blue-500/20 text-blue-300 border-blue-500/30 shadow-sm',
    emerald: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30 shadow-sm',
    amber: 'bg-amber-500/20 text-amber-300 border-amber-500/30 shadow-sm',
    rose: 'bg-rose-500/20 text-rose-300 border-rose-500/30 shadow-sm',
    purple: 'bg-purple-500/20 text-purple-300 border-purple-500/30 shadow-sm',
  };

  // Variant styling
  const getVariantClasses = (): string => {
    switch (variant) {
      case 'primary':
        return 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-md shadow-purple-900/30 border border-transparent';
      case 'solid':
        return 'bg-purple-600 hover:bg-purple-500 text-white shadow-md shadow-purple-900/30 border border-transparent';
      case 'secondary':
        return 'bg-[#1f2438] hover:bg-[#252b42] text-gray-200 border border-white/10 shadow-sm';
      case 'outline':
        return 'bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white border border-white/10';
      case 'ghost':
        return 'bg-transparent hover:bg-white/10 text-gray-400 hover:text-white border border-transparent';
      case 'danger':
        return 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 border border-rose-500/30';
      case 'indigo':
        return 'bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 hover:text-indigo-300 border border-indigo-500/20';
      case 'pill':
        return `rounded-xl whitespace-nowrap border border-transparent ${
          active
            ? 'bg-purple-600 text-white shadow-md shadow-purple-900/30'
            : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10'
        }`;
      case 'tab':
        return `rounded-lg font-semibold whitespace-nowrap border ${
          active
            ? tabActiveClasses[tabTheme]
            : 'border-transparent text-gray-400 hover:text-gray-200'
        }`;
      default:
        return 'bg-[#1f2438] text-gray-200';
    }
  };

  const spinnerVariant: SpinnerVariant =
    variant === 'primary' || variant === 'solid' || (variant === 'pill' && active)
      ? 'white'
      : variant === 'danger'
        ? 'current'
        : 'brand';

  const spinnerSize = size === 'lg' ? 'md' : size === 'xs' ? 'xs' : 'sm';

  return (
    <button
      disabled={disabled || isLoading}
      className={`${baseClasses} ${sizeClass} ${getVariantClasses()} ${className}`.trim()}
      {...props}
    >
      {isLoading ? (
        <Spinner size={spinnerSize} variant={spinnerVariant} decorative />
      ) : (
        icon && iconPosition === 'left' && <span className="shrink-0">{icon}</span>
      )}

      {children && <span>{children}</span>}

      {!isLoading && icon && iconPosition === 'right' && <span className="shrink-0">{icon}</span>}

      {badge !== undefined && badge !== null && (
        <span
          className={`text-[10px] px-1.5 py-0.5 rounded-full shrink-0 font-medium ${
            variant === 'pill'
              ? active
                ? 'bg-purple-800 text-purple-200'
                : 'bg-white/10 text-gray-400'
              : 'bg-white/10 text-gray-300'
          }`}
        >
          {badge}
        </span>
      )}
    </button>
  );
};
