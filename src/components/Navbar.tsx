import React, { useState, useEffect } from 'react';
import { useAuth, useToast } from '../context/useAppContext';
import { api } from '../lib/api';
import { Settings, Copy, LogIn, LogOut, Menu, X, Play, MessageSquare, Folder } from 'lucide-react';
import { GitHubSponsorButton } from './GitHubSponsorButton';

interface NavbarProps {
  onOpenSettings: () => void;
  onOpenLogin: () => void;
  onOpenLists?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenSettings, onOpenLogin, onOpenLists }) => {
  const { user, logout, isLoading: isAuthLoading } = useAuth();
  const { showToast } = useToast();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [manifestUrl, setManifestUrl] = useState('');
  const [installUrl, setInstallUrl] = useState('');

  useEffect(() => {
    api.getInfo()
      .then((info) => {
        setManifestUrl(info.manifestUrl);
        setInstallUrl(info.stremioInstallUrl);
      })
      .catch(() => {
        const origin = window.location.origin;
        setManifestUrl(`${origin}/manifest.json`);
        setInstallUrl(`stremio://${window.location.host}/manifest.json`);
      });
  }, [user]);

  const handleCopy = () => {
    if (!manifestUrl) return;
    navigator.clipboard
      .writeText(manifestUrl)
      .then(() => showToast('Manifest link copied! Paste into Stremio Addons search bar.', 'success'))
      .catch(() => window.prompt('Copy addon link:', manifestUrl));
  };

  const handleInstallClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (installUrl) {
      showToast('🎬 Reminder: After installing in Stremio, use the search bar on this site to add movies!', 'info');
      window.location.href = installUrl;
    }
  };

  return (
    <header className="sticky top-0 z-50 bg-[#0c0d14]/90 backdrop-blur-md border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2.5 sm:py-3 flex items-center justify-between gap-4">
        {/* Brand */}
        <div className="flex items-center gap-2.5 shrink-0">
          <span className="text-xl sm:text-2xl select-none">🎬</span>
          <div className="flex items-center gap-2">
            <h1 className="text-base sm:text-lg font-bold tracking-tight text-white whitespace-nowrap">
              Stremio Watchlist
            </h1>
            <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-amber-500/15 text-amber-300 border border-amber-500/30">
              BETA
            </span>
          </div>
        </div>

        {/* Mobile toggle */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden p-2 rounded-lg bg-white/5 border border-white/10 text-gray-300 hover:text-white transition-colors"
          aria-label="Toggle menu"
        >
          {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
        </button>

        {/* Desktop Actions */}
        <div className="hidden md:flex items-center gap-2">
          {/* Primary Install & Copy Addon */}
          <div className="flex items-center bg-[#161826] border border-white/10 rounded-lg p-0.5 shadow-sm">
            <a
              href={installUrl || '#'}
              onClick={handleInstallClick}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md bg-[#7b42f6] hover:bg-[#6a34e0] text-white shadow-sm transition-all cursor-pointer"
            >
              <Play size={12} fill="currentColor" />
              <span>Install in App</span>
            </a>
            <button
              onClick={handleCopy}
              className="p-1.5 text-gray-300 hover:text-white hover:bg-white/5 rounded-md transition-colors cursor-pointer"
              title="Copy manifest link"
              aria-label="Copy manifest link"
            >
              <Copy size={13} />
            </button>
          </div>

          {/* User Custom Lists (if authenticated) */}
          {user && onOpenLists && (
            <button
              onClick={onOpenLists}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 hover:text-white border border-purple-500/25 transition-all cursor-pointer"
              title="Manage custom lists"
            >
              <Folder size={13} />
              <span>Lists</span>
            </button>
          )}

          {/* Quick Utility Icon Buttons (Settings & Feedback) */}
          <div className="flex items-center gap-1">
            <button
              onClick={onOpenSettings}
              className="p-1.5 rounded-lg text-gray-300 hover:text-white hover:bg-white/5 border border-white/10 transition-colors cursor-pointer"
              title="Settings & Guide"
              aria-label="Settings & Guide"
            >
              <Settings size={15} />
            </button>

            <a
              href="https://tally.so/r/dbazxA"
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 rounded-lg text-gray-300 hover:text-white hover:bg-white/5 border border-white/10 transition-colors cursor-pointer"
              title="Send Feedback"
              aria-label="Send Feedback"
            >
              <MessageSquare size={15} />
            </a>
          </div>

          {/* GitHub Sponsors Button */}
          <div className="hidden lg:flex items-center shrink-0">
            <GitHubSponsorButton size="md" />
          </div>

          <div className="h-4 w-px bg-white/10 mx-0.5" />

          {/* Auth State */}
          {isAuthLoading ? (
            <div className="flex items-center gap-2 bg-[#1f2438]/50 border border-white/5 px-2.5 py-1.5 rounded-lg text-xs text-gray-400">
              <div className="w-3 h-3 border-2 border-purple-500/20 border-t-purple-500 rounded-full animate-spin" />
            </div>
          ) : user ? (
            <div className="flex items-center gap-1.5 bg-[#151824] border border-white/10 pl-2.5 pr-1 py-1 rounded-lg text-xs">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
              <span className="text-gray-200 max-w-[130px] truncate text-[11px] font-medium" title={user.email}>
                {user.email}
              </span>
              <button
                onClick={logout}
                className="p-1 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors cursor-pointer ml-0.5"
                title="Sign Out"
                aria-label="Sign Out"
              >
                <LogOut size={13} />
              </button>
            </div>
          ) : (
            <button
              onClick={onOpenLogin}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-gradient-to-r from-[#7b42f6] to-indigo-600 hover:from-[#6a34e0] hover:to-indigo-500 text-white shadow-sm border border-white/15 transition-all cursor-pointer"
            >
              <LogIn size={13} />
              <span>Sign In</span>
            </button>
          )}
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-white/10 p-3 bg-[#0e101a] space-y-2.5 animate-in fade-in duration-150">
          {/* User Profile / Login row */}
          {user ? (
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#151824] border border-white/10">
              <div className="flex items-center gap-2 truncate">
                <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                <span className="text-xs text-gray-200 truncate font-medium">{user.email}</span>
              </div>
              <button
                onClick={() => {
                  logout();
                  setMobileMenuOpen(false);
                }}
                className="text-xs font-semibold text-red-400 hover:text-red-300 px-2 py-1 rounded hover:bg-red-500/10 transition-colors"
              >
                Sign Out
              </button>
            </div>
          ) : (
            <button
              onClick={() => {
                onOpenLogin();
                setMobileMenuOpen(false);
              }}
              className="w-full flex items-center justify-center gap-2 py-2 text-xs font-semibold rounded-xl bg-gradient-to-r from-[#7b42f6] to-indigo-600 text-white"
            >
              <LogIn size={14} />
              Sign in with Stremio
            </button>
          )}

          {/* Primary Install Button */}
          <a
            href={installUrl || '#'}
            onClick={(e) => {
              handleInstallClick(e);
              setMobileMenuOpen(false);
            }}
            className="w-full flex items-center justify-center gap-2 py-2 text-xs font-semibold rounded-xl bg-[#7b42f6] text-white shadow-md shadow-purple-900/30"
          >
            <Play size={13} fill="currentColor" />
            Install in App
          </a>

          {/* 2-Column Action Grid for Secondary Items */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => {
                handleCopy();
                setMobileMenuOpen(false);
              }}
              className="flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-medium rounded-xl bg-[#151824] text-gray-200 border border-white/10"
            >
              <Copy size={13} />
              <span>Copy Link</span>
            </button>

            {user && onOpenLists && (
              <button
                onClick={() => {
                  onOpenLists();
                  setMobileMenuOpen(false);
                }}
                className="flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-medium rounded-xl bg-purple-500/10 text-purple-300 border border-purple-500/25"
              >
                <Folder size={13} />
                <span>Your Lists</span>
              </button>
            )}

            <button
              onClick={() => {
                onOpenSettings();
                setMobileMenuOpen(false);
              }}
              className="flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-medium rounded-xl bg-[#151824] text-gray-200 border border-white/10"
            >
              <Settings size={13} />
              <span>Guide & Backup</span>
            </button>

            <a
              href="https://tally.so/r/dbazxA"
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-medium rounded-xl bg-[#151824] text-gray-200 border border-white/10"
            >
              <MessageSquare size={13} />
              <span>Feedback</span>
            </a>
          </div>

          {/* GitHub Sponsor row */}
          <div className="pt-2 flex flex-col items-center justify-center p-3 rounded-xl bg-purple-500/5 border border-purple-500/20 text-center">
            <span className="text-[11px] text-gray-300 font-medium mb-2">Support this project on GitHub</span>
            <GitHubSponsorButton size="md" />
          </div>
        </div>
      )}
    </header>
  );
};
