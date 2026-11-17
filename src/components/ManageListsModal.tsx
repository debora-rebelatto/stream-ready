import React, { useState } from 'react';
import { useWatchlist } from '../context/useAppContext';
import {
  FolderPlus,
  Trash2,
  Edit2,
  Check,
  X,
  Film,
  Info,
  Sparkles,
  Plus,
  Loader2,
  ChevronDown,
  ChevronUp,
  Star,
  Tv
} from 'lucide-react';
import type { CuratedList } from '../types';

interface ManageListsModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'standard' | 'custom';
}

const EMOJI_OPTIONS = ['🎬', '🍿', '👻', '💖', '🚀', '🏆', '🤠', '📺', '🔥', '⭐', '🧟', '🕵️', '🧠', '⚡'];

export const ManageListsModal: React.FC<ManageListsModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'standard'
}) => {
  const {
    customLists,
    createCustomList,
    updateCustomList,
    deleteCustomList,
    curatedLists,
    addCuratedList,
    isCuratedListsLoading
  } = useWatchlist();

  const [activeTab, setActiveTab] = useState<'standard' | 'custom'>(initialTab);
  const [name, setName] = useState('');
  const [selectedEmoji, setSelectedEmoji] = useState('🎬');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [editingEmoji, setEditingEmoji] = useState('🎬');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [addingListId, setAddingListId] = useState<string | null>(null);
  const [expandedCuratedId, setExpandedCuratedId] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || isSubmitting) return;

    setIsSubmitting(true);
    const success = await createCustomList(name.trim(), selectedEmoji);
    setIsSubmitting(false);

    if (success) {
      setName('');
      setSelectedEmoji('🎬');
    }
  };

  const handleStartEdit = (id: string, currentName: string, currentEmoji = '🎬') => {
    setEditingId(id);
    setEditingName(currentName);
    setEditingEmoji(currentEmoji);
  };

  const handleSaveEdit = async (id: string) => {
    if (!editingName.trim()) return;
    await updateCustomList(id, editingName.trim(), editingEmoji);
    setEditingId(null);
  };

  const handleAddCurated = async (list: CuratedList) => {
    if (addingListId) return;
    setAddingListId(list.id);
    try {
      await addCuratedList(list.id);
    } finally {
      setAddingListId(null);
    }
  };

  const isListAlreadyAdded = (curated: CuratedList) => {
    if (curated.isAdded) return true;
    const targetName = curated.name.trim().toLowerCase();
    return customLists.some((cl) => cl.name.trim().toLowerCase() === targetName);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="bg-[#12131e] border border-white/10 rounded-2xl max-w-2xl w-full p-6 shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
              <FolderPlus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Watchlist Catalogs & Lists</h2>
              <p className="text-xs text-gray-400">Add standardized streaming lists or organize your own custom folders</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 p-1 bg-white/[0.04] border border-white/5 rounded-xl mb-4 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('standard')}
            className={`flex-1 py-2 px-3 rounded-lg text-xs font-medium flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeTab === 'standard'
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-900/30 font-semibold'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Standard Lists ({curatedLists.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('custom')}
            className={`flex-1 py-2 px-3 rounded-lg text-xs font-medium flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeTab === 'custom'
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-900/30 font-semibold'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <FolderPlus className="w-3.5 h-3.5" />
            <span>My Custom Lists ({customLists.length})</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-4 custom-scrollbar">
          {activeTab === 'standard' ? (
            /* STANDARD LISTS TAB */
            <div className="space-y-3">
              <div className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-xl text-xs text-purple-200 flex items-start gap-2.5">
                <Info className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-white">Preset Streaming Catalogs: </span>
                  Add standardized lists like Netflix, Disney+, and HBO Max to your account.
                  Each list automatically syncs to your Stremio home screen with quality release badges!
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
                      {/* Top Row: Title, Platform Badge, and Action Button */}
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

                        {/* Action Button */}
                        <div className="shrink-0 flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleAddCurated(curated)}
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

                      {/* Poster Preview Strip */}
                      {curated.items && curated.items.length > 0 && (
                        <div className="relative pt-1">
                          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                            {curated.items.slice(0, 7).map((item) => (
                              <div
                                key={item.id}
                                className="w-14 h-20 rounded-lg overflow-hidden shrink-0 bg-white/5 border border-white/5 relative group cursor-pointer"
                                title={`${item.name} (${item.year || ''})`}
                                onClick={() =>
                                  setExpandedCuratedId(isExpanded ? null : curated.id)
                                }
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
                              onClick={() =>
                                setExpandedCuratedId(isExpanded ? null : curated.id)
                              }
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

                      {/* Expanded View: Movie Details */}
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
          ) : (
            /* MY CUSTOM LISTS TAB */
            <div className="space-y-4">
              {/* Create List Form */}
              <form onSubmit={handleCreate} className="bg-white/[0.03] border border-white/5 rounded-xl p-4">
                <label className="block text-xs font-medium text-gray-300 mb-2">
                  Create New List
                </label>
                <div className="flex gap-2 mb-3">
                  {/* Emoji Selector */}
                  <div className="relative">
                    <select
                      value={selectedEmoji}
                      onChange={(e) => setSelectedEmoji(e.target.value)}
                      className="w-14 h-10 text-xl text-center bg-[#1a1b2b] border border-white/10 rounded-xl cursor-pointer hover:border-purple-500/50 transition-colors focus:outline-none focus:border-purple-500"
                    >
                      {EMOJI_OPTIONS.map((em) => (
                        <option key={em} value={em}>
                          {em}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* List Name Input */}
                  <input
                    type="text"
                    placeholder="e.g. Horror, Weekend, Oscar..."
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="flex-1 bg-[#1a1b2b] border border-white/10 rounded-xl px-3.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors"
                  />

                  <button
                    type="submit"
                    disabled={!name.trim() || isSubmitting}
                    className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-sm font-medium rounded-xl hover:from-purple-500 hover:to-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-1.5 shadow-lg shadow-purple-900/30 cursor-pointer"
                  >
                    <FolderPlus className="w-4 h-4" />
                    <span>Create</span>
                  </button>
                </div>
                <p className="text-[11px] text-gray-400 flex items-center gap-1">
                  <Info className="w-3.5 h-3.5 text-purple-400 inline shrink-0" />
                  Each list automatically becomes its own catalog in your Stremio app!
                </p>
              </form>

              {/* Existing Lists List */}
              <div>
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                  Active Lists ({customLists.length})
                </h3>

                <div className="space-y-2 pr-1">
                  {customLists.length === 0 ? (
                    <div className="py-8 text-center text-gray-500 bg-white/[0.01] border border-dashed border-white/5 rounded-xl">
                      <Film className="w-8 h-8 mx-auto mb-2 opacity-30" />
                      <p className="text-sm">You haven't created any custom lists yet.</p>
                      <p className="text-xs text-gray-600 mt-0.5">
                        Use the input above to create a list, or add one of the Standard Lists!
                      </p>
                    </div>
                  ) : (
                    customLists.map((list) => {
                      const isEditing = editingId === list.id;
                      return (
                        <div
                          key={list.id}
                          className="flex items-center justify-between p-3 rounded-xl bg-white/[0.03] border border-white/5 hover:border-white/10 transition-colors"
                        >
                          {isEditing ? (
                            <div className="flex items-center gap-2 flex-1 mr-2">
                              <select
                                value={editingEmoji}
                                onChange={(e) => setEditingEmoji(e.target.value)}
                                className="w-12 h-8 text-lg text-center bg-[#1a1b2b] border border-white/10 rounded-lg cursor-pointer"
                              >
                                {EMOJI_OPTIONS.map((em) => (
                                  <option key={em} value={em}>
                                    {em}
                                  </option>
                                ))}
                              </select>
                              <input
                                type="text"
                                value={editingName}
                                onChange={(e) => setEditingName(e.target.value)}
                                className="flex-1 bg-[#1a1b2b] border border-white/10 rounded-lg px-2.5 py-1 text-sm text-white focus:outline-none focus:border-purple-500"
                              />
                              <button
                                onClick={() => handleSaveEdit(list.id)}
                                className="p-1.5 text-green-400 hover:text-green-300 rounded-lg hover:bg-green-500/10 transition-colors cursor-pointer"
                                title="Save"
                              >
                                <Check className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => setEditingId(null)}
                                className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
                                title="Cancel"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ) : (
                            <>
                              <div className="flex items-center gap-2.5 min-w-0">
                                <span className="text-xl shrink-0">{list.emoji || '🎬'}</span>
                                <div className="min-w-0">
                                  <h4 className="text-sm font-medium text-white truncate">{list.name}</h4>
                                  <p className="text-xs text-gray-400">
                                    {list.itemsCount ?? 0} {list.itemsCount === 1 ? 'movie' : 'movies'}
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => handleStartEdit(list.id, list.name, list.emoji)}
                                  className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
                                  title="Rename"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => {
                                    if (
                                      confirm(
                                        `Are you sure you want to delete the list "${list.name}"? All movies in this list will be removed from your watchlist.`
                                      )
                                    ) {
                                      deleteCustomList(list.id);
                                    }
                                  }}
                                  className="p-1.5 text-red-400/70 hover:text-red-400 rounded-lg hover:bg-red-500/10 transition-colors cursor-pointer"
                                  title="Delete list"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-4 pt-3 border-t border-white/10 flex justify-between items-center shrink-0">
          <div className="text-xs text-gray-400 flex items-center gap-1.5">
            <Tv className="w-3.5 h-3.5 text-purple-400" />
            <span>Catalogs appear in Stremio automatically upon reload</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-white/10 hover:bg-white/15 text-white text-sm font-medium rounded-xl transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
