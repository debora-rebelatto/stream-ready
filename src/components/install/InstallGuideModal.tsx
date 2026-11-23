import React, { useState } from 'react';
import {
  X,
  Sparkles,
  Tv,
  Copy,
  Check,
  Play,
  ArrowRight,
  ShieldCheck,
  AlertTriangle,
  QrCode,
  BookOpen,
  CheckCircle2,
  List,
  Hourglass,
} from 'lucide-react';
import { trackEvent } from '../../utils';
import { useAuth } from '../../context/useAppContext';

interface InstallGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenLogin: () => void;
  onOpenQrModal?: () => void;
  installUrl?: string;
  manifestUrl?: string;
}

export const InstallGuideModal: React.FC<InstallGuideModalProps> = ({
  isOpen,
  onClose,
  onOpenLogin,
  onOpenQrModal,
  installUrl,
  manifestUrl = 'https://stremiowatchlist.vercel.app/manifest.json',
}) => {
  const { user } = useAuth();
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopy = () => {
    trackEvent('addon_manifest_copied', { location: user ? 'dashboard_guide' : 'landing_page' });
    navigator.clipboard
      .writeText(manifestUrl)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      })
      .catch(() => {
        window.prompt('Copy addon link:', manifestUrl);
      });
  };

  const handleConnectClick = () => {
    onClose();
    onOpenLogin();
  };

  const handleInstallClick = () => {
    trackEvent('addon_install_clicked', { location: user ? 'dashboard_guide' : 'landing_page' });
    if (installUrl) {
      window.location.href = installUrl;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-lg bg-[#151824] border border-white/10 rounded-2xl shadow-2xl z-10 my-auto max-h-[calc(100dvh-1.5rem)] sm:max-h-[calc(100dvh-3rem)] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-white/10 bg-[#151824] shrink-0">
          <div className="flex items-center gap-2.5">
            {user ? (
              <div className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/25 text-purple-400">
                <Tv size={18} />
              </div>
            ) : (
              <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-400">
                <AlertTriangle size={18} />
              </div>
            )}
            <div>
              <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
                {user ? 'How to Add to Stremio' : 'Account Required to Track Movies'}
              </h3>
              <p className="text-xs text-gray-400">
                {user
                  ? 'Follow these quick steps to install on your app'
                  : 'Please connect your Stremio account before installing'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 active:bg-white/10 transition-colors cursor-pointer"
            aria-label="Close dialog"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-5 sm:p-6 overflow-y-auto overscroll-contain flex-1 space-y-4 text-xs sm:text-sm">
          {user ? (
            /* Authenticated User: How to Add to Stremio Guide */
            <>
              {/* Direct 1-Click Install Button */}
              <div>
                <button
                  onClick={handleInstallClick}
                  className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-[#7b42f6] to-indigo-600 hover:from-[#6a34e0] hover:to-indigo-500 text-white font-bold text-sm shadow-[0_0_25px_rgba(123,66,246,0.5)] transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <Play size={16} fill="currentColor" />
                  <span>Open &amp; Install in Stremio</span>
                </button>
                <p className="text-[11px] text-center text-gray-400 mt-2">
                  Opens the Stremio app directly with your personalized addon link
                </p>
              </div>

              {/* Step-by-step Installation Instructions */}
              <div className="p-4 rounded-xl bg-[#1c2032] border border-white/10 space-y-2.5">
                <h4 className="text-xs font-bold uppercase tracking-wider text-purple-300 flex items-center gap-2">
                  <BookOpen size={14} />
                  Step-by-Step Instructions:
                </h4>
                <ol className="list-decimal list-inside space-y-2 leading-relaxed text-gray-300 text-xs sm:text-[13px]">
                  <li>
                    Click <strong className="text-white">"Open &amp; Install in Stremio"</strong>{' '}
                    above.
                  </li>
                  <li>
                    If the Stremio app does not open automatically, copy your personalized link
                    below.
                  </li>
                  <li>
                    In the Stremio app, open the{' '}
                    <strong className="text-white">Addons (Puzzle icon)</strong> tab, paste the link
                    in the search bar and press <strong className="text-white">Enter</strong>.
                  </li>
                  <li>
                    Click <strong className="text-white">Install</strong>.
                  </li>
                  <li>
                    Done! Your custom rows will appear on your Stremio Home Screen / Discover:
                    <ul className="ml-3 mt-1.5 space-y-1 text-gray-400">
                      <li className="flex items-center gap-1.5">
                        <CheckCircle2 size={12} className="text-emerald-400 shrink-0" />
                        <span className="text-emerald-400 font-semibold">
                          Watchlist: Ready (Good Quality)
                        </span>
                      </li>
                      <li className="flex items-center gap-1.5">
                        <List size={12} className="text-gray-300 shrink-0" />
                        <span className="text-gray-200 font-semibold">
                          Watchlist: All Movies
                        </span>
                      </li>
                      <li className="flex items-center gap-1.5">
                        <Hourglass size={12} className="text-amber-400 shrink-0" />
                        <span className="text-amber-400 font-semibold">
                          Watchlist: Waiting for Quality
                        </span>
                      </li>
                    </ul>
                  </li>
                </ol>
              </div>

              {/* Manifest Link Section */}
              <div className="border-t border-white/10 pt-3 space-y-2">
                <div className="flex items-center justify-between text-xs text-gray-400">
                  <span>Your Personalized Manifest Link:</span>
                  <button
                    onClick={handleCopy}
                    className="inline-flex items-center gap-1 text-purple-400 hover:text-purple-300 font-medium cursor-pointer"
                  >
                    {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                    <span>{copied ? 'Copied!' : 'Copy Link'}</span>
                  </button>
                </div>
                <div className="p-2.5 rounded-lg bg-black/40 border border-white/5 text-[11px] font-mono text-gray-300 break-all select-all">
                  {manifestUrl}
                </div>
              </div>

              {/* Mobile / TV QR Trigger */}
              {onOpenQrModal && (
                <button
                  onClick={() => {
                    onClose();
                    onOpenQrModal();
                  }}
                  className="w-full py-2.5 px-3 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 text-purple-200 hover:text-white font-semibold text-xs border border-purple-500/25 transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <QrCode size={14} className="text-purple-400" />
                  <span>Scan QR Code to Open on Mobile / TV</span>
                </button>
              )}
            </>
          ) : (
            /* Unauthenticated User: Prompt to Connect */
            <>
              {/* Important Notice Callout */}
              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-200 space-y-2">
                <div className="flex items-center gap-2 font-bold text-amber-300">
                  <AlertTriangle size={15} className="shrink-0" />
                  <span>Why is an account required?</span>
                </div>
                <p className="text-xs leading-relaxed text-amber-200/90">
                  Stremio addons are strictly{' '}
                  <strong>read-only inside the Stremio player app</strong>. Stremio does not allow
                  addons to provide search inputs or movie-adding buttons inside the player.
                </p>
                <p className="text-xs leading-relaxed text-amber-200/90">
                  To track cinema movies, you must{' '}
                  <strong>connect your Stremio account on this website</strong>. You add movies
                  here, and our background cloud scanner monitors sources 24/7 to push 1080p FHD
                  &amp; 4K UHD releases directly to your Stremio library.
                </p>
              </div>

              {/* Benefits Grid */}
              <div className="space-y-3">
                <h4 className="font-bold text-white text-xs uppercase tracking-wider">
                  What you get when you connect:
                </h4>

                <div className="flex items-start gap-3 p-3 rounded-xl bg-[#1c2032] border border-white/5">
                  <div className="p-1.5 rounded-lg bg-purple-500/10 text-purple-400 shrink-0 mt-0.5">
                    <Sparkles size={16} />
                  </div>
                  <div>
                    <strong className="block text-white text-xs font-semibold">
                      1-Click Automatic Installation
                    </strong>
                    <p className="text-[11px] text-gray-400 leading-relaxed mt-0.5">
                      Connecting automatically installs the addon directly into your official
                      Stremio cloud account without manual copying.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-xl bg-[#1c2032] border border-white/5">
                  <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400 shrink-0 mt-0.5">
                    <Tv size={16} />
                  </div>
                  <div>
                    <strong className="block text-white text-xs font-semibold">
                      Full Smart TV &amp; Multi-Device Sync
                    </strong>
                    <p className="text-[11px] text-gray-400 leading-relaxed mt-0.5">
                      Synchronizes your personal watchlist across Samsung Tizen, LG webOS, Android
                      TV, Google TV, Fire TV Stick, Apple Mac, Windows PC, iOS, and Android mobile.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-xl bg-[#1c2032] border border-white/5">
                  <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 shrink-0 mt-0.5">
                    <ShieldCheck size={16} />
                  </div>
                  <div>
                    <strong className="block text-white text-xs font-semibold">
                      100% Free, Safe &amp; AES-256-GCM Encrypted
                    </strong>
                    <p className="text-[11px] text-gray-400 leading-relaxed mt-0.5">
                      We never store your Stremio password. Authentication happens over secure TLS
                      via the official Stremio API.
                    </p>
                  </div>
                </div>
              </div>

              {/* Primary CTA */}
              <div className="pt-2">
                <button
                  onClick={handleConnectClick}
                  className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-[#7b42f6] to-indigo-600 hover:from-[#6a34e0] hover:to-indigo-500 text-white font-bold text-sm shadow-[0_0_25px_rgba(123,66,246,0.5)] transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <Sparkles size={16} />
                  <span>Connect Stremio Account (Recommended)</span>
                  <ArrowRight size={16} />
                </button>
                <p className="text-[11px] text-center text-gray-400 mt-2">
                  Free setup in 10 seconds • No credit card needed
                </p>
                {onOpenQrModal && (
                  <button
                    onClick={() => {
                      onClose();
                      onOpenQrModal();
                    }}
                    className="w-full py-2.5 px-3 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 text-purple-200 hover:text-white font-semibold text-xs border border-purple-500/25 transition-all cursor-pointer flex items-center justify-center gap-2 mt-2"
                  >
                    <QrCode size={14} className="text-purple-400" />
                    <span>Scan QR Code to Open on Mobile / TV</span>
                  </button>
                )}
              </div>

              {/* Advanced / Fallback Manual Link */}
              <div className="border-t border-white/10 pt-4 space-y-2">
                <div className="flex items-center justify-between text-xs text-gray-400">
                  <span>Manual Manifest URL (Generic / Unlinked):</span>
                  <button
                    onClick={handleCopy}
                    className="inline-flex items-center gap-1 text-purple-400 hover:text-purple-300 font-medium cursor-pointer"
                  >
                    {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                    <span>{copied ? 'Copied!' : 'Copy Link'}</span>
                  </button>
                </div>
                <div className="p-2.5 rounded-lg bg-black/40 border border-white/5 text-[11px] font-mono text-gray-300 break-all select-all">
                  {manifestUrl}
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    onClick={handleInstallClick}
                    className="text-xs text-gray-400 hover:text-gray-200 underline cursor-pointer inline-flex items-center gap-1"
                    title="Install without account linking (will require setup later)"
                  >
                    <Play size={11} fill="currentColor" />
                    <span>Install generic addon anyway (requires linking later)</span>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
