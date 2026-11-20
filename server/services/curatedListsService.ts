import { createRequire } from 'module';
const req = createRequire(import.meta.url);
const db = req('../../lib/db');
const curatedDataRaw = req('./curatedListsData.json');

import type { CuratedList } from '../types/index.ts';

import fs from 'fs';
import path from 'path';

export function loadCuratedListsData(): CuratedList[] {
  try {
    const dir = typeof __dirname !== 'undefined' ? __dirname : path.resolve('lib');
    const dataPath = path.join(dir, 'curatedListsData.json');
    if (fs.existsSync(dataPath)) {
      const content = fs.readFileSync(dataPath, 'utf8');
      return JSON.parse(content);
    }
  } catch (err) {
    console.warn('[CuratedLists] Failed to load curatedListsData.json from disk, using bundled fallback:', err);
  }
  return Array.isArray(curatedDataRaw) ? curatedDataRaw : [];
}

export function getCuratedLists(
  userCustomLists?: Array<{ id: string; name: string; emoji?: string }>
): CuratedList[] {
  const lists = loadCuratedListsData();
  const existingNames = new Set(
    (userCustomLists || []).map((l) => (l.name || '').trim().toLowerCase())
  );

  return lists.map((l) => ({
    ...l,
    itemsCount: l.items ? l.items.length : 0,
    isAdded: existingNames.has((l.name || '').trim().toLowerCase()),
  }));
}

export function getCuratedListById(id: string): CuratedList | null {
  const lists = loadCuratedListsData();
  return lists.find((l) => l.id === id) || null;
}

export async function addCuratedListToUser(
  userId: string,
  listId: string,
  database: any = db,
  checkMovieQualityFn?: (id: string, type: string, name: string) => Promise<any>
): Promise<{
  success: boolean;
  list: any;
  addedMoviesCount: number;
  existingMoviesCount: number;
}> {
  if (!userId) {
    throw new Error('User identifier is required');
  }

  const curated = getCuratedListById(listId);
  if (!curated) {
    throw new Error(`Curated list with ID "${listId}" not found`);
  }

  const userLists = database.getCustomLists(userId) || [];
  let targetList = userLists.find(
    (l: any) => (l.name || '').trim().toLowerCase() === curated.name.trim().toLowerCase()
  );

  if (!targetList) {
    targetList = await database.createCustomList(userId, {
      name: curated.name,
      emoji: curated.emoji || '',
    });
  }

  const targetListId = targetList.id;
  let addedMoviesCount = 0;
  let existingMoviesCount = 0;
  const operations: Promise<any>[] = [];

  for (const item of curated.items) {
    const existing = database.getItem(item.id, userId);

    if (existing) {
      existingMoviesCount++;
      const currentCustomLists: string[] = Array.isArray(existing.customLists)
        ? [...existing.customLists]
        : [];

      if (!currentCustomLists.includes(targetListId)) {
        currentCustomLists.push(targetListId);
        operations.push(
          Promise.resolve(database.updateItem(item.id, { customLists: currentCustomLists }, userId))
        );
      }
    } else {
      addedMoviesCount++;
      const newItem = {
        id: item.id,
        type: 'movie',
        name: item.name,
        year: item.year,
        poster: item.poster,
        banner: item.banner,
        genres: item.genres || [],
        description: item.description || '',
        imdbRating: item.imdbRating ? String(item.imdbRating) : '',
        has1080pPlus: false,
        bestQuality: 'Pending',
        streamCount: 0,
        customLists: [targetListId],
      };

      operations.push(
        Promise.resolve(database.addItem(newItem, userId)).then(() => {
          if (typeof checkMovieQualityFn === 'function') {
            checkMovieQualityFn(item.id, 'movie', item.name)
              .then((q) => {
                if (q) {
                  database.updateItem(
                    item.id,
                    {
                      has1080pPlus: q.has1080pPlus,
                      bestQuality: q.bestQuality,
                      streamCount: q.streamCount,
                      lastChecked: q.checkedAt,
                    },
                    userId
                  );
                }
              })
              .catch(() => {});
          }
        })
      );
    }
  }

  // Execute all item insertions and updates in parallel for fast response
  if (operations.length > 0) {
    await Promise.all(operations);
  }

  return {
    success: true,
    list: {
      ...targetList,
      itemsCount: (targetList.itemsCount || 0) + addedMoviesCount,
    },
    addedMoviesCount,
    existingMoviesCount,
  };
}

export const curatedListsService = {
  loadCuratedListsData,
  getCuratedLists,
  getCuratedListById,
  addCuratedListToUser,
};

export default curatedListsService;
