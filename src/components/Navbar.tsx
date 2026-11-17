import React, { useState, useEffect } from 'react';
import { useAuth, useToast } from '../context/useAppContext';
import { systemService } from '../services';
import { trackEvent } from '../utils';
import {
  Settings,
  Copy,
  LogIn,
  LogOut,
  Menu,
  X,
  Play,
  MessageSquare,
  Folder,
  QrCode,
  Shield,
} from 'lucide-react';
import { GitHubSponsorButton } from './GitHubSponsorButton';
import { Button } from './Button';
import { Badge } from './Badge';

interface NavbarProps {
  onOpenSettings?: () => void;
  onOpenAdmin?: () => void;
  onOpenLogin?: () => void;
  onOpenInstallGuide?: () => void;
  onOpenLists?: () => void;
  onOpenDeleteAccount?: () => void;
  onOpenQrModal?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenSettings,
  onOpenAdmin,
  onOpenLogin,
  onOpenInstallGuide,
  onOpenLists,
  onOpenQrModal,
}) => {
  const { user, logout, isLoading: isAuthLoading } = useAuth();
  const { showToast } = useToast();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [manifestUrl, setManifestUrl] = useState('');
  const [installUrl, setInstallUrl] = useState('');

  useEffect(() => {
    systemService
      .getInfo()
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
    trackEvent('addon_manifest_copied', { location: 'navbar' });
    navigator.clipboard
      .writeText(manifestUrl)
      .then(() => {
        if (!user) {
          showToast(
            'Manifest copied! Note: Connect your Stremio account to enable movie tracking and sync.',
            'info'
          );
        } else {
          showToast('Manifest link copied! Paste into Stremio Addons search bar.', 'success');
        }
      })
      .catch(() => window.prompt('Copy addon link:', manifestUrl));
  };

  const handleInstallClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (onOpenInstallGuide) {
      onOpenInstallGuide();
      return;
    }
    if (installUrl) {
      trackEvent('addon_install_clicked', { location: 'navbar' });
      showToast(
        '🎬 Reminder: After installing in Stremio, use the search bar on this site to add movies!',
        'info'
      );
      window.location.href = installUrl;
    }
  };

  return (
    <header className="sticky top-0 z-50 bg-[#0c0d14]/90 backdrop-blur-md border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2.5 sm:py-3 flex items-center justify-between gap-4">
        {/* Brand */}
        <div className="flex items-center gap-2.5 shrink-0">
          <img
            src="/icon.png"
            alt="Stremio Watchlist"
            className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg shadow-sm object-contain select-none"
          />
          <div className="flex items-center gap-2">
            <h1 className="text-base sm:text-lg font-bold tracking-tight text-white whitespace-nowrap">
              Stremio Watchlist
            </h1>
            <Badge variant="amber" size="xs" uppercase>
              BETA
            </Badge>
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

          {/* QR Code Modal Trigger */}
          {onOpenQrModal && (
            <Button
              variant="outline"
              size="sm"
              onClick={onOpenQrModal}
              icon={<QrCode size={13} className="text-purple-400" />}
              title="Scan QR Code to open on Mobile or TV"
            >
              QR Code
            </Button>
          )}

          {/* User Custom Lists (if authenticated) */}
          {user && onOpenLists && (
            <Button
              variant="outline"
              size="sm"
              className="bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 hover:text-white border-purple-500/25"
              onClick={onOpenLists}
              icon={<Folder size={13} />}
              title="Manage custom lists"
            >
              Lists
            </Button>
          )}

          {/* Quick Utility Icon Buttons (Settings, Admin & Feedback) */}
          <div className="flex items-center gap-1">
            {user?.isAdmin && onOpenAdmin && (
              <Button
                variant="outline"
                size="sm"
                onClick={onOpenAdmin}
                icon={<Shield size={14} className="text-purple-400" />}
                className="border-purple-500/30 text-purple-200 hover:bg-purple-600/15 mr-1"
                title="Admin Analytics Dashboard"
              >
                <span className="hidden xl:inline">Admin Analytics</span>
              </Button>
            )}

            {onOpenSettings && (
              <Button
                variant="outline"
                size="sm"
                isIconOnly
                onClick={onOpenSettings}
                icon={<Settings size={15} />}
                title="Settings & Guide"
                aria-label="Settings & Guide"
              />
            )}

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
              <span
                className="text-gray-200 max-w-32.5 truncate text-[11px] font-medium"
                title={user.email}
              >
                {user.email}
              </span>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  logout();
                }}
                className="p-1 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors cursor-pointer ml-0.5"
                title="Sign Out"
                aria-label="Sign Out"
              >
                <LogOut size={13} />
              </button>
            </div>
          ) : (
            <Button variant="primary" size="sm" onClick={onOpenLogin} icon={<LogIn size={13} />}>
              Sign In
            </Button>
          )}
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-white/10 p-3 bg-[#0e101a] space-y-2.5 animate-in fade-in duration-150">
          {/* User Profile / Login row */}
          {user ? (
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#151824] border border-white/10">
              <div className="flex items-center gap-2 truncate max-w-42.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                <span className="text-xs text-gray-200 truncate font-medium">{user.email}</span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setMobileMenuOpen(false);
                    logout();
                  }}
                  className="text-xs font-semibold text-gray-400 hover:text-gray-200 px-2 py-1 rounded hover:bg-white/5 transition-colors cursor-pointer"
                >
                  Sign Out
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => {
                onOpenLogin?.();
                setMobileMenuOpen(false);
              }}
              className="w-full flex items-center justify-center gap-2 py-2 text-xs font-semibold rounded-xl from-[#7b42f6] to-indigo-600 text-white"
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

            {onOpenQrModal && (
              <button
                onClick={() => {
                  onOpenQrModal();
                  setMobileMenuOpen(false);
                }}
                className="flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-medium rounded-xl bg-[#151824] text-gray-200 border border-white/10"
              >
                <QrCode size={13} className="text-purple-400" />
                <span>QR Code</span>
              </button>
            )}

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

            {user?.isAdmin && onOpenAdmin && (
              <button
                onClick={() => {
                  onOpenAdmin();
                  setMobileMenuOpen(false);
                }}
                className="flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-semibold rounded-xl bg-purple-500/15 text-purple-200 border border-purple-500/30"
              >
                <Shield size={13} className="text-purple-400" />
                <span>Admin Analytics</span>
              </button>
            )}

            {onOpenSettings && (
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
            )}

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
            <span className="text-[11px] text-gray-300 font-medium mb-2">
              Support this project on GitHub
            </span>
            <GitHubSponsorButton size="md" />
          </div>
        </div>
      )}
    </header>
  );
};
