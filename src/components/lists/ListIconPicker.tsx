import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import { ListIcon, LIST_ICON_OPTIONS } from '../common';

interface ListIconPickerProps {
  value: string;
  onChange: (iconKey: string) => void;
  size?: 'sm' | 'md';
}

export const ListIconPicker: React.FC<ListIconPickerProps> = ({
  value,
  onChange,
  size = 'md',
}) => {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleOutsideClick = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [open]);

  const buttonClasses =
    size === 'sm'
      ? 'h-8 px-2 rounded-lg text-purple-300'
      : 'h-10 px-2.5 rounded-xl text-purple-300';

  return (
    <div ref={containerRef} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-label="Choose list icon"
        aria-expanded={open}
        className={`flex items-center justify-center gap-1 bg-[#1a1b2b] border border-white/10 hover:border-purple-500/50 transition-colors focus:outline-none focus:border-purple-500 cursor-pointer ${buttonClasses}`}
      >
        <ListIcon icon={value} className={size === 'sm' ? 'w-4 h-4' : 'w-4.5 h-4.5'} />
        <ChevronDown className="w-3 h-3 text-gray-400" />
      </button>

      {open && (
        <div
          role="listbox"
          aria-label="List icons"
          className="absolute left-0 top-full mt-1.5 z-50 w-56 p-2 rounded-xl bg-[#151726] border border-white/15 shadow-2xl grid grid-cols-6 gap-1"
        >
          {LIST_ICON_OPTIONS.map(({ key, label, Icon }) => {
            const isSelected = value === key;
            return (
              <button
                key={key}
                type="button"
                title={label}
                aria-label={label}
                onClick={() => {
                  onChange(key);
                  setOpen(false);
                }}
                className={`p-2 rounded-lg flex items-center justify-center transition-colors cursor-pointer ${
                  isSelected
                    ? 'bg-purple-600/30 text-purple-200 border border-purple-500/50'
                    : 'text-gray-400 hover:text-white hover:bg-white/10 border border-transparent'
                }`}
              >
                <Icon className="w-4 h-4" />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
