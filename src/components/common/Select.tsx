import React, { useId } from 'react';

export interface SelectOption {
  value: string | number;
  label: string;
}

export type SelectSize = 'sm' | 'md' | 'lg';

export interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'size'> {
  label?: string;
  options?: SelectOption[];
  size?: SelectSize;
  error?: string;
  helperText?: string;
  containerClassName?: string;
}

export const Select: React.FC<SelectProps> = ({
  label,
  options,
  size = 'md',
  error,
  helperText,
  className = '',
  containerClassName = '',
  id,
  children,
  ...props
}) => {
  const generatedId = useId();
  const selectId = id || generatedId;

  const sizeClasses: Record<SelectSize, string> = {
    sm: 'px-2.5 py-1 text-xs rounded-lg',
    md: 'px-3 py-2 text-xs rounded-xl',
    lg: 'px-4 py-2.5 text-sm rounded-xl',
  };

  return (
    <div className={`inline-flex flex-col ${containerClassName}`.trim()}>
      {label && (
        <label
          htmlFor={selectId}
          className="block text-xs font-medium text-gray-300 mb-1.5 select-none"
        >
          {label}
        </label>
      )}

      <select
        id={selectId}
        aria-invalid={Boolean(error)}
        className={`bg-[#1e2235] border ${
          error
            ? 'border-rose-500/60 focus:border-rose-500'
            : 'border-white/10 hover:border-white/20 focus:border-purple-500/60'
        } text-gray-200 focus:outline-none cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
          sizeClasses[size]
        } ${className}`.trim()}
        {...props}
      >
        {options
          ? options.map((opt) => (
              <option key={String(opt.value)} value={opt.value}>
                {opt.label}
              </option>
            ))
          : children}
      </select>

      {error ? (
        <p className="mt-1 text-[11px] text-rose-400">{error}</p>
      ) : (
        helperText && <p className="mt-1 text-[11px] text-gray-400">{helperText}</p>
      )}
    </div>
  );
};
