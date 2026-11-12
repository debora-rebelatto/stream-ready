import React, { useState } from 'react';
import { isItemUnreleased } from './lib/utils';
import { useAuth, useWatchlist } from './context/useAppContext';
import { Navbar } from './components/Navbar';
import { Hero } from './components/Hero';
import { SearchSection } from './components/SearchSection';
import { MovieCard } from './components/MovieCard';
import { LoginModal } from './components/LoginModal';
import { SettingsModal } from './components/SettingsModal';
import { ToastContainer } from './components/ToastContainer';
import { RotateCw, Lock, Film, Sparkles } from 'lucide-react';

export const App: React.FC = () => {
  const { user } = useAuth();
  const {
    items,
    stats,
    currentTab,
    setCurrentTab,
    isLoading,
    isCheckingAll,
    removeItem,
    recheckAll,
  } = useWatchlist();

  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Filter items
  const filtered = items.filter((item) => {
    if (currentTab === 'ready') return item.has1080pPlus;
    if (currentTab === 'unreleased') return !item.has1080pPlus && isItemUnreleased(item);
    if (currentTab === 'pending') return !item.has1080pPlus && !isItemUnreleased(item);
    return true;
  });

  return (
    <div className="min-h-screen flex flex-col bg-[#0c0d14]">
      <Navbar
        onOpenLogin={() => setIsLoginOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <Hero onOpenSettings={() => setIsSettingsOpen(true)} />

        {user ? (
          <>
            <SearchSection />

            {/* List Header & Controls */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-white/10">
              {/* Tabs */}
              <div className="flex gap-2 overflow-x-auto pb-1 sm:pb-0">
                <button
                  onClick={() => setCurrentTab('all')}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                    currentTab === 'all'
                      ? 'bg-[#1f2438] text-white border border-white/20 shadow'
                      : 'text-gray-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  📋 All ({stats.total})
                </button>

                <button
                  onClick={() => setCurrentTab('ready')}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                    currentTab === 'ready'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow'
                      : 'text-gray-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  🟢 Ready ({stats.ready})
                </button>

                <button
                  onClick={() => setCurrentTab('pending')}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                    currentTab === 'pending'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow'
                      : 'text-gray-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  ⏳ Waiting ({stats.pending})
                </button>

                <button
                  onClick={() => setCurrentTab('unreleased')}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                    currentTab === 'unreleased'
                      ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40 shadow'
                      : 'text-gray-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  📅 Unreleased ({stats.unreleased})
                </button>
              </div>

              {/* Action Buttons */}
              <button
                onClick={recheckAll}
                disabled={isCheckingAll}
                className="inline-flex items-center justify-center gap-2 px-3.5 py-1.5 text-xs font-medium rounded-lg bg-transparent hover:bg-white/5 text-gray-300 hover:text-white border border-white/15 transition-all cursor-pointer disabled:opacity-50"
                title="Recheck streams for all pending movies"
              >
                <RotateCw size={13} className={isCheckingAll ? 'animate-spin text-purple-400' : ''} />
                {isCheckingAll ? 'Checking...' : 'Recheck Pending'}
              </button>
            </div>

            {/* Watchlist Grid */}
            {isLoading ? (
              <div className="py-20 text-center text-sm text-gray-400">Loading your watchlist...</div>
            ) : filtered.length === 0 ? (
              <div className="py-20 text-center flex flex-col items-center justify-center">
                <div className="text-4xl mb-3 opacity-60">
                  {currentTab === 'ready' ? '🎬' : currentTab === 'pending' ? '⏳' : '📋'}
                </div>
                <h4 className="text-base font-bold text-white mb-1">
                  {currentTab === 'ready'
                    ? 'No movies ready in good quality yet'
                    : currentTab === 'pending'
                    ? 'No movies waiting for good quality!'
                    : currentTab === 'unreleased'
                    ? 'No unreleased movies found!'
                    : 'Your watchlist is empty'}
                </h4>
                <p className="text-xs text-gray-400 max-w-sm">
                  {items.length === 0
                    ? 'Use the search bar above to start tracking movies.'
                    : 'Switch tabs or add more items to monitor.'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-6">
                {filtered.map((item) => (
                  <MovieCard key={item.id} item={item} onDelete={removeItem} />
                ))}
              </div>
            )}
          </>
        ) : (
          /* Locked State when user is not signed in */
          <div className="py-16 sm:py-24 text-center max-w-lg mx-auto p-8 rounded-2xl bg-white/[0.02] border border-dashed border-purple-500/30 flex flex-col items-center">
            <div className="w-14 h-14 rounded-2xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400 mb-4 shadow-inner">
              <Lock size={26} />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Sign in to view your watchlist</h3>
            <p className="text-xs text-gray-400 mb-6 leading-relaxed">
              Connect your Stremio account to automatically sync your movies, view real-time quality alerts, and track releases across your Smart TV and mobile devices.
            </p>
            <button
              onClick={() => setIsLoginOpen(true)}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#7b42f6] to-indigo-600 hover:from-[#6a34e0] hover:to-indigo-500 text-white text-xs font-bold shadow-lg transition-all cursor-pointer"
            >
              <Sparkles size={14} />
              Sign in with Stremio
            </button>
          </div>
        )}
      </main>

      {/* Modals & Toast */}
      <LoginModal isOpen={isLoginOpen} onClose={() => setIsLoginOpen(false)} />
      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
      <ToastContainer />

      {/* Footer */}
      <footer className="border-t border-white/5 py-6 px-4 text-center text-xs text-gray-500">
        <p>
          🎬 <span className="font-semibold text-gray-400">Stremio Watchlist (Good Quality Tracker)</span> • Beta Version
        </p>
        <p className="mt-1 text-[11px] text-gray-600">
          Disclaimer: This community tool uses public stream metadata and is not affiliated with or endorsed by Stremio.
        </p>
      </footer>
    </div>
  );
};
