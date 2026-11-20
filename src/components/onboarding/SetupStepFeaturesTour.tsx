import React from 'react';
import { Sliders, RefreshCw, Check } from 'lucide-react';
import { Badge, Switch } from '../common';

export interface SetupStepFeaturesTourProps {
  globalMinQuality: '1080p' | '4k';
  onSelectQuality: (quality: '1080p' | '4k') => void;
  trackWatchlistWatched: boolean;
  onToggleTrackWatched: (enabled: boolean) => void;
  autoSyncWatched: boolean;
  onToggleAutoSync: (enabled: boolean) => void;
}

const QUALITY_OPTIONS = [
  {
    value: '1080p' as const,
    label: '1080p Full HD',
    badge: <Badge variant="blue" size="xs">Standard</Badge>,
    description: 'Ready as soon as a 1080p, WEB-DL, BluRay, or 4K release is available.',
    activeClass: 'bg-blue-600/15 border-blue-500',
  },
  {
    value: '4k' as const,
    label: '4K UHD Only',
    badge: <Badge variant="purple" size="xs">Pristine</Badge>,
    description: 'Movies stay Waiting until a genuine 4K UHD (2160p) release is confirmed.',
    activeClass: 'bg-purple-600/15 border-purple-500',
  },
];

const SectionTitle: React.FC<{ icon: React.ReactNode; children: React.ReactNode }> = ({
  icon,
  children,
}) => (
  <h3 className="flex items-center gap-2 text-sm font-bold text-white">
    <span className="text-purple-300">{icon}</span>
    {children}
  </h3>
);

export const SetupStepFeaturesTour: React.FC<SetupStepFeaturesTourProps> = ({
  globalMinQuality,
  onSelectQuality,
  trackWatchlistWatched,
  onToggleTrackWatched,
  autoSyncWatched,
  onToggleAutoSync,
}) => (
  <div className="space-y-6">
    <section className="space-y-3">
      <SectionTitle icon={<Sliders size={16} />}>Minimum Quality Threshold</SectionTitle>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {QUALITY_OPTIONS.map((option) => {
          const isActive = globalMinQuality === option.value;
          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={isActive}
              onClick={() => onSelectQuality(option.value)}
              className={`p-4 rounded-xl border text-left transition-all cursor-pointer space-y-2 ${
                isActive ? option.activeClass : 'bg-[#1a1e2e] border-white/5 hover:border-white/15'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  {option.badge}
                  <span className="font-bold text-sm text-white">{option.label}</span>
                </div>
                {isActive && <Check size={15} className="text-emerald-400" />}
              </div>
              <p className="text-xs text-gray-400 leading-relaxed">{option.description}</p>
            </button>
          );
        })}
      </div>
    </section>

    <section className="space-y-3">
      <SectionTitle icon={<RefreshCw size={16} />}>Automatic Watched Sync</SectionTitle>
      <Switch
        checked={trackWatchlistWatched}
        onChange={onToggleTrackWatched}
        label="Track Watchlist Movies"
        badge={
          <Badge variant="emerald" size="xs" uppercase>
            Recommended
          </Badge>
        }
        description="When you finish a movie in Stremio, it is automatically moved to your Watched tab."
      />
      <Switch
        checked={autoSyncWatched}
        onChange={onToggleAutoSync}
        label="Automatic Background Verification"
        description="Checks your Stremio account every 30 minutes to keep watched states up to date."
      />
    </section>
  </div>
);
