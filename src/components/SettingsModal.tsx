import React from 'react';
import { useWatchlist, useToast, useAuth } from '../context/useAppContext';
import { watchlistService } from '../services/watchlistService';
import { X, BookOpen, Download, Upload, Sliders, Tv, Eye, RefreshCw, Info } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const {
    refreshWatchlist,
    globalMinQuality,
    setGlobalMinQuality,
    stats,
    autoSyncWatched,
    setAutoSyncWatched,
    syncWatchedFromStremio,
    isSyncingWatched,
  } = useWatchlist();
  const { user } = useAuth();
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-lg bg-[#151824] border border-white/10 rounded-2xl shadow-2xl z-10 my-auto max-h-[calc(100dvh-1.5rem)] sm:max-h-[calc(100dvh-3rem)] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 sm:py-4 border-b border-white/10 bg-[#151824] shrink-0">
          <div className="flex items-center gap-2">
            <Sliders size={18} className="text-purple-400" />
            <h3 className="text-sm sm:text-base font-bold text-white">Settings & Guide</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer touch-manipulation min-w-[32px] min-h-[32px] flex items-center justify-center"
            aria-label="Close dialog"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 overflow-y-auto overscroll-contain flex-1 space-y-5 text-xs text-gray-300">
          {/* Minimum Desired Quality Setting */}
          <div className="p-4 rounded-xl bg-[#1f2438] border border-white/10 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-white flex items-center gap-2">
                <Tv size={16} className="text-purple-400" />
                Global Minimum Quality Target
              </span>
              <span className="text-[11px] font-semibold text-purple-300 bg-purple-500/20 px-2 py-0.5 rounded">
                {globalMinQuality.toUpperCase()}
              </span>
            </div>
            <p className="text-[11px] text-gray-400 leading-relaxed">
              Choose when a movie is considered "Ready" in good quality. You can also override this per-movie directly on each card.
            </p>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <button
                type="button"
                onClick={() => setGlobalMinQuality('1080p')}
                className={`p-3 rounded-lg border text-left transition-all cursor-pointer flex flex-col justify-between gap-1.5 ${
                  globalMinQuality === '1080p'
                    ? 'bg-blue-600/20 border-blue-500 text-white shadow-md'
                    : 'bg-[#151824] border-white/10 text-gray-400 hover:text-white hover:border-white/20'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-white">1080p Full HD</span>
                  {globalMinQuality === '1080p' && <span className="text-blue-400 text-xs">✓ Active</span>}
                </div>
                <span className="text-[10px] text-gray-400 leading-normal">
                  Standard releases. Alerts when 1080p, BluRay, WEB-DL, or 4K arrives.
                </span>
              </button>

              <button
                type="button"
                onClick={() => setGlobalMinQuality('4k')}
                className={`p-3 rounded-lg border text-left transition-all cursor-pointer flex flex-col justify-between gap-1.5 ${
                  globalMinQuality === '4k'
                    ? 'bg-purple-600/20 border-purple-500 text-white shadow-md'
                    : 'bg-[#151824] border-white/10 text-gray-400 hover:text-white hover:border-white/20'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-white">4K UHD Only</span>
                  {globalMinQuality === '4k' && <span className="text-purple-400 text-xs">✓ Active</span>}
                </div>
                <span className="text-[10px] text-gray-400 leading-normal">
                  Pristine quality. Alerts only when 4K UHD or 2160p is detected.
                </span>
              </button>
            </div>
          </div>

          {/* Stremio Watched Synchronization */}
          <div className="p-4 rounded-xl bg-[#1f2438] border border-white/10 space-y-3.5">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-white flex items-center gap-2">
                <Eye size={16} className="text-purple-400" />
                Sincronizar Filmes Assistidos (Stremio)
              </span>
              {stats.watched > 0 && (
                <span className="text-[10px] font-semibold text-purple-300 bg-purple-500/20 px-2 py-0.5 rounded">
                  {stats.watched} vistos
                </span>
              )}
            </div>

            {/* Como funciona */}
            <div className="space-y-2 text-[11px] bg-[#151824]/70 p-3 rounded-xl border border-white/5 leading-relaxed">
              <div className="font-semibold text-purple-300 flex items-center gap-1.5">
                <Info size={13} className="text-purple-400" />
                Como funciona a sincronização?
              </div>
              <ul className="space-y-1.5 list-disc list-inside text-gray-400 text-[10.5px]">
                <li>
                  <strong className="text-gray-200">Limpeza da lista ativa:</strong> Filmes da sua watchlist que você já assistiu no Stremio são automaticamente movidos para a aba <strong className="text-purple-300">Vistos</strong>, mantendo sua lista principal sempre limpa e focada em novidades.
                </li>
                <li>
                  <strong className="text-gray-200">Importação do histórico:</strong> Busca diretamente na biblioteca oficial da sua conta do Stremio todos os filmes marcados como assistidos ou com progresso assistido superior a 80%.
                </li>
                <li>
                  <strong className="text-gray-200">Controle total:</strong> Por padrão, a sincronização não acontece automaticamente para novos usuários, para não sobrecarregar sua lista. Você decide exatamente quando sincronizar!
                </li>
              </ul>
            </div>

            <div className="pt-0.5">
              <button
                type="button"
                onClick={async () => {
                  await syncWatchedFromStremio();
                }}
                disabled={isSyncingWatched || !user}
                className="w-full inline-flex items-center justify-center gap-2 py-2 px-4 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-semibold text-xs transition-all shadow cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <RefreshCw size={13} className={isSyncingWatched ? 'animate-spin' : ''} />
                {isSyncingWatched ? 'Sincronizando Histórico do Stremio...' : 'Sincronizar Filmes Vistos Agora'}
              </button>
              {!user && (
                <p className="text-[10px] text-amber-400/90 mt-1.5 flex items-center gap-1">
                  ⚠️ Conecte sua conta do Stremio (no botão de Login) para sincronizar os filmes assistidos.
                </p>
              )}
            </div>

            {/* Opção de sincronização automática */}
            <div className="pt-2 border-t border-white/5">
              <label className="flex items-start gap-2.5 cursor-pointer select-none group">
                <input
                  type="checkbox"
                  checked={autoSyncWatched}
                  onChange={(e) => setAutoSyncWatched(e.target.checked)}
                  disabled={!user}
                  className="mt-0.5 w-4 h-4 rounded border-white/20 bg-[#151824] text-purple-600 focus:ring-purple-500/30 focus:ring-offset-0 cursor-pointer disabled:opacity-50"
                />
                <div className="flex-1">
                  <span className="text-xs font-semibold text-gray-200 group-hover:text-white transition-colors">
                    Sincronizar vistos automaticamente em segundo plano
                  </span>
                  <span className="text-[10px] text-gray-400 leading-normal block mt-0.5">
                    Desativado por padrão para novos usuários. Quando ativado, monitora e sincroniza periodicamente no servidor os filmes que você assistir no Stremio.
                  </span>
                </div>
              </label>
            </div>
          </div>

          {/* Guide */}
          <div className="p-4 rounded-xl bg-[#1f2438] border border-white/10 space-y-2.5">
            <h4 className="text-sm font-bold text-purple-300 flex items-center gap-2">
              <BookOpen size={15} />
              How to add to Stremio:
            </h4>
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
                  <li><span className="text-purple-400 font-semibold">👁️ Watchlist: Watched History</span></li>
                </ul>
              </li>
            </ol>
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
            Save & Close
          </button>
        </div>
      </div>
    </div>
  );
};
