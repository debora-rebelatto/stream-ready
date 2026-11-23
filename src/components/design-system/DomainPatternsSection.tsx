import React, { useState } from 'react';
import {
  CheckCircle,
  Clock,
  Calendar,
  Eye,
  Flame,
  Star,
  SlidersHorizontal,
  Folder,
  Bell,
  Sparkles,
  Tv,
  HardDrive,
  Volume2,
  Users,
  Film,
  Zap,
  Popcorn,
} from 'lucide-react';
import {
  Card,
  Badge,
  Button,
  Alert,
  ProgressBar,
  StatCard,
  EmptyState,
  Pagination,
  Switch,
} from '../common';

export const DomainPatternsSection: React.FC = () => {
  const [demoPage, setDemoPage] = useState(2);
  const [hdrRequired, setHdrRequired] = useState(true);
  const [dolbyAtmosRequired, setDolbyAtmosRequired] = useState(false);
  const [minSeeders, setMinSeeders] = useState<'any' | '10' | '50'>('10');

  const movieStateCards = [
    {
      state: 'New Release (4K Confirmed)',
      title: 'Dune: Part Two',
      year: '2024',
      rating: '8.8',
      qualityLabel: '4K UHD • 34 sources',
      targetLabel: 'Target: 4K',
      borderClass: 'border-amber-500/50 shadow-amber-500/10',
      badge: (
        <Badge
          variant="gradient"
          size="sm"
          uppercase
          pulse
          icon={<Flame size={11} className="fill-current text-yellow-200" />}
        >
          NEW RELEASE
        </Badge>
      ),
      pillClass: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    },
    {
      state: 'Good Quality Ready',
      title: 'Oppenheimer',
      year: '2023',
      rating: '8.9',
      qualityLabel: '1080p FHD • 48 sources',
      targetLabel: 'Target: Auto (1080P)',
      borderClass: 'border-white/10',
      badge: (
        <Badge variant="emerald" size="sm" uppercase icon={<CheckCircle size={10} />}>
          Good Quality
        </Badge>
      ),
      pillClass: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    },
    {
      state: 'Waiting for Digital Release',
      title: 'Gladiator II',
      year: '2024',
      rating: '7.1',
      qualityLabel: 'CAM/TS • 2 sources',
      targetLabel: 'Target: 4K',
      borderClass: 'border-white/10',
      badge: (
        <Badge variant="amber" size="sm" uppercase icon={<Clock size={10} />}>
          Waiting
        </Badge>
      ),
      pillClass: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
    },
    {
      state: 'Unreleased in Cinemas',
      title: 'The Batman Part II',
      year: '2027',
      rating: 'N/A',
      qualityLabel: 'Unreleased • 0 sources',
      targetLabel: 'Target: Auto (1080P)',
      borderClass: 'border-white/10',
      badge: (
        <Badge variant="blue" size="sm" uppercase icon={<Calendar size={10} />}>
          Unreleased
        </Badge>
      ),
      pillClass: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
    },
    {
      state: 'Watched & Archived',
      title: 'Spider-Man: Across the Spider-Verse',
      year: '2023',
      rating: '8.6',
      qualityLabel: 'Watched',
      targetLabel: 'Archived',
      borderClass: 'border-white/5 opacity-80',
      badge: (
        <Badge variant="purple" size="sm" uppercase icon={<Eye size={10} />}>
          Watched
        </Badge>
      ),
      pillClass: 'bg-purple-900/20 text-purple-300 border-purple-500/30',
    },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-150">
      {/* Movie Card Lifecycle Matrix */}
      <Card
        header={
          <div>
            <h2 className="text-base font-bold text-white tracking-tight">
              MovieCard Lifecycle States (5 Existing Watchlist States)
            </h2>
            <p className="text-xs text-gray-400">
              Visual grammar for how movies transition from Unreleased → Waiting → Ready / New
              Release → Watched.
            </p>
          </div>
        }
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {movieStateCards.map((card) => (
            <div
              key={card.state}
              className={`p-4 rounded-xl bg-[#0c0d14] border ${card.borderClass} flex flex-col justify-between gap-3`}
            >
              <div className="flex items-center justify-between gap-2">
                {card.badge}
                <span className="text-[10px] font-mono text-gray-500">{card.state}</span>
              </div>

              <div>
                <h4 className="text-sm font-bold text-white">{card.title}</h4>
                <div className="flex items-center justify-between text-xs text-gray-400 mt-1">
                  <span className="font-semibold text-gray-300 bg-white/5 px-1.5 py-0.5 rounded text-[11px] border border-white/5">
                    {card.year}
                  </span>
                  <Badge
                    variant="amber"
                    size="xs"
                    icon={<Star size={11} className="fill-amber-400 text-amber-400" />}
                  >
                    {card.rating}
                  </Badge>
                </div>
              </div>

              <div className="pt-2 border-t border-white/5 flex items-center justify-between gap-2 flex-wrap">
                <span
                  className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-2 py-0.5 rounded border ${card.pillClass}`}
                >
                  {card.qualityLabel}
                </span>
                <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-md border bg-white/5 text-gray-400 border-white/10">
                  <SlidersHorizontal size={9} />
                  {card.targetLabel}
                </span>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* KPI Metrics & Feedback Alerts */}
      <Card
        header={
          <div>
            <h2 className="text-base font-bold text-white tracking-tight">
              KPI StatCards, Progress Bars &amp; Semantic Alerts
            </h2>
            <p className="text-xs text-gray-400">
              Shared telemetry components powering the User Dashboard, Settings Summary, and Admin
              Analytics.
            </p>
          </div>
        }
      >
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
            <StatCard
              theme="purple"
              icon={<Users size={15} />}
              label="Total Users"
              value="1,284"
              subtitle="Registered Stremio accounts"
            />
            <StatCard
              theme="emerald"
              pulseDot
              label="Ready in 4K / 1080p"
              value="842"
              subtitle="Confirmed via Torrentio"
            />
            <StatCard
              theme="amber"
              icon={<Clock size={15} />}
              label="Waiting Release"
              value="319"
              subtitle="Checked every 4 hours"
            />
            <StatCard
              theme="blue"
              icon={<Film size={15} />}
              label="Avg Watchlist Size"
              value="18.4"
              subtitle="Movies tracked per user"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div className="p-4 rounded-xl bg-[#0c0d14] border border-white/5 space-y-3">
              <ProgressBar
                label="Watchlist Quality Readiness"
                value={72}
                showPercentage
                variant="gradient"
              />
              <ProgressBar
                label="Background Torrentio Batch Scan"
                value={18}
                max={25}
                valueLabel="18 / 25 movies checked"
                variant="emerald"
              />
            </div>

            <div className="space-y-2.5">
              <Alert variant="purple" title="Stremio TV QR Code Connected">
                Your mobile dashboard is synced with your living room Stremio TV catalog.
              </Alert>
              <Alert variant="warning" title="CAM / TS Streams Filtered Out">
                2 low-quality cinema cam streams were ignored for Gladiator II.
              </Alert>
            </div>
          </div>
        </div>
      </Card>

      {/* EXPANDED FUTURE CAPABILITIES */}
      <Card
        variant="purple"
        header={
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Sparkles size={18} className="text-purple-400" />
              <div>
                <h2 className="text-base font-bold text-white tracking-tight">
                  Expanded Future Capabilities &amp; Roadmap Components
                </h2>
                <p className="text-xs text-gray-300">
                  Forward-looking UI patterns designed for upcoming features (HDR/Codec filters,
                  Series tracking, Debrid cache badges, and Webhook notifications).
                </p>
              </div>
            </div>
            <Badge variant="purple" size="xs" uppercase>
              Future-Ready Expansion
            </Badge>
          </div>
        }
      >
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Expansion 1: Granular Codec, HDR & Debrid Stream Filter */}
          <div className="p-4 rounded-xl bg-[#151824] border border-white/10 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <HardDrive size={14} className="text-purple-400" />
                1. Advanced Stream &amp; Codec Rules (HDR10+ / Dolby Vision / Debrid)
              </span>
              <Badge variant="emerald" size="xs">
                Ready to Wire
              </Badge>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="purple" size="xs" uppercase>
                Dolby Vision
              </Badge>
              <Badge variant="blue" size="xs" uppercase>
                HDR10+
              </Badge>
              <Badge variant="emerald" size="xs" uppercase icon={<Zap size={10} />}>
                Real-Debrid Cached
              </Badge>
              <Badge variant="amber" size="xs" uppercase icon={<Volume2 size={10} />}>
                Dolby Atmos 7.1
              </Badge>
              <Badge variant="neutral" size="xs">
                HEVC x265
              </Badge>
            </div>

            <div className="space-y-2.5">
              <Switch
                size="sm"
                checked={hdrRequired}
                onChange={setHdrRequired}
                label="Require HDR10 or Dolby Vision for 4K Releases"
                description="Only flag 4K movies as Ready when dynamic range metadata is verified."
              />
              <Switch
                size="sm"
                checked={dolbyAtmosRequired}
                onChange={setDolbyAtmosRequired}
                theme="blue"
                label="Prefer Multi-Channel Surround Audio (Atmos / TrueHD)"
              />
            </div>

            <div className="flex items-center justify-between text-xs pt-1">
              <span className="text-gray-400">Minimum Torrent Seeders / Peers:</span>
              <div className="flex items-center gap-1.5">
                {(['any', '10', '50'] as const).map((tier) => (
                  <Button
                    key={tier}
                    size="xs"
                    variant={minSeeders === tier ? 'solid' : 'outline'}
                    onClick={() => setMinSeeders(tier)}
                  >
                    {tier === 'any' ? 'Any' : `${tier}+ Seeders`}
                  </Button>
                ))}
              </div>
            </div>
          </div>

          {/* Expansion 2: TV Series & Episode Quality Tracker + Multi-Platform Import */}
          <div className="p-4 rounded-xl bg-[#151824] border border-white/10 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <Tv size={14} className="text-emerald-400" />
                2. TV Series Season Tracker &amp; Webhook Alerts
              </span>
              <Badge variant="blue" size="xs">
                Roadmap Pattern
              </Badge>
            </div>

            <div className="p-3.5 rounded-xl bg-[#0c0d14] border border-white/5 space-y-2.5">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-white">Severance • Season 2</h4>
                  <span className="text-[11px] text-gray-400">
                    Episode 7 of 10 available in 4K Dolby Vision
                  </span>
                </div>
                <Badge variant="emerald" size="xs" uppercase>
                  S02E07 Ready
                </Badge>
              </div>
              <ProgressBar
                value={7}
                max={10}
                size="xs"
                variant="emerald"
                label="Season 2 4K Completion"
                valueLabel="7/10 Episodes"
              />
            </div>

            <div className="p-3.5 rounded-xl bg-[#0c0d14] border border-white/5 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="p-2 rounded-lg bg-purple-500/15 text-purple-300 shrink-0">
                  <Bell size={15} />
                </div>
                <div className="min-w-0">
                  <span className="text-xs font-bold text-white block truncate">
                    Release Notification Channels
                  </span>
                  <span className="text-[11px] text-gray-400 block truncate">
                    Telegram Bot, Discord Webhook &amp; Browser Push
                  </span>
                </div>
              </div>
              <Button variant="outline" size="xs">
                Configure
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* Pagination & EmptyState Preview */}
      <Card
        header={
          <div>
            <h2 className="text-base font-bold text-white tracking-tight">
              Pagination &amp; EmptyState Patterns
            </h2>
            <p className="text-xs text-gray-400">
              Standardized empty list placeholders and responsive pagination controls.
            </p>
          </div>
        }
      >
        <div className="space-y-6">
          <EmptyState
            compact
            icon={<Popcorn className="w-8 h-8" />}
            title="No 4K UHD releases in this custom list yet"
            description="Add upcoming cinema titles or lower your quality threshold to 1080p Full HD to see available streams."
            actions={
              <>
                <Button variant="primary" size="sm" icon={<Sparkles size={13} />}>
                  Browse Curated Lists
                </Button>
                <Button variant="outline" size="sm" icon={<Folder size={13} />}>
                  Manage Lists
                </Button>
              </>
            }
          />

          <Pagination
            currentPage={demoPage}
            totalPages={5}
            totalItems={94}
            itemsPerPage={20}
            onPageChange={setDemoPage}
          />
        </div>
      </Card>
    </div>
  );
};
