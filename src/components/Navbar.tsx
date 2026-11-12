import React, { useState, useEffect } from 'react';
import { useAuth, useToast } from '../context/useAppContext';
import { api } from '../lib/api';
import { Settings, Copy, ExternalLink, LogIn, LogOut, Menu, X, Play } from 'lucide-react';

interface NavbarProps {
  onOpenSettings: () => void;
  onOpenLogin: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenSettings, onOpenLogin }) => {
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
      window.location.href = installUrl;
    }
  };

  return (
    <header className="sticky top-0 z-50 bg-[#0c0d14]/85 backdrop-blur-md border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <span className="text-2xl">🎬</span>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-lg font-bold tracking-tight text-white">Stremio Watchlist</h1>
            <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
              Good Quality Tracker
            </span>
            <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30">
              BETA
            </span>
          </div>
        </div>

        {/* Mobile toggle */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden p-2 rounded-lg bg-white/5 border border-white/10 text-gray-300 hover:text-white"
          aria-label="Toggle menu"
        >
          {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>

        {/* Desktop Actions */}
        <div className="hidden md:flex items-center gap-2.5">
          {isAuthLoading ? (
            <div className="flex items-center gap-2 bg-[#1f2438]/60 border border-white/5 px-3 py-1.5 rounded-lg text-xs text-gray-400">
              <div className="w-3.5 h-3.5 border-2 border-purple-500/20 border-t-purple-500 rounded-full animate-spin" />
              <span>Verifying session...</span>
            </div>
          ) : user ? (
            <div className="flex items-center gap-2 bg-[#1f2438] border border-white/10 px-3 py-1.5 rounded-lg text-xs font-medium">
              <span className="text-gray-400">👤</span>
              <span className="text-white max-w-[140px] truncate">{user.email}</span>
              <button
                onClick={logout}
                className="text-red-400 hover:text-red-300 ml-1 text-xs font-semibold cursor-pointer"
                title="Sign Out"
              >
                Sign Out
              </button>
            </div>
          ) : (
            <button
              onClick={onOpenLogin}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-gradient-to-r from-[#7b42f6] to-indigo-600 hover:from-[#6a34e0] hover:to-indigo-500 text-white shadow-sm border border-white/20 transition-all cursor-pointer"
            >
              <LogIn size={14} />
              Sign in with Stremio
            </button>
          )}

          <a
            href={installUrl || '#'}
            onClick={handleInstallClick}
            className="pulse-btn inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-[#7b42f6] hover:bg-[#6a34e0] text-white shadow-[0_0_15px_rgba(123,66,246,0.4)] transition-all cursor-pointer"
          >
            <Play size={13} fill="currentColor" />
            Install in App
          </a>

          <button
            onClick={handleCopy}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-[#1f2438] hover:bg-[#252b42] text-gray-200 border border-white/10 transition-all cursor-pointer"
            title="Copy manifest URL"
          >
            <Copy size={13} />
            Copy Link
          </button>

          <button
            onClick={onOpenSettings}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-[#1f2438] hover:bg-[#252b42] text-gray-200 border border-white/10 transition-all cursor-pointer"
          >
            <Settings size={13} />
            Guide & Backup
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-white/10 px-4 py-3 bg-[#0c0d14] flex flex-col gap-2">
          {user ? (
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-[#1f2438] border border-white/10">
              <span className="text-xs text-gray-300 truncate">👤 {user.email}</span>
              <button
                onClick={() => {
                  logout();
                  setMobileMenuOpen(false);
                }}
                className="text-xs font-bold text-red-400 hover:underline"
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
              className="w-full flex items-center justify-center gap-2 py-2 text-xs font-semibold rounded-lg bg-gradient-to-r from-[#7b42f6] to-indigo-600 text-white"
            >
              <LogIn size={14} />
              Sign in with Stremio
            </button>
          )}

          <a
            href={installUrl || '#'}
            onClick={(e) => {
              handleInstallClick(e);
              setMobileMenuOpen(false);
            }}
            className="w-full flex items-center justify-center gap-2 py-2 text-xs font-semibold rounded-lg bg-[#7b42f6] text-white"
          >
            <Play size={13} fill="currentColor" />
            Install in App
          </a>

          <button
            onClick={() => {
              handleCopy();
              setMobileMenuOpen(false);
            }}
            className="w-full flex items-center justify-center gap-2 py-2 text-xs font-medium rounded-lg bg-[#1f2438] text-gray-200 border border-white/10"
          >
            <Copy size={13} />
            Copy Link
          </button>

          <button
            onClick={() => {
              onOpenSettings();
              setMobileMenuOpen(false);
            }}
            className="w-full flex items-center justify-center gap-2 py-2 text-xs font-medium rounded-lg bg-[#1f2438] text-gray-200 border border-white/10"
          >
            <Settings size={13} />
            Guide & Backup
          </button>
        </div>
      )}
    </header>
  );
};
