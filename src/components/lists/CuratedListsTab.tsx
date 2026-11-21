import React from 'react';
import { Info, Loader2 } from 'lucide-react';
import type { CuratedList } from '../../models';
import { CuratedListItemCard } from './CuratedListItemCard';

interface CuratedListsTabProps {
  curatedLists: CuratedList[];
  isCuratedListsLoading: boolean;
  addingListId: string | null;
  expandedCuratedId: string | null;
  setExpandedCuratedId: (id: string | null) => void;
  isListAlreadyAdded: (curated: CuratedList) => boolean;
  onAddCurated: (curated: CuratedList) => void;
}

export const CuratedListsTab: React.FC<CuratedListsTabProps> = ({
  curatedLists,
  isCuratedListsLoading,
  addingListId,
  expandedCuratedId,
  setExpandedCuratedId,
  isListAlreadyAdded,
  onAddCurated,
}) => {
  return (
    <div className="space-y-3">
      <div className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-xl text-xs text-purple-200 flex items-start gap-2.5">
        <Info className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold text-white">Preset Streaming Catalogs: </span>
          Add standardized lists like Netflix, Disney+, and HBO Max to your account. Each list
          automatically syncs to your Stremio home screen with quality release badges!
        </div>
      </div>

      {isCuratedListsLoading && curatedLists.length === 0 ? (
        <div className="py-12 flex flex-col items-center justify-center text-gray-400 gap-2">
          <Loader2 className="w-6 h-6 animate-spin text-purple-400" />
          <span className="text-xs">Loading standard lists...</span>
        </div>
      ) : (
        curatedLists.map((curated) => (
          <CuratedListItemCard
            key={curated.id}
            curated={curated}
            alreadyAdded={isListAlreadyAdded(curated)}
            isAdding={addingListId === curated.id}
            isExpanded={expandedCuratedId === curated.id}
            onToggleExpand={() =>
              setExpandedCuratedId(expandedCuratedId === curated.id ? null : curated.id)
            }
            onAdd={() => onAddCurated(curated)}
          />
        ))
      )}
    </div>
  );
};
