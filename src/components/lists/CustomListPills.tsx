import React from 'react';
import { Folder, Sparkles, FolderPlus, X } from 'lucide-react';
import type { CustomList, WatchlistItem } from '../../models';
import { Button, ListIcon } from '../common';

interface CustomListPillsProps {
  items: WatchlistItem[];
  customLists: CustomList[];
  activeCustomListId: string | null;
  setActiveCustomListId: (id: string | null) => void;
  activeList?: CustomList;
  filteredCount: number;
  onOpenStandardLists: () => void;
  onOpenCustomLists: () => void;
}

export const CustomListPills: React.FC<CustomListPillsProps> = ({
  items,
  customLists,
  activeCustomListId,
  setActiveCustomListId,
  activeList,
  filteredCount,
  onOpenStandardLists,
  onOpenCustomLists,
}) => {
  return (
    <>
      <div className="flex items-center gap-2 overflow-x-auto pb-3 mb-4 scrollbar-none">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-400 shrink-0">
          <Folder size={14} className="text-purple-400" />
          <span>Lists:</span>
        </div>

        <Button
          variant="pill"
          active={activeCustomListId === null}
          onClick={() => setActiveCustomListId(null)}
        >
          All Lists
        </Button>

        {customLists.map((l) => {
          const count = items.filter(
            (i) => Array.isArray(i.customLists) && i.customLists.includes(l.id)
          ).length;
          const isSelected = activeCustomListId === l.id;
          return (
            <Button
              key={l.id}
              variant="pill"
              active={isSelected}
              onClick={() => setActiveCustomListId(isSelected ? null : l.id)}
              icon={<ListIcon icon={l.emoji} className="w-3.5 h-3.5" />}
              badge={count}
            >
              {l.name}
            </Button>
          );
        })}

        <Button
          variant="indigo"
          className="rounded-xl shrink-0"
          onClick={onOpenStandardLists}
          icon={<Sparkles size={13} />}
          title="Explore and add standard streaming lists (Netflix, Disney+, HBO Max, etc.)"
        >
          Standard Lists
        </Button>

        <Button
          variant="outline"
          className="rounded-xl text-purple-400 hover:text-purple-300 bg-purple-500/10 hover:bg-purple-500/20 border-purple-500/20 shrink-0"
          onClick={onOpenCustomLists}
          icon={<FolderPlus size={13} />}
          title="Create and manage custom lists"
        >
          + Custom List
        </Button>
      </div>

      {activeList && (
        <div className="mb-4 p-3 rounded-xl bg-purple-950/40 border border-purple-500/30 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-purple-200">
            <ListIcon icon={activeList.emoji} className="w-4 h-4 text-purple-300" />
            <span>
              Showing movies in list <strong>{activeList.name}</strong> ({filteredCount} movie
              {filteredCount === 1 ? '' : 's'})
            </span>
          </div>
          <button
            onClick={() => setActiveCustomListId(null)}
            className="inline-flex items-center gap-1 text-xs text-purple-400 hover:text-purple-200 font-semibold px-2 py-1 rounded-lg hover:bg-purple-500/10 transition-colors cursor-pointer"
          >
            <span>Show all movies</span>
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </>
  );
};
