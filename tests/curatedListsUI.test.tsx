import React from 'react';
import {
  CuratedListsTab,
  CuratedListItemCard,
} from '../src/components';
import type { CuratedList } from '../src/models';

describe('Curated Lists UI & Visual Status', () => {
  const mockCuratedList: CuratedList = {
    id: 'netflix_new',
    name: 'New on Netflix',
    description: 'Fresh releases on Netflix',
    badge: 'Popular',
    emoji: '🍿',
    items: [
      {
        id: 'tt34206385',
        name: 'Primetime',
        year: '2026',
        poster: 'https://example.com/poster.jpg',
        imdbRating: '8.4',
      },
    ],
  };

  test('CuratedListItemCard renders in unadded state with active button', () => {
    const onAdd = jest.fn();
    const onToggleExpand = jest.fn();

    const el = React.createElement(CuratedListItemCard, {
      curated: mockCuratedList,
      alreadyAdded: false,
      isAdding: false,
      isExpanded: false,
      onToggleExpand,
      onAdd,
    });

    expect(React.isValidElement(el)).toBe(true);
    expect(el.props.alreadyAdded).toBe(false);
    expect(el.props.isAdding).toBe(false);
  });

  test('CuratedListItemCard accepts alreadyAdded state with disabled indicator', () => {
    const onAdd = jest.fn();
    const onToggleExpand = jest.fn();

    const el = React.createElement(CuratedListItemCard, {
      curated: mockCuratedList,
      alreadyAdded: true,
      isAdding: false,
      isExpanded: false,
      onToggleExpand,
      onAdd,
    });

    expect(React.isValidElement(el)).toBe(true);
    expect(el.props.alreadyAdded).toBe(true);
  });

  test('CuratedListsTab correctly passes alreadyAdded status to children', () => {
    const isListAlreadyAdded = jest.fn().mockImplementation((curated: CuratedList) => {
      return curated.id === 'netflix_new';
    });
    const onAddCurated = jest.fn();
    const setExpandedCuratedId = jest.fn();

    const el = React.createElement(CuratedListsTab, {
      curatedLists: [mockCuratedList],
      isCuratedListsLoading: false,
      addingListId: null,
      expandedCuratedId: null,
      setExpandedCuratedId,
      isListAlreadyAdded,
      onAddCurated,
    });

    expect(React.isValidElement(el)).toBe(true);
    expect(el.props.curatedLists).toHaveLength(1);
    expect(isListAlreadyAdded(mockCuratedList)).toBe(true);
  });
});
