import React from 'react';

export type SwitchTheme = 'purple' | 'emerald' | 'blue';
export type SwitchSize = 'sm' | 'md';

export interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  label?: React.ReactNode;
  description?: React.ReactNode;
  badge?: React.ReactNode;
  theme?: SwitchTheme;
  size?: SwitchSize;
  title?: string;
  className?: string;
}

export const Switch: React.FC<SwitchProps> = ({
  checked,
  onChange,
  disabled = false,
  label,
  description,
  badge,
  theme = 'purple',
  size = 'md',
  title,
  className = '',
}) => {
  const activeBgClasses: Record<SwitchTheme, string> = {
    purple: 'bg-purple-600',
    emerald: 'bg-emerald-500',
    blue: 'bg-blue-600',
  };

  const trackSize = size === 'sm' ? 'h-4 w-7' : 'h-5 w-9';
  const thumbSize = size === 'sm' ? 'h-3 w-3' : 'h-4 w-4';
  const thumbTranslate =
    size === 'sm'
      ? checked
        ? 'translate-x-3'
        : 'translate-x-0'
      : checked
        ? 'translate-x-4'
        : 'translate-x-0';

  const switchButton = (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => !disabled && onChange(!checked)}
      title={title}
      className={`relative inline-flex ${trackSize} shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden disabled:opacity-40 disabled:cursor-not-allowed ${
        checked ? activeBgClasses[theme] : 'bg-white/10'
      }`}
    >
      <span
        className={`pointer-events-none inline-block ${thumbSize} transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${thumbTranslate}`}
      />
    </button>
  );

  if (!label && !description) {
    return switchButton;
  }

  return (
    <div
      className={`flex items-start justify-between gap-4 p-4 rounded-xl bg-[#1c2032] border border-white/5 transition-colors hover:border-white/10 ${className}`.trim()}
    >
      <div className="flex-1 min-w-0 pr-2">
        {label && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-white">{label}</span>
            {badge}
          </div>
        )}
        {description && (
          <p className="text-xs text-gray-400 leading-relaxed mt-1">{description}</p>
        )}
      </div>
      <div className="mt-1 shrink-0">{switchButton}</div>
    </div>
  );
};
