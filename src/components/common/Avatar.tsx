import React from 'react';

export type AvatarStatus = 'online' | 'offline' | 'busy' | 'away';
export type AvatarSize = 'xs' | 'sm' | 'md' | 'lg';

export interface AvatarProps {
  name?: string;
  src?: string;
  size?: AvatarSize;
  status?: AvatarStatus;
  className?: string;
}

export const Avatar: React.FC<AvatarProps> = ({
  name = 'User',
  src,
  size = 'md',
  status,
  className = '',
}) => {
  const initials =
    name
      .trim()
      .split(/[\s@._-]+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() || '')
      .join('') || 'U';

  const sizeClasses: Record<AvatarSize, string> = {
    xs: 'w-6 h-6 text-[10px]',
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base',
  };

  const statusColorClasses: Record<AvatarStatus, string> = {
    online: 'bg-emerald-400',
    offline: 'bg-gray-500',
    busy: 'bg-rose-400',
    away: 'bg-amber-400',
  };

  return (
    <div className={`relative inline-flex items-center justify-center shrink-0 ${className}`.trim()}>
      {src ? (
        <img
          src={src}
          alt={name}
          className={`${sizeClasses[size]} rounded-full object-cover border border-white/15 bg-[#1f2438]`}
        />
      ) : (
        <div
          aria-label={name}
          className={`${sizeClasses[size]} rounded-full bg-linear-to-br from-purple-600 to-indigo-700 text-white font-bold flex items-center justify-center border border-white/15 select-none shadow-sm`}
        >
          {initials}
        </div>
      )}

      {status && (
        <span
          className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full ring-2 ring-[#0c0d14] ${statusColorClasses[status]}`}
        />
      )}
    </div>
  );
};
