import React, { useState } from 'react';
import { AlertTriangle, X, ExternalLink, MessageSquare } from 'lucide-react';
import { trackEvent } from '../lib/analytics';
import { GitHubSponsorButton } from './GitHubSponsorButton';

const DISMISS_KEY = 'dismiss_beta_notice_until';
const DISMISS_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

export const Hero: React.FC = () => {
  const [dismissBetaBanner, setDismissBetaBanner] = useState<boolean>(() => {
    try {
      const dismissUntil = localStorage.getItem(DISMISS_KEY);
      if (dismissUntil) {
        const expiry = parseInt(dismissUntil, 10);
        if (!isNaN(expiry) && Date.now() < expiry) {
          return true;
        }
      }
      return false;
    } catch {
      return false;
    }
  });

  const handleDismiss = () => {
    setDismissBetaBanner(true);
    try {
      const expiry = Date.now() + DISMISS_DURATION_MS;
      localStorage.setItem(DISMISS_KEY, String(expiry));
      // Clean up legacy permanent dismiss key if present
      localStorage.removeItem('dismiss_beta_notice');
    } catch {
      // ignore
    }
  };

  if (dismissBetaBanner) {
    return null;
  }

  return (
    <div className="mb-6">
      <div className="p-3.5 sm:p-4 rounded-xl bg-amber-500/10 border border-amber-500/25 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs text-amber-200/90 leading-relaxed shadow-sm">
        <div className="flex items-start gap-2.5">
          <AlertTriangle size={16} className="text-amber-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold text-amber-300 uppercase tracking-wide mr-1.5 text-[10px] px-1.5 py-0.5 rounded bg-amber-400/20 border border-amber-400/30">
              Beta Notice
            </span>
            This addon is currently in public beta. Stream analysis and quality detection are actively being improved. If you encounter any misclassified releases or wish to support development, please{' '}
            <a
              href="https://tally.so/r/dbazxA"
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => trackEvent('feedback_link_clicked', { location: 'hero_text' })}
              className="font-bold text-amber-300 underline hover:text-white transition-colors inline-flex items-center gap-0.5"
            >
              share your feedback
              <ExternalLink size={11} className="inline ml-0.5" />
            </a>{' '}
            or sponsor the project.
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 self-end md:self-center flex-wrap">
          <GitHubSponsorButton size="sm" />

          <a
            href="https://tally.so/r/dbazxA"
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => trackEvent('feedback_link_clicked', { location: 'hero_button' })}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-amber-400/20 hover:bg-amber-400/30 text-amber-200 hover:text-white font-semibold text-xs border border-amber-400/40 transition-all cursor-pointer min-h-[30px] h-[30px]"
          >
            <MessageSquare size={12} />
            <span>Feedback</span>
          </a>

          <button
            onClick={handleDismiss}
            className="p-1.5 rounded-md text-amber-400/70 hover:text-amber-200 hover:bg-amber-500/20 transition-colors cursor-pointer"
            title="Dismiss for 24 hours"
            aria-label="Dismiss notice for 24 hours"
          >
            <X size={15} />
          </button>
        </div>
      </div>
    </div>
  );
};
