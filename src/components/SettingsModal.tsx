import React from 'react';
import { useWatchlist, useToast } from '../context/AppContext';
import { watchlistService } from '../services/watchlistService';
import { X, BookOpen, Download, Upload } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const { refreshWatchlist } = useWatchlist();
  const { showToast } = useToast();

  if (!isOpen) return null;

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const items = JSON.parse(ev.target?.result as string);
        const res = await watchlistService.importBackup(items);
        if (res.success) {
          showToast(`🎉 ${res.addedCount} items imported successfully!`, 'success');
          await refreshWatchlist();
          onClose();
        }
      } catch {
        showToast('Invalid JSON file.', 'error');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-lg bg-[#151824] border border-white/10 rounded-2xl shadow-2xl p-6 z-10 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-2">
            <BookOpen size={18} className="text-purple-400" />
            <h3 className="text-base font-bold text-white">How to Use & Backup</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="space-y-5 my-5 text-xs text-gray-300">
          {/* Guide */}
          <div className="p-4 rounded-xl bg-[#1f2438] border border-white/10 space-y-2.5">
            <h4 className="text-sm font-bold text-purple-300">📱 How to add to Stremio:</h4>
            <ol className="list-decimal list-inside space-y-1.5 leading-relaxed text-gray-300">
              <li>Click <strong>"Install in App"</strong> in the top navigation bar.</li>
              <li>If the Stremio app does not open automatically, click <strong>"Copy Link"</strong>.</li>
              <li>In Stremio, open the <strong>Addons (Puzzle icon)</strong> tab, paste the link in the search bar and press <strong>Enter</strong>.</li>
              <li>Click <strong>Install</strong>.</li>
              <li>Done! Your custom rows will appear on your Stremio Home Screen / Discover:
                <ul className="list-disc list-inside ml-3 mt-1.5 space-y-0.5 text-gray-400">
                  <li><span className="text-emerald-400 font-semibold">🟢 Watchlist: Ready (Good Quality)</span></li>
                  <li><span>📋 Watchlist: All Movies</span></li>
                  <li><span className="text-amber-400 font-semibold">⏳ Watchlist: Waiting for Quality</span></li>
                </ul>
              </li>
            </ol>
          </div>

          {/* Info note */}
          <div className="p-3 rounded-lg bg-black/25 border border-white/5 text-[11px] text-gray-400 leading-relaxed">
            ⚡ <strong>Automated 24/7 Monitoring:</strong> The server automatically checks sources for all pending movies every 30 minutes in the background without requiring manual intervention.
          </div>

          {/* Backup Actions */}
          <div className="pt-2 border-t border-white/10 flex gap-3">
            <button
              type="button"
              onClick={() => (window.location.href = '/api/export')}
              className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-[#1f2438] hover:bg-[#272e48] border border-white/10 text-gray-200 font-medium cursor-pointer transition-colors"
            >
              <Download size={13} /> Export Backup (.json)
            </button>

            <label className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-[#1f2438] hover:bg-[#272e48] border border-white/10 text-gray-200 font-medium cursor-pointer transition-colors">
              <Upload size={13} /> Import Backup (.json)
              <input
                type="file"
                accept=".json"
                onChange={handleImport}
                className="hidden"
              />
            </label>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-white/10 flex justify-end">
          <button
            onClick={onClose}
            className="inline-flex items-center gap-1.5 px-5 py-2 rounded-lg bg-[#7b42f6] hover:bg-[#6a34e0] text-white text-xs font-bold transition-all shadow cursor-pointer"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
};
