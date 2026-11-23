import React, { useState } from 'react';
import { useWatchlist } from '../context/useAppContext';
import type { CuratedList } from '../models';

export const EMOJI_OPTIONS = [
  'film',
  'popcorn',
  'ghost',
  'heart',
  'rocket',
  'trophy',
  'compass',
  'tv',
  'flame',
  'star',
  'skull',
  'search',
  'brain',
  'zap',
  'folder',
  'sparkles',
  'clapperboard',
];

const DEFAULT_LIST_ICON_KEY = 'film';

export function useManageListsController(initialTab: 'standard' | 'custom' = 'standard') {
  const {
    customLists,
    createCustomList,
    updateCustomList,
    deleteCustomList,
    curatedLists,
    addCuratedList,
    isCuratedListsLoading,
  } = useWatchlist();

  const [activeTab, setActiveTab] = useState<'standard' | 'custom'>(initialTab);
  const [name, setName] = useState('');
  const [selectedEmoji, setSelectedEmoji] = useState(DEFAULT_LIST_ICON_KEY);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [editingEmoji, setEditingEmoji] = useState(DEFAULT_LIST_ICON_KEY);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [addingListId, setAddingListId] = useState<string | null>(null);
  const [expandedCuratedId, setExpandedCuratedId] = useState<string | null>(null);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || isSubmitting) return;

    setIsSubmitting(true);
    const success = await createCustomList(name.trim(), selectedEmoji);
    setIsSubmitting(false);

    if (success) {
      setName('');
      setSelectedEmoji(DEFAULT_LIST_ICON_KEY);
    }
  };

  const handleStartEdit = (
    id: string,
    currentName: string,
    currentEmoji = DEFAULT_LIST_ICON_KEY
  ) => {
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
    if (addingListId || isListAlreadyAdded(list)) return;
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

  const handleDeleteList = (id: string, listName: string) => {
    if (
      confirm(
        `Are you sure you want to delete the list "${listName}"? All movies in this list will be removed from your watchlist.`
      )
    ) {
      deleteCustomList(id);
    }
  };

  return {
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
    emojiOptions: EMOJI_OPTIONS,
  };
}
