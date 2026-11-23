import React from 'react';
import { Cloud, Check, Copy, Play, QrCode, CheckCircle2 } from 'lucide-react';
import { Badge, Button, Spinner } from '../common';

export interface SetupStepInstallStremioProps {
  manifestUrl: string;
  installUrl?: string;
  isInstallingToAccount: boolean;
  installedToAccount: boolean;
  hasOpenedStremioApp: boolean;
  copiedManifest: boolean;
  showInlineQr: boolean;
  qrDataUrl: string;
  isGeneratingQr: boolean;
  onInstallToAccount: () => void;
  onOpenStremioApp: () => void;
  onCopyManifest: () => void;
  onToggleQr: () => void;
}

const MANUAL_STEPS = [
  'Open Stremio → Addons',
  'Paste this URL in the Addons search bar & press Enter',
  'Click Install',
];

export const SetupStepInstallStremio: React.FC<SetupStepInstallStremioProps> = ({
  manifestUrl,
  installUrl,
  isInstallingToAccount,
  installedToAccount,
  hasOpenedStremioApp,
  copiedManifest,
  showInlineQr,
  qrDataUrl,
  isGeneratingQr,
  onInstallToAccount,
  onOpenStremioApp,
  onCopyManifest,
  onToggleQr,
}) => {
  return (
    <div className="space-y-5">
      <section className="p-5 rounded-2xl bg-linear-to-br from-[#1b1535] to-[#151824] border border-purple-500/30 space-y-4">
        <div className="flex items-center gap-2 flex-wrap">
          <Cloud size={18} className="text-purple-300" />
          <h3 className="text-sm font-bold text-white">Option 1 — 1-Click Cloud Install</h3>
          <Badge variant="emerald" size="xs" uppercase>
            Recommended
          </Badge>
        </div>
        <p className="text-xs text-gray-400 leading-relaxed">
          Installs the addon directly on your Stremio Cloud Account, so your catalogs sync
          automatically across Desktop, Mobile, Web, and Smart TVs.
        </p>
        {installedToAccount && (
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-200">
            <strong className="inline-flex items-center gap-1.5">
              <span>Installed on your Stremio Cloud Account</span>
              <CheckCircle2 size={14} className="text-emerald-400 shrink-0" />
            </strong>
            <span className="block text-emerald-300/80 mt-0.5">
              If Stremio is currently open, restart it to see your new catalogs.
            </span>
          </div>
        )}
        <Button
          variant="primary"
          size="lg"
          isLoading={isInstallingToAccount}
          onClick={onInstallToAccount}
          icon={<Cloud size={16} />}
          className="w-full sm:w-auto"
        >
          {installedToAccount
            ? 'Re-install / Refresh in Stremio Cloud'
            : '1-Click Install to My Stremio Account'}
        </Button>
      </section>

      <section className="p-5 rounded-2xl bg-[#151824] border border-white/10 space-y-4">
        <h3 className="text-sm font-bold text-white">Option 2 — App Link, Manual Link or QR Code</h3>
        <div className="flex flex-wrap gap-2">
          {installUrl && (
            <Button
              variant="secondary"
              size="md"
              onClick={onOpenStremioApp}
              icon={hasOpenedStremioApp ? <Check size={14} className="text-emerald-400" /> : <Play size={14} />}
            >
              Open in Stremio App
            </Button>
          )}
          <Button variant="outline" size="md" onClick={onToggleQr} icon={<QrCode size={14} />}>
            {showInlineQr ? 'Hide QR Code' : 'Show QR Code for Mobile & TV'}
          </Button>
        </div>

        <div className="bg-black/40 border border-white/10 rounded-xl p-2.5 flex items-center gap-2">
          <span className="font-mono text-xs text-gray-300 truncate flex-1 select-all px-1">
            {manifestUrl}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={onCopyManifest}
            icon={copiedManifest ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
          >
            {copiedManifest ? 'Copied' : 'Copy Link'}
          </Button>
        </div>

        <ol className="space-y-1.5 text-xs text-gray-400">
          {MANUAL_STEPS.map((step, index) => (
            <li key={step} className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-white/10 text-gray-200 text-[10px] font-bold flex items-center justify-center shrink-0">
                {index + 1}
              </span>
              {step}
            </li>
          ))}
        </ol>

        {showInlineQr && (
          <div className="flex justify-center">
            <div className="p-3 rounded-2xl bg-white w-50 h-50 flex items-center justify-center">
              {isGeneratingQr && (
                <Spinner size="lg" variant="dark" label="Generating QR code..." />
              )}
              {!isGeneratingQr && qrDataUrl && (
                <img src={qrDataUrl} alt="Stremio addon install QR code" className="w-44 h-44" />
              )}
              {!isGeneratingQr && !qrDataUrl && (
                <p className="text-xs text-gray-600 text-center">
                  QR code unavailable. Use the link above instead.
                </p>
              )}
            </div>
          </div>
        )}
      </section>

      {(installedToAccount || hasOpenedStremioApp) && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-2 text-sm text-emerald-200">
          <CheckCircle2 size={16} className="shrink-0" />
          Addon connected! Click Continue to configure your preferences.
        </div>
      )}
    </div>
  );
};
