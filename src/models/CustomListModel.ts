export interface CustomList {
  id: string;
  userId: string;
  name: string;
  emoji?: string;
  createdAt?: string;
  updatedAt?: string;
  itemsCount?: number;
}

export interface CuratedListItem {
  id: string;
  name: string;
  year?: string | number;
  poster?: string;
  banner?: string;
  genres?: string[];
  description?: string;
  imdbRating?: string;
}

export interface CuratedList {
  id: string;
  name: string;
  emoji: string;
  platform: string;
  badge: string;
  color?: string;
  gradient?: string;
  description: string;
  items: CuratedListItem[];
  itemsCount?: number;
  isAdded?: boolean;
}
