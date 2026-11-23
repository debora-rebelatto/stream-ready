import React from 'react';
import { Spinner, type SpinnerSize, type SpinnerVariant } from './Spinner';

export type LoadingStateVariant = 'section' | 'fullscreen' | 'compact' | 'inline';

export interface LoadingStateProps {
  variant?: LoadingStateVariant;
  title?: React.ReactNode;
  description?: React.ReactNode;
  size?: SpinnerSize;
  spinnerVariant?: SpinnerVariant;
  className?: string;
}

const DEFAULT_SPINNER_SIZE: Record<LoadingStateVariant, SpinnerSize> = {
  fullscreen: 'xl',
  section: 'lg',
  compact: 'md',
  inline: 'sm',
};

const CONTAINER_CLASSES: Record<LoadingStateVariant, string> = {
  fullscreen: 'min-h-screen flex flex-col items-center justify-center bg-[#0c0d14] text-center px-4',
  section: 'py-16 sm:py-20 text-center flex flex-col items-center justify-center px-4',
  compact: 'py-10 text-center flex flex-col items-center justify-center px-4',
  inline: 'inline-flex items-center justify-center gap-2 py-4 px-4 text-center',
};

export const LoadingState: React.FC<LoadingStateProps> = ({
  variant = 'section',
  title,
  description,
  size,
  spinnerVariant = 'brand',
  className = '',
}) => {
  const resolvedSize = size ?? DEFAULT_SPINNER_SIZE[variant];
  const isFullscreen = variant === 'fullscreen';
  const isInline = variant === 'inline';

  return (
    <div
      role="status"
      aria-live="polite"
      className={`${CONTAINER_CLASSES[variant]} ${className}`.trim()}
    >
      <Spinner
        size={resolvedSize}
        variant={spinnerVariant}
        decorative={Boolean(title)}
        className={isInline ? '' : isFullscreen ? 'mb-4' : 'mb-3'}
      />
      {title && (
        <p
          className={
            isFullscreen
              ? 'text-sm font-medium text-gray-300'
              : 'text-xs font-medium text-gray-400'
          }
        >
          {title}
        </p>
      )}
      {description && !isInline && (
        <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">{description}</p>
      )}
    </div>
  );
};
