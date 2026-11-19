import React, { useState } from 'react';
import {
  Sparkles,
  Play,
  Trash2,
  Folder,
  Search,
  CheckCircle,
  Clock,
  Calendar,
  Eye,
  Flame,
  Star,
  Settings,
} from 'lucide-react';
import { Button, Badge, Input, Select, Switch, Card, Avatar } from '../common';

export const PrimitivesShowcaseSection: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'all' | 'ready' | 'pending' | 'unreleased' | 'watched'>(
    'ready'
  );
  const [activePill, setActivePill] = useState('scifi');
  const [searchSample, setSearchSample] = useState('Oppenheimer (2023)');
  const [qualitySample, setQualitySample] = useState('4k');
  const [switchTrack, setSwitchTrack] = useState(true);
  const [switchAutoSync, setSwitchAutoSync] = useState(false);

  return (
    <div className="space-y-8 animate-in fade-in duration-150">
      {/* Buttons Showcase */}
      <Card
        header={
          <div>
            <h2 className="text-base font-bold text-white tracking-tight">
              Button Variants, Sizes &amp; Interactive States
            </h2>
            <p className="text-xs text-gray-400">
              All 9 standardized button variants (`primary`, `solid`, `secondary`, `outline`,
              `ghost`, `danger`, `indigo`, `pill`, `tab`) and 4 size scales.
            </p>
          </div>
        }
      >
        <div className="space-y-6">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400 block mb-3">
              Core Action Variants
            </span>
            <div className="flex items-center gap-2.5 flex-wrap">
              <Button variant="primary" icon={<Sparkles size={13} />}>
                Primary Gradient
              </Button>
              <Button variant="solid" icon={<Play size={13} fill="currentColor" />}>
                Solid Brand
              </Button>
              <Button variant="secondary">Secondary Surface</Button>
              <Button variant="outline" icon={<Folder size={13} />}>
                Outline Border
              </Button>
              <Button variant="ghost">Ghost Action</Button>
              <Button variant="indigo">Indigo Accent</Button>
              <Button variant="danger" icon={<Trash2 size={13} />}>
                Danger / Delete
              </Button>
              <Button variant="primary" isLoading>
                Loading State
              </Button>
              <Button variant="secondary" disabled>
                Disabled
              </Button>
            </div>
          </div>

          <div className="pt-4 border-t border-white/5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400 block mb-3">
              Button Size Scale (`xs`, `sm`, `md`, `lg` &amp; `isIconOnly`)
            </span>
            <div className="flex items-center gap-3 flex-wrap">
              <Button variant="primary" size="xs">
                Extra Small (xs)
              </Button>
              <Button variant="primary" size="sm">
                Small Default (sm)
              </Button>
              <Button variant="primary" size="md">
                Medium (md)
              </Button>
              <Button variant="primary" size="lg" icon={<Sparkles size={16} />}>
                Large Hero CTA (lg)
              </Button>
              <Button
                variant="outline"
                size="sm"
                isIconOnly
                icon={<Settings size={14} />}
                aria-label="Icon only button"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-white/5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400 block mb-3">
              Dashboard Status Tabs (`variant=&quot;tab&quot;`) &amp; Custom List Pills (`variant=&quot;pill&quot;`)
            </span>
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-1 bg-[#0c0d14] p-1.5 rounded-xl border border-white/5 w-fit flex-wrap">
                <Button
                  variant="tab"
                  tabTheme="blue"
                  active={activeTab === 'all'}
                  onClick={() => setActiveTab('all')}
                >
                  📋 All (42)
                </Button>
                <Button
                  variant="tab"
                  tabTheme="emerald"
                  active={activeTab === 'ready'}
                  onClick={() => setActiveTab('ready')}
                >
                  🟢 Ready (28)
                </Button>
                <Button
                  variant="tab"
                  tabTheme="amber"
                  active={activeTab === 'pending'}
                  onClick={() => setActiveTab('pending')}
                >
                  ⏳ Waiting (9)
                </Button>
                <Button
                  variant="tab"
                  tabTheme="rose"
                  active={activeTab === 'unreleased'}
                  onClick={() => setActiveTab('unreleased')}
                >
                  📅 Unreleased (5)
                </Button>
                <Button
                  variant="tab"
                  tabTheme="purple"
                  active={activeTab === 'watched'}
                  onClick={() => setActiveTab('watched')}
                >
                  👁️ Watched (19)
                </Button>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <Button
                  variant="pill"
                  active={activePill === 'all'}
                  onClick={() => setActivePill('all')}
                  badge={42}
                >
                  All Watchlist
                </Button>
                <Button
                  variant="pill"
                  active={activePill === 'scifi'}
                  onClick={() => setActivePill('scifi')}
                  badge={12}
                >
                  🚀 Sci-Fi Essentials
                </Button>
                <Button
                  variant="pill"
                  active={activePill === 'oscar'}
                  onClick={() => setActivePill('oscar')}
                  badge={8}
                >
                  🏆 Oscar Contenders
                </Button>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Badges Showcase */}
      <Card
        header={
          <div>
            <h2 className="text-base font-bold text-white tracking-tight">
              Semantic Badges &amp; Release Quality Indicators
            </h2>
            <p className="text-xs text-gray-400">
              Used on movie posters, IMDb rating chips, release alerts, and user status tags.
            </p>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="flex items-center gap-2.5 flex-wrap">
            <Badge
              variant="gradient"
              size="sm"
              uppercase
              pulse
              icon={<Flame size={11} className="fill-current text-yellow-200" />}
            >
              NEW RELEASE
            </Badge>
            <Badge variant="emerald" size="sm" uppercase icon={<CheckCircle size={10} />}>
              Good Quality (4K UHD)
            </Badge>
            <Badge variant="amber" size="sm" uppercase icon={<Clock size={10} />}>
              Waiting Release
            </Badge>
            <Badge variant="blue" size="sm" uppercase icon={<Calendar size={10} />}>
              Unreleased
            </Badge>
            <Badge variant="purple" size="sm" uppercase icon={<Eye size={10} />}>
              Watched
            </Badge>
            <Badge
              variant="amber"
              size="xs"
              icon={<Star size={11} className="fill-amber-400 text-amber-400" />}
            >
              8.8
            </Badge>
            <Badge variant="rose" size="sm" dot pulse>
              CAM / TS Rejected
            </Badge>
            <Badge variant="neutral" size="sm" pill>
              24 Torrentio Sources
            </Badge>
          </div>
        </div>
      </Card>

      {/* Form Controls & Avatars */}
      <Card
        header={
          <div>
            <h2 className="text-base font-bold text-white tracking-tight">
              Form Controls, Switches &amp; Identity Primitives
            </h2>
            <p className="text-xs text-gray-400">
              Unified Input, Select, Switch, and Avatar primitives for filters, modals, and Future
              Multi-User Collaboration.
            </p>
          </div>
        }
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <Input
              label="Search or Filter Input"
              value={searchSample}
              onChange={(e) => setSearchSample(e.target.value)}
              onClear={() => setSearchSample('')}
              leftIcon={<Search size={14} />}
              placeholder="Search movie by title or IMDb ID..."
              helperText="Supports instant clearing and keyboard shortcuts."
            />

            <Select
              label="Quality Threshold Selector"
              value={qualitySample}
              onChange={(e) => setQualitySample(e.target.value)}
              containerClassName="w-full"
              options={[
                { value: '4k', label: '✨ 4K UHD (2160p) Only' },
                { value: '1080p', label: '💎 1080p Full HD Standard' },
                { value: '720p', label: '📺 720p HD Minimum' },
              ]}
            />

            <Input
              label="Validation Error State"
              defaultValue="invalid-imdb-id"
              error="Invalid IMDb ID format. Expected tt followed by 7-8 digits (e.g., tt15239678)."
            />
          </div>

          <div className="space-y-3">
            <Switch
              checked={switchTrack}
              onChange={setSwitchTrack}
              label="Track Watchlist Movies in Stremio"
              badge={
                <Badge variant="emerald" size="xs" uppercase>
                  Recommended
                </Badge>
              }
              description="Automatically archives movies to Watched when finished inside Stremio."
            />

            <Switch
              checked={switchAutoSync}
              onChange={setSwitchAutoSync}
              theme="emerald"
              label="Real-Time Push Notifications (Expanded)"
              description="Send instant browser or Telegram webhook alerts when a 4K release drops."
            />

            <div className="pt-2 flex items-center justify-between p-3.5 rounded-xl bg-[#1a1e2e] border border-white/5">
              <div>
                <span className="text-xs font-bold text-white block">User Presence Avatars</span>
                <span className="text-[11px] text-gray-400">
                  For shared watchlists &amp; Stremio account badges
                </span>
              </div>
              <div className="flex items-center gap-2.5">
                <Avatar name="Debora Rebelatto" size="sm" status="online" />
                <Avatar name="Cinema Club" size="md" status="away" />
                <Avatar name="Stremio TV" size="lg" status="online" />
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};
