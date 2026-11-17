import React from 'react';
import { Play } from 'lucide-react';

export interface WatchInStremioButtonProps {
  movieId: string;
  isReady?: boolean;
  type?: 'movie' | 'series';
  label?: string;
  className?: string;
  onClick?: (e: React.MouseEvent) => void;
}

export const WatchInStremioButton: React.FC<WatchInStremioButtonProps> = ({
  movieId,
  isReady = false,
  type = 'movie',
  label,
  className = '',
  onClick,
}) => {
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onClick) {
      onClick(e);
      return;
    }
    const stremioWebLink = `https://web.stremio.com/#/detail/${type}/${movieId}/${movieId}`;
    window.open(stremioWebLink, '_blank', 'noopener,noreferrer');
  };

  const buttonText = label || (isReady ? 'Watch in Stremio' : 'Open in Stremio');

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`inline-flex items-center justify-center gap-1.5 px-4 sm:px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs sm:text-sm shadow-lg shadow-purple-900/30 transition-all cursor-pointer transform hover:-translate-y-0.5 active:translate-y-0 ${className}`}
      title={buttonText}
      aria-label={buttonText}
    >
      <Play size={13} fill="currentColor" />
      <span>{buttonText}</span>
    </button>
  );
};
