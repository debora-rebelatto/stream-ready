import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { X, QrCode, Smartphone, Tv, Copy, Check, ExternalLink, Download } from 'lucide-react';
import { useToast } from '../../context/useAppContext';
import { trackEvent } from '../../utils';
import { Spinner } from '../common';

interface QrCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  manifestUrl?: string;
  installUrl?: string;
}

export const QrCodeModal: React.FC<QrCodeModalProps> = ({
  isOpen,
  onClose,
  manifestUrl = 'https://stremiowatchlist.vercel.app/manifest.json',
  installUrl,
}) => {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<'webapp' | 'stremio'>('webapp');
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  // Web App dashboard URL with QR tracking route
  const webAppUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/r/qr?context=modal_webapp`
      : 'https://stremiowatchlist.vercel.app/r/qr?context=modal_webapp';

  // Target URL depending on active tab
  const activeUrl = activeTab === 'webapp' ? webAppUrl : installUrl || manifestUrl;

  // Generate QR Code data URL whenever target URL changes
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    setIsGenerating(true);

    QRCode.toDataURL(activeUrl, {
      width: 320,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#ffffff',
      },
      errorCorrectionLevel: 'M',
    })
      .then((dataUrl) => {
        if (isMounted) {
          setQrDataUrl(dataUrl);
          setIsGenerating(false);
        }
      })
      .catch((err) => {
        console.error('[QR] Failed to generate data URL:', err);
        if (isMounted) setIsGenerating(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, activeUrl]);

  // Track impression when opened
  useEffect(() => {
    if (isOpen) {
      trackEvent('addon_manifest_copied', { location: 'navbar' });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard
      .writeText(activeUrl)
      .then(() => {
        setCopied(true);
        showToast('Link copied to clipboard!', 'success');
        setTimeout(() => setCopied(false), 2000);
      })
      .catch(() => {
        window.prompt('Copy link:', activeUrl);
      });
  };

  const handleDownload = () => {
    if (!qrDataUrl) return;
    const link = document.createElement('a');
    link.href = qrDataUrl;
    link.download = `stremio-watchlist-qr-${activeTab}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('QR code downloaded!', 'success');
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
      <div className="relative w-full max-w-md bg-[#131524] border border-white/10 rounded-2xl shadow-2xl z-10 my-auto flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-white/10 bg-[#171a2e]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-purple-500/15 border border-purple-500/30 text-purple-300">
              <QrCode size={18} />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
                Scan QR Code
              </h3>
              <p className="text-xs text-gray-400">Open on your mobile phone or Smart TV</p>
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

        {/* Tab Selection */}
        <div className="p-4 sm:p-5 space-y-4">
          <div className="flex p-1 bg-black/40 border border-white/5 rounded-xl gap-1">
            <button
              onClick={() => setActiveTab('webapp')}
              className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'webapp'
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-900/30'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              <Smartphone size={14} />
              <span>Mobile Web App</span>
            </button>

            <button
              onClick={() => setActiveTab('stremio')}
              className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'stremio'
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-900/30'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              <Tv size={14} />
              <span>Stremio Addon</span>
            </button>
          </div>

          {/* QR Code Container */}
          <div className="flex flex-col items-center justify-center p-5 bg-[#0b0c14] border border-white/5 rounded-2xl">
            <div className="p-3 bg-white rounded-2xl shadow-xl flex items-center justify-center min-w-55 min-h-55">
              {isGenerating ? (
                <Spinner size="lg" variant="dark" label="Generating QR code..." />
              ) : qrDataUrl ? (
                <img
                  src={qrDataUrl}
                  alt="QR Code"
                  className="w-52 h-52 sm:w-56 sm:h-56 object-contain block select-none"
                />
              ) : (
                <span className="text-xs text-gray-500">Generating code...</span>
              )}
            </div>

            <p className="text-xs text-center text-gray-300 font-medium mt-4 max-w-xs leading-relaxed">
              {activeTab === 'webapp' ? (
                <>
                  Point your phone camera here to open the <strong>Web Dashboard</strong> on mobile.
                  Search &amp; add movies easily from your couch!
                </>
              ) : (
                <>
                  Point your phone camera here to open <strong>Stremio</strong> and install the
                  addon directly to your account.
                </>
              )}
            </p>
          </div>

          {/* Action buttons & URL bar */}
          <div className="space-y-2">
            <div className="p-2.5 rounded-xl bg-black/30 border border-white/5 flex items-center justify-between gap-2 text-xs">
              <span className="font-mono text-gray-400 text-[11px] truncate select-all">
                {activeUrl}
              </span>
              <button
                onClick={handleCopy}
                className="shrink-0 inline-flex items-center gap-1 text-purple-300 hover:text-purple-200 font-semibold px-2 py-1 rounded bg-purple-500/15 hover:bg-purple-500/25 transition-colors cursor-pointer"
                title="Copy link"
              >
                {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={handleDownload}
                disabled={!qrDataUrl}
                className="flex-1 py-2.5 px-3 rounded-xl bg-white/5 hover:bg-white/10 text-gray-200 hover:text-white font-semibold text-xs border border-white/10 transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Download size={13} />
                <span>Save QR Image</span>
              </button>

              <a
                href={activeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 py-2.5 px-3 rounded-xl bg-purple-600/30 hover:bg-purple-600/40 text-purple-200 hover:text-white font-semibold text-xs border border-purple-500/40 transition-colors flex items-center justify-center gap-1.5 cursor-pointer text-center"
              >
                <ExternalLink size={13} />
                <span>Open in Browser</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
