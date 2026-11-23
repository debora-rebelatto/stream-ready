import React from 'react';
import {
  Film,
  Popcorn,
  Ghost,
  Heart,
  Rocket,
  Trophy,
  Compass,
  Tv,
  Flame,
  Star,
  Skull,
  Search,
  Brain,
  Zap,
  Folder,
  Sparkles,
  Clapperboard,
  PlayCircle,
  type LucideIcon,
} from 'lucide-react';

export interface ListIconOption {
  key: string;
  label: string;
  Icon: LucideIcon;
}

export const LIST_ICON_OPTIONS: ListIconOption[] = [
  { key: 'film', label: 'Movies', Icon: Film },
  { key: 'popcorn', label: 'Popcorn', Icon: Popcorn },
  { key: 'ghost', label: 'Horror', Icon: Ghost },
  { key: 'heart', label: 'Romance', Icon: Heart },
  { key: 'rocket', label: 'Sci-Fi', Icon: Rocket },
  { key: 'trophy', label: 'Awards', Icon: Trophy },
  { key: 'compass', label: 'Adventure', Icon: Compass },
  { key: 'tv', label: 'TV & Streaming', Icon: Tv },
  { key: 'flame', label: 'Trending', Icon: Flame },
  { key: 'star', label: 'Favorites', Icon: Star },
  { key: 'skull', label: 'Thriller', Icon: Skull },
  { key: 'search', label: 'Mystery', Icon: Search },
  { key: 'brain', label: 'Mind-Bending', Icon: Brain },
  { key: 'zap', label: 'Action', Icon: Zap },
  { key: 'folder', label: 'Collection', Icon: Folder },
  { key: 'sparkles', label: 'Curated', Icon: Sparkles },
  { key: 'clapperboard', label: 'Cinema', Icon: Clapperboard },
];

export const DEFAULT_LIST_ICON = 'film';

const ICON_MAP: Record<string, LucideIcon> = {
  film: Film,
  popcorn: Popcorn,
  ghost: Ghost,
  heart: Heart,
  rocket: Rocket,
  trophy: Trophy,
  compass: Compass,
  tv: Tv,
  flame: Flame,
  star: Star,
  skull: Skull,
  search: Search,
  brain: Brain,
  zap: Zap,
  folder: Folder,
  sparkles: Sparkles,
  clapperboard: Clapperboard,
  play: PlayCircle,
  // Legacy emoji mappings for backwards compatibility with persisted custom/curated lists
  '\u{1F3AC}': Film,
  '\u{1F37F}': Popcorn,
  '\u{1F47B}': Ghost,
  '\u{1F496}': Heart,
  '\u{1F680}': Rocket,
  '\u{1F3C6}': Trophy,
  '\u{1F920}': Compass,
  '\u{1F4FA}': Tv,
  '\u{1F525}': Flame,
  '\u{2B50}': Star,
  '\u{1F9DF}': Skull,
  '\u{1F575}\u{FE0F}': Search,
  '\u{1F575}': Search,
  '\u{1F9E0}': Brain,
  '\u{26A1}': Zap,
  '\u{1F4C1}': Folder,
  '\u{2728}': Sparkles,
  '\u{1F534}': PlayCircle,
  '\u{1F7E3}': Tv,
  '\u{1F535}': Film,
  '\u{1F34F}': Clapperboard,
};

export interface ListIconProps {
  icon?: string | null;
  className?: string;
  size?: number;
}

export const ListIcon: React.FC<ListIconProps> = ({
  icon,
  className = 'w-4 h-4',
  size,
}) => {
  const IconComponent = (icon && ICON_MAP[icon]) || Film;
  return <IconComponent size={size} className={`shrink-0 ${className}`.trim()} aria-hidden="true" />;
};
