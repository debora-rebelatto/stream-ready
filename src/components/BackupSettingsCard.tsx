import React from 'react';
import { Download, Upload } from 'lucide-react';
import { Button } from './Button';

export interface BackupSettingsCardProps {
  isExporting: boolean;
  onExport: () => void;
  onImport: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const BackupSettingsCard: React.FC<BackupSettingsCardProps> = ({
  isExporting,
  onExport,
  onImport,
}) => {
  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      <div className="bg-[#151824] border border-white/5 rounded-2xl p-5 sm:p-6 shadow-sm space-y-5">
        <div className="flex items-center gap-2.5 pb-3 border-b border-white/10">
          <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400">
            <Download size={18} />
          </div>
          <div>
            <h2 className="text-base font-bold text-white tracking-tight">
              Backup &amp; Restore Watchlist
            </h2>
            <p className="text-xs text-gray-400">
              Export your movies and custom lists to JSON, or restore from a previous backup file.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-5 rounded-xl bg-[#1c2032] border border-white/5 flex flex-col justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-white font-bold text-sm mb-1">
                <Download size={16} className="text-purple-400" />
                <span>Export Watchlist</span>
              </div>
              <p className="text-xs text-gray-400 leading-relaxed">
                Download a complete <code>.json</code> backup containing all movies, quality
                statuses, custom lists, and notes.
              </p>
            </div>

            <Button
              variant="primary"
              onClick={onExport}
              isLoading={isExporting}
              icon={<Download size={14} />}
              className="w-full justify-center"
            >
              {isExporting ? 'Exporting Backup...' : 'Export Backup (.json)'}
            </Button>
          </div>

          <div className="p-5 rounded-xl bg-[#1c2032] border border-white/5 flex flex-col justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-white font-bold text-sm mb-1">
                <Upload size={16} className="text-blue-400" />
                <span>Import Watchlist</span>
              </div>
              <p className="text-xs text-gray-400 leading-relaxed">
                Restore movies from a JSON backup file. Movies will be added to your account and
                immediately tracked for quality.
              </p>
            </div>

            <label className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white font-semibold text-xs border border-white/10 transition-all cursor-pointer">
              <Upload size={14} />
              <span>Select .json Backup File</span>
              <input type="file" accept=".json" onChange={onImport} className="hidden" />
            </label>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 text-xs text-gray-400 leading-relaxed space-y-1">
          <strong className="text-gray-200 block">💡 Portable &amp; Safe</strong>
          <p>
            Backups use a clean, standardized JSON format that preserves IMDb IDs, movie names,
            release years, quality overrides, and custom list assignments.
          </p>
        </div>
      </div>
    </div>
  );
};
