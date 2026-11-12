import React, { useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';

export const Hero: React.FC = () => {
  const [dismissBetaBanner, setDismissBetaBanner] = useState<boolean>(() => {
    try {
      return localStorage.getItem('dismiss_beta_notice') === 'true';
    } catch {
      return false;
    }
  });

  const handleDismiss = () => {
    setDismissBetaBanner(true);
    try {
      localStorage.setItem('dismiss_beta_notice', 'true');
    } catch {
      // ignore
    }
  };

  if (dismissBetaBanner) {
    return null;
  }

  return (
    <div className="mb-6">
      <div className="p-3.5 sm:p-4 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-start justify-between gap-3 text-xs text-amber-200/90 leading-relaxed shadow-sm">
        <div className="flex items-start gap-2.5">
          <AlertTriangle size={16} className="text-amber-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold text-amber-300 uppercase tracking-wide mr-1.5 text-[10px] px-1.5 py-0.5 rounded bg-amber-400/20 border border-amber-400/30">
              Beta Notice
            </span>
            This addon is currently in public beta. Stream analysis and quality detection are actively being improved. If you encounter any misclassified releases or missing streams, please recheck the item or submit feedback.
          </div>
        </div>
        <button
          onClick={handleDismiss}
          className="p-1 rounded text-amber-400/70 hover:text-amber-200 hover:bg-amber-500/20 transition-colors shrink-0 cursor-pointer"
          title="Dismiss notice"
          aria-label="Dismiss notice"
        >
          <X size={15} />
        </button>
      </div>
    </div>
  );
};
