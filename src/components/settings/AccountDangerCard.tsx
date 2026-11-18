import React from 'react';
import { AlertTriangle, Trash2, LogOut } from 'lucide-react';
import type { StremioUser } from '../../models';
import { Button, Badge } from '../common';

export interface AccountDangerCardProps {
  user: StremioUser | null;
  onLogout: () => void;
  onOpenDeleteAccount?: () => void;
}

export const AccountDangerCard: React.FC<AccountDangerCardProps> = ({
  user,
  onLogout,
  onOpenDeleteAccount,
}) => {
  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      <div className="bg-[#151824] border border-white/5 rounded-2xl p-5 sm:p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div>
            <h2 className="text-base font-bold text-white tracking-tight">Account Overview</h2>
            <p className="text-xs text-gray-400">
              Information about your linked Stremio profile and session.
            </p>
          </div>
          {user && (
            <Badge variant="emerald" size="sm" dot>
              Connected
            </Badge>
          )}
        </div>

        {user ? (
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3.5 rounded-xl bg-[#1c2032] border border-white/5">
              <div>
                <span className="text-[11px] text-gray-400 block">Stremio Account Email</span>
                <span className="text-sm font-semibold text-white">{user.email}</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={onLogout}
                icon={<LogOut size={13} className="text-red-400" />}
                className="text-red-300 hover:text-red-200 hover:bg-red-500/10 border-red-500/25"
              >
                Log Out
              </Button>
            </div>
          </div>
        ) : (
          <p className="text-xs text-gray-400">No active Stremio account session found.</p>
        )}
      </div>

      {user && (
        <div className="bg-red-950/20 border border-red-500/25 rounded-2xl p-5 sm:p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-red-500/20 border-b">
            <div className="p-2 rounded-xl bg-red-500/10 text-red-400">
              <AlertTriangle size={18} />
            </div>
            <div>
              <h2 className="text-base font-bold text-red-400 tracking-tight">Danger Zone</h2>
              <p className="text-xs text-gray-400">
                Irreversible actions that permanently delete your data.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-xs text-gray-300 leading-relaxed">
              Deleting your account will permanently wipe all your saved watchlist movies, custom
              lists, watched history records, and synchronization tokens from the cloud database.
            </p>

            <Button
              variant="danger"
              onClick={() => {
                if (onOpenDeleteAccount) {
                  onOpenDeleteAccount();
                }
              }}
              icon={<Trash2 size={14} />}
            >
              Delete Account &amp; Wipe Data
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
