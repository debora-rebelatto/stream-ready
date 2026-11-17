import React from 'react';
import {
  Info,
  Loader2,
  Check,
  Plus,
  ChevronDown,
  ChevronUp,
  Star,
} from 'lucide-react';
import type { CuratedList } from '../models';

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
        curatedLists.map((curated) => {
          const alreadyAdded = isListAlreadyAdded(curated);
          const isAdding = addingListId === curated.id;
          const isExpanded = expandedCuratedId === curated.id;

          return (
            <div
              key={curated.id}
              className="p-4 rounded-xl bg-white/[0.03] border border-white/5 hover:border-white/10 transition-all flex flex-col gap-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <span className="text-2xl shrink-0 p-2 rounded-xl bg-white/5 border border-white/10">
                    {curated.emoji}
                  </span>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-sm font-semibold text-white">{curated.name}</h3>
                      <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-white/10 text-gray-300">
                        {curated.badge}
                      </span>
                      <span className="text-xs text-gray-400">
                        {curated.items?.length || 0} movies
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">
                      {curated.description}
                    </p>
                  </div>
                </div>

                <div className="shrink-0 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onAddCurated(curated)}
                    disabled={isAdding}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer ${
                      alreadyAdded
                        ? 'bg-green-500/10 text-green-400 border border-green-500/20 hover:bg-green-500/20'
                        : 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:from-purple-500 hover:to-indigo-500 shadow-md shadow-purple-900/30'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    {isAdding ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Adding...</span>
                      </>
                    ) : alreadyAdded ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Added</span>
                      </>
                    ) : (
                      <>
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add to Account</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {curated.items && curated.items.length > 0 && (
                <div className="relative pt-1">
                  <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                    {curated.items.slice(0, 7).map((item) => (
                      <div
                        key={item.id}
                        className="w-14 h-20 rounded-lg overflow-hidden shrink-0 bg-white/5 border border-white/5 relative group cursor-pointer"
                        title={`${item.name} (${item.year || ''})`}
                        onClick={() => setExpandedCuratedId(isExpanded ? null : curated.id)}
                      >
                        {item.poster ? (
                          <img
                            src={item.poster}
                            alt={item.name}
                            className="w-full h-full object-cover transition-transform group-hover:scale-105"
                            loading="lazy"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-[10px] text-gray-500 text-center p-1">
                            {item.name}
                          </div>
                        )}
                      </div>
                    ))}

                    <button
                      type="button"
                      onClick={() => setExpandedCuratedId(isExpanded ? null : curated.id)}
                      className="h-20 px-3 rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 text-gray-400 hover:text-white text-xs flex flex-col items-center justify-center shrink-0 transition-colors cursor-pointer"
                    >
                      {isExpanded ? (
                        <>
                          <ChevronUp className="w-4 h-4 mb-0.5" />
                          <span>Hide</span>
                        </>
                      ) : (
                        <>
                          <ChevronDown className="w-4 h-4 mb-0.5" />
                          <span>View all ({curated.items.length})</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {isExpanded && (
                <div className="mt-2 pt-3 border-t border-white/5 space-y-1.5 animate-in fade-in">
                  <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
                    Movies included in {curated.name}:
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                    {curated.items.map((m) => (
                      <div
                        key={m.id}
                        className="flex items-center gap-2 p-1.5 rounded-lg bg-black/30 border border-white/5 text-xs text-gray-300"
                      >
                        {m.poster && (
                          <img
                            src={m.poster}
                            alt={m.name}
                            className="w-7 h-10 object-cover rounded shrink-0"
                          />
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="truncate font-medium text-white">{m.name}</div>
                          <div className="text-[11px] text-gray-400 flex items-center gap-2">
                            <span>{m.year}</span>
                            {m.imdbRating && (
                              <span className="flex items-center gap-0.5 text-amber-400">
                                <Star className="w-3 h-3 fill-amber-400" />
                                {m.imdbRating}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
};
