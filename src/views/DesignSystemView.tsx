import React, { useState } from 'react';
import { ArrowLeft, Palette, Layers, Film, Sparkles } from 'lucide-react';
import {
  Button,
  Badge,
  DesignTokensSection,
  PrimitivesShowcaseSection,
  DomainPatternsSection,
  Footer,
} from '../components';

export type DesignSystemTab = 'tokens' | 'primitives' | 'patterns';

export interface DesignSystemViewProps {
  onBack: () => void;
}

export const DesignSystemView: React.FC<DesignSystemViewProps> = ({ onBack }) => {
  const [activeTab, setActiveTab] = useState<DesignSystemTab>('tokens');

  const tabs: Array<{
    id: DesignSystemTab;
    label: string;
    subtitle: string;
    icon: React.ReactNode;
  }> = [
    {
      id: 'tokens',
      label: '1. Foundations & Tokens',
      subtitle: 'Color variables, surfaces & typography',
      icon: <Palette size={15} />,
    },
    {
      id: 'primitives',
      label: '2. Atomic UI Primitives',
      subtitle: 'Buttons, badges, forms, switches & avatars',
      icon: <Layers size={15} />,
    },
    {
      id: 'patterns',
      label: '3. Domain & Future Expansions',
      subtitle: 'MovieCard lifecycle, KPIs, HDR/Series & alerts',
      icon: <Film size={15} />,
    },
  ];

  return (
    <div className="min-h-screen bg-[#0c0d14] text-gray-100 flex flex-col">
      {/* Top Sticky Header */}
      <header className="sticky top-0 z-40 bg-[#0c0d14]/90 backdrop-blur-md border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              isIconOnly
              onClick={onBack}
              icon={<ArrowLeft size={16} />}
              className="text-gray-300 hover:text-white"
              aria-label="Back"
              title="Back"
            />
            <div className="h-5 w-px bg-white/10" />
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-purple-500/15 text-purple-400 border border-purple-500/30">
                <Palette size={16} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-base sm:text-lg font-bold tracking-tight text-white">
                    Stremio Watchlist Design System
                  </h1>
                  <Badge variant="purple" size="xs" uppercase>
                    v1.0 + Roadmap
                  </Badge>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
        {/* Hero Overview Banner */}
        <div className="p-6 rounded-2xl bg-gradient-to-r from-purple-950/40 via-[#151824] to-indigo-950/30 border border-purple-500/25 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5 max-w-2xl">
            <div className="flex items-center gap-2">
              <Badge variant="emerald" size="xs" uppercase icon={<Sparkles size={10} />}>
                Clean Architecture UI Kit
              </Badge>
              <span className="text-xs text-gray-400">
                React 19 • Tailwind CSS v4 • Zero External UI Dependencies
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Cinema-Grade Dark UI Library &amp; Component Catalog
            </h2>
            <p className="text-xs text-gray-300 leading-relaxed">
              Interactive documentation of every design token, atomic component, and domain pattern
              already running in production — plus forward-looking components for HDR/Codec filters,
              TV Series episode tracking, Debrid cache indicators, and notification webhooks.
            </p>
          </div>

          {/* Section Switcher Tabs */}
          <div className="flex flex-col sm:flex-row gap-2 shrink-0">
            {tabs.map((tab) => {
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex items-start gap-2.5 ${
                    active
                      ? 'bg-purple-600/20 border-purple-500 text-white shadow-md shadow-purple-950/30'
                      : 'bg-[#151824] border-white/10 text-gray-400 hover:text-white hover:border-white/20'
                  }`}
                >
                  <span className={`mt-0.5 shrink-0 ${active ? 'text-purple-300' : 'text-gray-400'}`}>
                    {tab.icon}
                  </span>
                  <div>
                    <span className="text-xs font-bold block">{tab.label}</span>
                    <span className="text-[10px] text-gray-400 block mt-0.5">{tab.subtitle}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Active Section */}
        {activeTab === 'tokens' && <DesignTokensSection />}
        {activeTab === 'primitives' && <PrimitivesShowcaseSection />}
        {activeTab === 'patterns' && <DomainPatternsSection />}
      </main>

      <Footer />
    </div>
  );
};
