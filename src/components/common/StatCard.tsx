import React from 'react';

export type StatCardTheme = 'neutral' | 'purple' | 'emerald' | 'amber' | 'blue' | 'rose';

export interface StatCardProps {
  label: React.ReactNode;
  value: React.ReactNode;
  subtitle?: React.ReactNode;
  icon?: React.ReactNode;
  theme?: StatCardTheme;
  pulseDot?: boolean;
  className?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  subtitle,
  icon,
  theme = 'neutral',
  pulseDot = false,
  className = '',
}) => {
  const containerClasses: Record<StatCardTheme, string> = {
    neutral: 'bg-[#151824] border-white/5',
    purple: 'bg-purple-500/5 border-purple-500/20',
    emerald: 'bg-emerald-500/5 border-emerald-500/20',
    amber: 'bg-amber-500/5 border-amber-500/20',
    blue: 'bg-blue-500/5 border-blue-500/20',
    rose: 'bg-rose-500/5 border-rose-500/20',
  };

  const headerColorClasses: Record<StatCardTheme, string> = {
    neutral: 'text-gray-400',
    purple: 'text-purple-400',
    emerald: 'text-emerald-400',
    amber: 'text-amber-400',
    blue: 'text-blue-400',
    rose: 'text-rose-400',
  };

  const valueColorClasses: Record<StatCardTheme, string> = {
    neutral: 'text-white',
    purple: 'text-purple-300',
    emerald: 'text-emerald-300',
    amber: 'text-amber-300',
    blue: 'text-blue-300',
    rose: 'text-rose-300',
  };

  const dotColorClasses: Record<StatCardTheme, string> = {
    neutral: 'bg-gray-400',
    purple: 'bg-purple-400',
    emerald: 'bg-emerald-400',
    amber: 'bg-amber-400',
    blue: 'bg-blue-400',
    rose: 'bg-rose-400',
  };

  return (
    <div
      className={`border rounded-2xl p-4 sm:p-5 shadow-sm ${containerClasses[theme]} ${className}`.trim()}
    >
      <div
        className={`flex items-center gap-2 text-xs font-semibold mb-1.5 ${headerColorClasses[theme]}`}
      >
        {pulseDot && (
          <span className={`w-2 h-2 rounded-full animate-pulse ${dotColorClasses[theme]}`} />
        )}
        {icon && <span className="shrink-0">{icon}</span>}
        <span className="truncate">{label}</span>
      </div>
      <div className={`text-2xl sm:text-3xl font-black tracking-tight ${valueColorClasses[theme]}`}>
        {value}
      </div>
      {subtitle && <div className="text-[11px] text-gray-400 mt-1">{subtitle}</div>}
    </div>
  );
};
