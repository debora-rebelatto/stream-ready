import React from 'react';

export type SpinnerSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
export type SpinnerVariant = 'brand' | 'white' | 'dark' | 'current';

export interface SpinnerProps {
  size?: SpinnerSize;
  variant?: SpinnerVariant;
  label?: string;
  decorative?: boolean;
  className?: string;
}

const SIZE_CLASSES: Record<SpinnerSize, string> = {
  xs: 'w-3 h-3 border-2',
  sm: 'w-3.5 h-3.5 border-2',
  md: 'w-5 h-5 border-2',
  lg: 'w-8 h-8 border-[3px]',
  xl: 'w-10 h-10 border-[3px]',
};

const VARIANT_CLASSES: Record<SpinnerVariant, string> = {
  brand: 'border-purple-500/20 border-t-purple-400',
  white: 'border-white/25 border-t-white',
  dark: 'border-gray-200 border-t-purple-600',
  current: 'border-current/25 border-t-current',
};

export const Spinner: React.FC<SpinnerProps> = ({
  size = 'md',
  variant = 'brand',
  label = 'Loading...',
  decorative = false,
  className = '',
}) => {
  return (
    <span
      role={decorative ? undefined : 'status'}
      aria-label={decorative ? undefined : label}
      aria-hidden={decorative ? true : undefined}
      className={`inline-block shrink-0 rounded-full animate-spin ${SIZE_CLASSES[size]} ${VARIANT_CLASSES[variant]} ${className}`.trim()}
    />
  );
};
