import React, { useState, useEffect } from 'react';
import { pollService } from '../../services';
import { trackEvent, safeStorage } from '../../utils';
import { Check, X, Send, Vote } from 'lucide-react';

export const POLL_DISMISS_KEY = 'stremio_dismiss_poll_until';
export const POLL_VOTED_KEY = 'stremio_poll_voted';
export const BETA_NOTICE_DISMISS_KEY = 'dismiss_beta_notice_until';
const COOLDOWN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export function isBetaNoticeDismissed(): boolean {
  const dismissUntil = safeStorage.get(BETA_NOTICE_DISMISS_KEY);
  if (dismissUntil) {
    const expiry = parseInt(dismissUntil, 10);
    if (!isNaN(expiry) && Date.now() < expiry) {
      return true;
    }
  }
  return false;
}

export interface FeatureOption {
  id: string;
  title: string;
  description: string;
}

export const FEATURE_OPTIONS: FeatureOption[] = [
  {
    id: 'notifications',
    title: 'Automated notifications',
    description: 'Telegram, Discord, or Email when a movie is available in 1080p/4K',
  },
  {
    id: 'tv_shows',
    title: 'TV Shows and Series support',
    description: 'Track episodes and upcoming seasons in good quality',
  },
  {
    id: 'import_lists',
    title: '1-Click import from Letterboxd, Trakt, or IMDb',
    description: 'Quickly transfer your existing watchlists',
  },
  {
    id: 'debrid_filters',
    title: 'Real-Debrid and provider source filtering',
    description: 'Filter streams by preferred debrid service or indexer',
  },
  {
    id: 'share_lists',
    title: 'Public list sharing with friends',
    description: 'Share your curated movie lists via public link',
  },
  {
    id: 'other',
    title: 'Other idea',
    description: 'Tell us what feature you would love to see',
  },
];

export interface FeaturePollCardProps {
  watchlistCount: number;
  userEmail?: string;
  isBetaNoticeVisible?: boolean;
}

