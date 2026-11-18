import React from 'react';
import { GitHubSponsorButton, GitHubRepoButton } from '../common';

export interface FooterProps {
  className?: string;
  onCopyManifest?: () => void;
  onOpenLogin?: () => void;
}

export const Footer: React.FC<FooterProps> = ({
  className = '',
  onCopyManifest,
  onOpenLogin,
}) => {
  return (
    <footer className={`border-t border-white/5 py-6 px-4 text-center text-xs text-gray-500 ${className}`}>
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 flex-wrap">
        {/* Brand & Version */}
        <div className="flex items-center gap-2 shrink-0">
          <img
            src="/icon.png"
            alt="Stremio Watchlist"
            className="w-5 h-5 rounded object-contain select-none"
          />
          <span className="font-bold text-gray-300">
            Stremio Watchlist <span className="hidden sm:inline">• Good Quality Tracker</span>
          </span>
          <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
            Beta
          </span>
        </div>

        {/* GitHub & Sponsor Links */}
        <div className="flex items-center gap-2 shrink-0">
          <GitHubRepoButton size="sm" />
          <GitHubSponsorButton size="sm" />
        </div>

        {/* Disclaimer */}
        <p className="text-[11px] text-gray-500 shrink-0">
          Community Stremio Addon. Not officially affiliated with Stremio or IMDb.
        </p>

        {/* Navigation & Action Links */}
        <div className="flex items-center gap-4 text-gray-400 shrink-0 text-xs">
          <a
            href="https://github.com/debora-rebelatto/stremiowatchlist"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-white transition-colors cursor-pointer"
          >
            GitHub
          </a>
          {onCopyManifest && (
            <button
              type="button"
              onClick={onCopyManifest}
              className="hover:text-white transition-colors cursor-pointer"
            >
              Copy Addon URL
            </button>
          )}
          {onOpenLogin && (
            <button
              type="button"
              onClick={onOpenLogin}
              className="text-purple-400 hover:text-purple-300 font-semibold cursor-pointer"
            >
              Sign In
            </button>
          )}
        </div>
      </div>
    </footer>
  );
};
