import React from 'react';
import { FolderPlus, X, Sparkles, Tv } from 'lucide-react';
import { useManageListsController } from '../controllers/useManageListsController';
import { CuratedListsTab } from './CuratedListsTab';
import { CustomListsTab } from './CustomListsTab';

interface ManageListsModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'standard' | 'custom';
}

export const ManageListsModal: React.FC<ManageListsModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'standard',
}) => {
  const {
    customLists,
    curatedLists,
    isCuratedListsLoading,
    activeTab,
    setActiveTab,
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
    addingListId,
    expandedCuratedId,
    setExpandedCuratedId,
    handleCreate,
    handleStartEdit,
    handleSaveEdit,
    handleAddCurated,
    isListAlreadyAdded,
    handleDeleteList,
    emojiOptions,
  } = useManageListsController(initialTab);

  if (!isOpen) return null;

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
              <p className="text-xs text-gray-400">
                Add standardized streaming lists or organize your own custom folders
              </p>
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
            <CuratedListsTab
              curatedLists={curatedLists}
              isCuratedListsLoading={isCuratedListsLoading}
              addingListId={addingListId}
              expandedCuratedId={expandedCuratedId}
              setExpandedCuratedId={setExpandedCuratedId}
              isListAlreadyAdded={isListAlreadyAdded}
              onAddCurated={handleAddCurated}
            />
          ) : (
            <CustomListsTab
              customLists={customLists}
              name={name}
              setName={setName}
              selectedEmoji={selectedEmoji}
              setSelectedEmoji={setSelectedEmoji}
              editingId={editingId}
              setEditingId={setEditingId}
              editingName={editingName}
              setEditingName={setEditingName}
              editingEmoji={editingEmoji}
              setEditingEmoji={setEditingEmoji}
              isSubmitting={isSubmitting}
              emojiOptions={emojiOptions}
              onCreate={handleCreate}
              onStartEdit={handleStartEdit}
              onSaveEdit={handleSaveEdit}
              onDeleteList={handleDeleteList}
            />
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