export const FeaturePollCard: React.FC<FeaturePollCardProps> = ({
  watchlistCount,
  isBetaNoticeVisible,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [customText, setCustomText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);

  useEffect(() => {
    // If the poll banner appears in the beta notice, do not show it in other places
    const betaNoticeActive = isBetaNoticeVisible ?? !isBetaNoticeDismissed();
    if (betaNoticeActive) {
      setIsVisible(false);
      return;
    }

    // Only display to users who have actually engaged with the product (at least 1 movie tracked)
    if (watchlistCount < 1) {
      setIsVisible(false);
      return;
    }

    if (safeStorage.get(POLL_VOTED_KEY) === 'true') {
      setIsVisible(false);
      return;
    }

    const dismissedUntil = safeStorage.get(POLL_DISMISS_KEY);
    if (dismissedUntil) {
      const expiry = parseInt(dismissedUntil, 10);
      if (!isNaN(expiry) && Date.now() < expiry) {
        setIsVisible(false);
        return;
      }
    }

    // Verify with backend if user has already voted in Supabase
    pollService
      .getPollStatus()
      .then((status) => {
        if (status.hasVoted) {
          safeStorage.set(POLL_VOTED_KEY, 'true');
          setIsVisible(false);
        } else {
          setIsVisible(true);
        }
      })
      .catch(() => {
        setIsVisible(true);
      });
  }, [watchlistCount, isBetaNoticeVisible]);

  const handleDismiss = () => {
    setIsVisible(false);
    trackEvent('poll_dismissed', { reason: 'user_closed' });
    const expiry = Date.now() + COOLDOWN_DAYS_MS;
    safeStorage.set(POLL_DISMISS_KEY, String(expiry));
  };

  const handleSelect = async (optionId: string) => {
    if (isSubmitting || hasSubmitted) return;

    if (optionId === 'other') {
      setSelectedOption('other');
      return;
    }

    // Direct 1-click submission for standard options
    setIsSubmitting(true);
    setSelectedOption(optionId);
    try {
      const res = await pollService.submitPollVote(optionId);
      if (res.success) {
        // Note: 'poll_voted' is logged authoritatively by the server in submitPollVote
        safeStorage.set(POLL_VOTED_KEY, 'true');
        setHasSubmitted(true);
        setTimeout(() => {
          setIsVisible(false);
        }, 3500);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitCustom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting || hasSubmitted) return;

    setIsSubmitting(true);
    try {
      const res = await pollService.submitPollVote('other', customText.trim());
      if (res.success) {
        // Note: 'poll_voted' is logged authoritatively by the server in submitPollVote
        safeStorage.set(POLL_VOTED_KEY, 'true');
        setHasSubmitted(true);
        setTimeout(() => {
          setIsVisible(false);
        }, 3500);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isVisible) return null;

  return (
    <div className="relative mb-6 overflow-hidden rounded-2xl bg-linear-to-br from-[#1a1c2e] via-[#141624] to-[#0f111a] border border-purple-500/25 shadow-lg shadow-purple-950/20 p-4 sm:p-6 transition-all duration-300">
      {/* Background glow accent */}
      <div className="absolute -top-12 -right-12 w-48 h-48 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Close button */}
      <button
        onClick={handleDismiss}
        className="absolute top-3.5 right-3.5 p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
        title="Dismiss for 7 days"
        aria-label="Close poll"
      >
        <X size={16} />
      </button>

      {hasSubmitted ? (
        <div className="py-6 text-center flex flex-col items-center justify-center animate-fadeIn">
          <div className="w-12 h-12 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mb-3">
            <Check size={22} className="stroke-[2.5]" />
          </div>
          <h3 className="text-base sm:text-lg font-bold text-white mb-1">
            Thank you for your feedback!
          </h3>
          <p className="text-xs text-gray-400 max-w-md">
            Your vote directly shapes our product roadmap. We are building the features our
            community needs most.
          </p>
        </div>
      ) : (
        <div>
          {/* Header */}
          <div className="mb-4 pr-6">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-purple-500/20 text-purple-300 border border-purple-500/30">
                Community Feedback
              </span>
              <span className="text-xs text-gray-400 flex items-center gap-1">
                <Vote size={13} className="text-purple-400" />
                1-Click Vote
              </span>
            </div>
            <h3 className="text-base sm:text-lg font-bold text-white">
              Help shape the future of Stremio Watchlist
            </h3>
            <p className="text-xs text-gray-400 mt-0.5">
              Which of these improvements would you most like to see next?
            </p>
          </div>

          {/* Options Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mb-2">
            {FEATURE_OPTIONS.map((opt) => {
              const isSelected = selectedOption === opt.id;
              return (
                <button
                  key={opt.id}
                  onClick={() => handleSelect(opt.id)}
                  disabled={isSubmitting}
                  className={`text-left p-3 rounded-xl border transition-all cursor-pointer flex items-start gap-3 group relative ${
                    isSelected
                      ? 'bg-purple-600/20 border-purple-500 text-white shadow-sm shadow-purple-900/40'
                      : 'bg-white/2 hover:bg-white/6 border-white/10 text-gray-300 hover:border-purple-500/40 hover:text-white'
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded-full mt-0.5 shrink-0 border flex items-center justify-center transition-colors ${
                      isSelected
                        ? 'border-purple-400 bg-purple-500 text-white'
                        : 'border-white/30 group-hover:border-purple-400'
                    }`}
                  >
                    {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold leading-snug">{opt.title}</p>
                    <p className="text-[11px] text-gray-400 mt-0.5 leading-tight">
                      {opt.description}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Custom suggestion field when 'other' is selected */}
          {selectedOption === 'other' && (
            <form
              onSubmit={handleSubmitCustom}
              className="mt-3 pt-3 border-t border-white/10 animate-fadeIn"
            >
              <label
                htmlFor="custom-feedback"
                className="block text-xs font-medium text-purple-300 mb-1.5"
              >
                What feature or improvement do you have in mind?
              </label>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  id="custom-feedback"
                  type="text"
                  value={customText}
                  onChange={(e) => setCustomText(e.target.value)}
                  placeholder="e.g. trakt two-way sync, audio track language filter..."
                  maxLength={500}
                  required
                  autoFocus
                  className="flex-1 bg-[#0f111a] border border-white/15 rounded-xl px-3.5 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                />
                <button
                  type="submit"
                  disabled={isSubmitting || !customText.trim()}
                  className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
                >
                  <Send size={13} />
                  <span>Submit Vote</span>
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
};
