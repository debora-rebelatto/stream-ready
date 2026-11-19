import React from 'react';

export type CardVariant =
  | 'default'
  | 'elevated'
  | 'interactive'
  | 'purple'
  | 'emerald'
  | 'amber'
  | 'rose'
  | 'blue';

export type CardPadding = 'none' | 'sm' | 'md' | 'lg';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;
  padding?: CardPadding;
  header?: React.ReactNode;
  footer?: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({
  variant = 'default',
  padding = 'md',
  header,
  footer,
  className = '',
  children,
  ...props
}) => {
  const variantClasses: Record<CardVariant, string> = {
    default: 'bg-[#151824] border-white/5',
    elevated: 'bg-[#1f2438] border-white/10 shadow-md',
    interactive:
      'bg-[#151824] border-white/10 hover:border-white/25 hover:-translate-y-0.5 hover:shadow-xl transition-all cursor-pointer',
    purple: 'bg-purple-500/5 border-purple-500/25',
    emerald: 'bg-emerald-500/5 border-emerald-500/25',
    amber: 'bg-amber-500/5 border-amber-500/25',
    rose: 'bg-rose-500/5 border-rose-500/25',
    blue: 'bg-blue-500/5 border-blue-500/25',
  };

  const paddingClasses: Record<CardPadding, string> = {
    none: 'p-0',
    sm: 'p-3.5 sm:p-4',
    md: 'p-5 sm:p-6',
    lg: 'p-6 sm:p-8',
  };

  return (
    <div
      className={`border rounded-2xl shadow-sm ${variantClasses[variant]} ${paddingClasses[padding]} ${className}`.trim()}
      {...props}
    >
      {header && <div className="pb-3.5 mb-4 border-b border-white/10">{header}</div>}
      {children}
      {footer && <div className="pt-3.5 mt-4 border-t border-white/10">{footer}</div>}
    </div>
  );
};
