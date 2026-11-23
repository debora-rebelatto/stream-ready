import React, { useEffect } from 'react';
import { Check, X } from 'lucide-react';
import type { CustomList } from '../../models';

export interface MovieCardListMenuProps {
  isOpen: boolean;
  customLists: CustomList[];
  itemCustomListIds: string[];
  onToggleList: (listId: string) => void;
  onClose: () => void;
}

export const MovieCardListMenu: React.FC<MovieCardListMenuProps> = ({
  isOpen,
  customLists,
  itemCustomListIds,
  onToggleList,
  onClose,
}) => {
  useEffect(() => {
    if (!isOpen) return;
    const handleOutsideClick = () => onClose();
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('click', handleOutsideClick);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('click', handleOutsideClick);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      className="absolute top-11 left-2 right-2 z-40 bg-[#141726]/95 border border-purple-500/30 rounded-xl p-2.5 shadow-2xl backdrop-blur-xl animate-in fade-in duration-150"
      role="dialog"
      aria-label="Organize in custom lists"
    >
      <div className="text-[11px] font-semibold text-gray-300 px-1 py-1 border-b border-white/10 mb-2 flex items-center justify-between">
        <span className="truncate font-medium">Add to list</span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close list menu"
          className="text-gray-400 hover:text-white p-0.5 rounded hover:bg-white/10 transition-colors cursor-pointer"
        >
          <X size={12} />
        </button>
      </div>

      {customLists.length === 0 ? (
        <div className="p-2 text-center text-xs text-gray-400">
          No lists yet. Create one in the top navbar.
        </div>
      ) : (
        <div className="max-h-44 overflow-y-auto space-y-1 custom-scrollbar">
          {customLists.map((list) => {
            const inList = itemCustomListIds.includes(list.id);
            return (
              <button
                key={list.id}
                type="button"
                onClick={() => onToggleList(list.id)}
                className={`w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-xs transition-colors text-left cursor-pointer ${
                  inList
                    ? 'bg-purple-500/25 text-purple-200 font-semibold'
                    : 'text-gray-300 hover:bg-white/5'
                }`}
              >
                <span className="flex items-center gap-1.5 truncate">
                  <span className="text-sm shrink-0">{list.emoji || '🎬'}</span>
                  <span className="truncate">{list.name}</span>
                </span>
                {inList && <Check size={13} className="text-purple-400 shrink-0 ml-1" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
