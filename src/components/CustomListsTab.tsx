import React from 'react';
import {
  FolderPlus,
  Trash2,
  Edit2,
  Check,
  X,
  Film,
  Info,
} from 'lucide-react';
import type { CustomList } from '../models';

interface CustomListsTabProps {
  customLists: CustomList[];
  name: string;
  setName: (v: string) => void;
  selectedEmoji: string;
  setSelectedEmoji: (v: string) => void;
  editingId: string | null;
  setEditingId: (id: string | null) => void;
  editingName: string;
  setEditingName: (v: string) => void;
  editingEmoji: string;
  setEditingEmoji: (v: string) => void;
  isSubmitting: boolean;
  emojiOptions: string[];
  onCreate: (e: React.FormEvent) => void;
  onStartEdit: (id: string, currentName: string, currentEmoji?: string) => void;
  onSaveEdit: (id: string) => void;
  onDeleteList: (id: string, listName: string) => void;
}

export const CustomListsTab: React.FC<CustomListsTabProps> = ({
  customLists,
  name,
  setName,
  selectedEmoji,
  setSelectedEmoji,
  editingId,
  setEditingId,
  editingName,
  setEditingName,
  editingEmoji,
  setEditingEmoji,
  isSubmitting,
  emojiOptions,
  onCreate,
  onStartEdit,
  onSaveEdit,
  onDeleteList,
}) => {
  return (
    <div className="space-y-4">
      <form
        onSubmit={onCreate}
        className="bg-white/[0.03] border border-white/5 rounded-xl p-4"
      >
        <label className="block text-xs font-medium text-gray-300 mb-2">
          Create New List
        </label>
        <div className="flex gap-2 mb-3">
          <div className="relative">
            <select
              value={selectedEmoji}
              onChange={(e) => setSelectedEmoji(e.target.value)}
              className="w-14 h-10 text-xl text-center bg-[#1a1b2b] border border-white/10 rounded-xl cursor-pointer hover:border-purple-500/50 transition-colors focus:outline-none focus:border-purple-500"
            >
              {emojiOptions.map((em) => (
                <option key={em} value={em}>
                  {em}
                </option>
              ))}
            </select>
          </div>

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
                        {emojiOptions.map((em) => (
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
                        onClick={() => onSaveEdit(list.id)}
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
                          <h4 className="text-sm font-medium text-white truncate">
                            {list.name}
                          </h4>
                          <p className="text-xs text-gray-400">
                            {list.itemsCount ?? 0}{' '}
                            {list.itemsCount === 1 ? 'movie' : 'movies'}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => onStartEdit(list.id, list.name, list.emoji)}
                          className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
                          title="Rename"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onDeleteList(list.id, list.name)}
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
  );
};
