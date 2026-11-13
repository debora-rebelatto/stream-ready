import React, { useState } from 'react';
import { useWatchlist } from '../context/useAppContext';
import { FolderPlus, Trash2, Edit2, Check, X, Film, Info } from 'lucide-react';

interface ManageListsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const EMOJI_OPTIONS = ['🎬', '🍿', '👻', '💖', '🚀', '🏆', '🤠', '📺', '🔥', '⭐', '🧟', '🕵️', '🧠', '⚡'];

export const ManageListsModal: React.FC<ManageListsModalProps> = ({ isOpen, onClose }) => {
  const { customLists, createCustomList, updateCustomList, deleteCustomList } = useWatchlist();

  const [name, setName] = useState('');
  const [selectedEmoji, setSelectedEmoji] = useState('🎬');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [editingEmoji, setEditingEmoji] = useState('🎬');
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="bg-[#12131e] border border-white/10 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
              <FolderPlus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Suas Listas Personalizadas</h2>
              <p className="text-xs text-gray-400">Crie pastas para organizar seus filmes e vê-los no Stremio</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Create List Form */}
        <form onSubmit={handleCreate} className="bg-white/[0.03] border border-white/5 rounded-xl p-4 mb-6">
          <label className="block text-xs font-medium text-gray-300 mb-2">
            Criar Nova Lista
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
              placeholder="Ex: Terror, Fim de Semana, Oscar..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="flex-1 bg-[#1a1b2b] border border-white/10 rounded-xl px-3.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors"
            />

            <button
              type="submit"
              disabled={!name.trim() || isSubmitting}
              className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-sm font-medium rounded-xl hover:from-purple-500 hover:to-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-1.5 shadow-lg shadow-purple-900/30"
            >
              <FolderPlus className="w-4 h-4" />
              <span>Criar</span>
            </button>
          </div>
          <p className="text-[11px] text-gray-400 flex items-center gap-1">
            <Info className="w-3.5 h-3.5 text-purple-400 inline shrink-0" />
            Cada lista vira automaticamente um catálogo próprio no seu Stremio!
          </p>
        </form>

        {/* Existing Lists List */}
        <div>
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
            Listas Ativas ({customLists.length})
          </h3>

          <div className="max-h-60 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
            {customLists.length === 0 ? (
              <div className="py-8 text-center text-gray-500 bg-white/[0.01] border border-dashed border-white/5 rounded-xl">
                <Film className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">Você ainda não criou nenhuma lista personalizada.</p>
                <p className="text-xs text-gray-600 mt-0.5">Use o campo acima para criar sua primeira lista!</p>
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
                          className="p-1.5 text-green-400 hover:text-green-300 rounded-lg hover:bg-green-500/10 transition-colors"
                          title="Salvar"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors"
                          title="Cancelar"
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
                              {list.itemsCount ?? 0} {list.itemsCount === 1 ? 'filme' : 'filmes'}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleStartEdit(list.id, list.name, list.emoji)}
                            className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors"
                            title="Renomear"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`Tem certeza que deseja apagar a lista "${list.name}"? Os filmes continuarão na sua watchlist geral.`)) {
                                deleteCustomList(list.id);
                              }
                            }}
                            className="p-1.5 text-red-400/70 hover:text-red-400 rounded-lg hover:bg-red-500/10 transition-colors"
                            title="Apagar lista"
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

        {/* Footer */}
        <div className="mt-6 pt-4 border-t border-white/10 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-white/10 hover:bg-white/15 text-white text-sm font-medium rounded-xl transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
