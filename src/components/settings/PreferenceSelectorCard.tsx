import React from 'react';
import { Check } from 'lucide-react';
import { Badge, type BadgeVariant } from '../common';

export interface PreferenceOption<T extends string> {
  value: T;
  badgeLabel: string;
  badgeVariant: BadgeVariant;
  title: string;
  activeCardClass: string;
  activeLabelClass: string;
  description: React.ReactNode;
}

export interface PreferenceSelectorCardProps<T extends string> {
  icon: React.ReactNode;
  iconContainerClass: string;
  title: string;
  subtitle: string;
  options: PreferenceOption<T>[];
  value: T;
  onChange: (value: T) => void;
  columns?: 2 | 3;
}

export function PreferenceSelectorCard<T extends string>({
  icon,
  iconContainerClass,
  title,
  subtitle,
  options,
  value,
  onChange,
  columns = 2,
}: PreferenceSelectorCardProps<T>) {
  const gridColsClass = columns === 3 ? 'sm:grid-cols-3' : 'sm:grid-cols-2';

  return (
    <div className="bg-[#151824] border border-white/5 rounded-2xl p-5 sm:p-6 shadow-sm space-y-4">
      <div className="flex items-center gap-2.5 pb-3 border-b border-white/10">
        <div className={`p-2 rounded-xl ${iconContainerClass}`}>{icon}</div>
        <div>
          <h2 className="text-base font-bold text-white tracking-tight">{title}</h2>
          <p className="text-xs text-gray-400">{subtitle}</p>
        </div>
      </div>

      <div className={`grid grid-cols-1 ${gridColsClass} gap-4 pt-2`}>
        {options.map((option) => {
          const isActive = value === option.value;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onChange(option.value)}
              className={`p-4 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-3 ${
                isActive
                  ? option.activeCardClass
                  : 'bg-[#1a1e2e] border-white/5 text-gray-400 hover:text-white hover:border-white/15'
              }`}
            >
              <div className="flex items-center justify-between w-full gap-2">
                <div className="flex items-center gap-2">
                  <Badge variant={option.badgeVariant} size="xs">
                    {option.badgeLabel}
                  </Badge>
                  <span className="font-bold text-sm text-white">{option.title}</span>
                </div>
                {isActive && (
                  <span
                    className={`${option.activeLabelClass} text-xs font-semibold flex items-center gap-1 shrink-0`}
                  >
                    <Check size={14} /> Active
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-400 leading-relaxed">{option.description}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
