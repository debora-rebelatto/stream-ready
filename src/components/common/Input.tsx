import React, { useId } from 'react';
import { X } from 'lucide-react';

export type InputSize = 'sm' | 'md' | 'lg';

export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string;
  helperText?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  rightElement?: React.ReactNode;
  onClear?: () => void;
  size?: InputSize;
  containerClassName?: string;
}

export const Input: React.FC<InputProps> = ({
  label,
  helperText,
  error,
  leftIcon,
  rightElement,
  onClear,
  size = 'md',
  className = '',
  containerClassName = '',
  id,
  value,
  disabled,
  ...props
}) => {
  const generatedId = useId();
  const inputId = id || generatedId;

  const sizeClasses: Record<InputSize, string> = {
    sm: 'py-1.5 text-xs rounded-lg',
    md: 'py-2 text-xs sm:text-sm rounded-xl',
    lg: 'py-3 text-sm rounded-2xl',
  };

  const paddingLeft = leftIcon ? (size === 'lg' ? 'pl-11' : 'pl-9') : 'pl-3.5';
  const paddingRight = onClear || rightElement ? 'pr-9' : 'pr-3.5';

  return (
    <div className={`w-full ${containerClassName}`.trim()}>
      {label && (
        <label
          htmlFor={inputId}
          className="block text-xs font-medium text-gray-300 mb-1.5 select-none"
        >
          {label}
        </label>
      )}

      <div className="relative flex items-center">
        {leftIcon && (
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none flex items-center">
            {leftIcon}
          </span>
        )}

        <input
          id={inputId}
          value={value}
          disabled={disabled}
          aria-invalid={Boolean(error)}
          className={`w-full bg-[#1e2235] border ${
            error
              ? 'border-rose-500/60 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20'
              : 'border-white/10 focus:border-purple-500/70 focus:ring-2 focus:ring-purple-500/20'
          } text-white placeholder-gray-500 focus:outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
            sizeClasses[size]
          } ${paddingLeft} ${paddingRight} ${className}`.trim()}
          {...props}
        />

        {onClear && value && !disabled ? (
          <button
            type="button"
            onClick={onClear}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors cursor-pointer"
            aria-label="Clear input"
            title="Clear"
          >
            <X size={13} />
          </button>
        ) : (
          rightElement && (
            <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center">
              {rightElement}
            </div>
          )
        )}
      </div>

      {error ? (
        <p className="mt-1.5 text-[11px] text-rose-400 font-medium">{error}</p>
      ) : (
        helperText && <p className="mt-1.5 text-[11px] text-gray-400">{helperText}</p>
      )}
    </div>
  );
};
