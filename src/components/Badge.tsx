import React from 'react';

export type BadgeVariant =
  'purple' | 'emerald' | 'amber' | 'rose' | 'blue' | 'neutral' | 'gradient';

export type BadgeSize = 'xs' | 'sm' | 'md' | 'lg';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  size?: BadgeSize;
  pill?: boolean;
  uppercase?: boolean;
  icon?: React.ReactNode;
  dot?: boolean;
  pulse?: boolean;
}

export const Badge: React.FC<BadgeProps> = ({
  variant = 'purple',
  size = 'sm',
  pill = false,
  uppercase = false,
  icon,
  dot = false,
  pulse = false,
  className = '',
  children,
  ...props
}) => {
  const baseClasses =
    'inline-flex items-center gap-1 font-semibold border select-none transition-colors tracking-wide';

  const shapeClasses = pill ? 'rounded-full' : 'rounded-md';

  const sizeClasses: Record<BadgeSize, string> = {
    xs: 'text-[9px] px-1.5 py-0.25 tracking-wider',
    sm: 'text-[10px] px-2 py-0.5',
    md: 'text-xs px-2.5 py-0.75',
    lg: 'text-xs px-3.5 py-1.5 font-bold',
  };

  const variantClasses: Record<BadgeVariant, string> = {
    purple: 'bg-purple-500/15 text-purple-300 border-purple-500/30 shadow-xs',
    emerald: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30 shadow-xs',
    amber: 'bg-amber-500/15 text-amber-300 border-amber-500/30 shadow-xs',
    rose: 'bg-rose-500/15 text-rose-300 border-rose-500/30 shadow-xs',
    blue: 'bg-blue-500/15 text-blue-300 border-blue-500/30 shadow-xs',
    neutral: 'bg-white/10 text-gray-300 border-white/10 shadow-xs',
    gradient:
      'bg-gradient-to-r from-red-600 via-amber-500 to-yellow-400 text-white border-amber-300 shadow-md',
  };

  const dotColorClasses: Record<BadgeVariant, string> = {
    purple: 'bg-purple-400',
    emerald: 'bg-emerald-400',
    amber: 'bg-amber-400',
    rose: 'bg-rose-400',
    blue: 'bg-blue-400',
    neutral: 'bg-gray-400',
    gradient: 'bg-yellow-200',
  };

  return (
    <span
      className={`
        ${baseClasses}
        ${shapeClasses}
        ${sizeClasses[size]}
        ${variantClasses[variant]}
        ${uppercase ? 'uppercase font-bold' : ''}
        ${pulse ? 'animate-pulse' : ''}
        ${className}
      `.trim()}
      {...props}
    >
      {dot && (
        <span
          className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotColorClasses[variant]} ${
            pulse ? 'animate-ping' : ''
          }`}
        />
      )}
      {icon && <span className="shrink-0">{icon}</span>}
      {children && <span>{children}</span>}
    </span>
  );
};
