import React from 'react';

export type MovieCardActionVariant = 'purple' | 'emerald' | 'danger' | 'neutral';

export const MOVIE_CARD_ACTION_VARIANTS: Record<MovieCardActionVariant, string> = {
  purple: 'bg-purple-600/80 hover:bg-purple-500 text-white border-purple-400/40',
  emerald: 'bg-black/60 hover:bg-emerald-600 text-gray-300 hover:text-white border-white/20',
  danger: 'bg-black/60 hover:bg-red-500 text-gray-300 hover:text-white border-white/20',
  neutral: 'bg-black/60 hover:bg-white/20 text-gray-300 hover:text-white border-white/20',
};

export interface MovieCardActionButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: MovieCardActionVariant;
  icon?: React.ReactNode;
  stopPropagation?: boolean;
}

export const MovieCardActionButton: React.FC<MovieCardActionButtonProps> = ({
  variant = 'neutral',
  icon,
  stopPropagation = true,
  onClick,
  className = '',
  children,
  type = 'button',
  ...props
}) => {
  const baseClasses =
    'p-1.5 rounded-full backdrop-blur-md border transition-all cursor-pointer shadow-md disabled:opacity-50 disabled:cursor-not-allowed';

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (stopPropagation) {
      e.stopPropagation();
    }
    onClick?.(e);
  };

  return (
    <button
      type={type}
      onClick={handleClick}
      className={`${baseClasses} ${MOVIE_CARD_ACTION_VARIANTS[variant]} ${className}`.trim()}
      {...props}
    >
      {icon ?? children}
    </button>
  );
};
