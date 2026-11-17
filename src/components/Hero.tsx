import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  X,
  ExternalLink,
  MessageSquare,
  Vote,
  Sparkles,
  Check,
  ChevronDown,
  ChevronUp,
  Send
} from 'lucide-react';
import { api } from '../lib/api';
import { trackEvent } from '../lib/analytics';
import { GitHubSponsorButton } from './GitHubSponsorButton';
import { FEATURE_OPTIONS, POLL_VOTED_KEY } from './FeaturePollCard';

const DISMISS_KEY = 'dismiss_beta_notice_until';
const DISMISS_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

interface HeroProps {
  onOpenSettings?: () => void;
}

export const Hero: React.FC<HeroProps> = () => {
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

  const [isPollExpanded, setIsPollExpanded] = useState<boolean>(true);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [customText, setCustomText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState<boolean>(() => {
    try {
      return localStorage.getItem(POLL_VOTED_KEY) === 'true';
    } catch {
      return false;
    }
  });
  const [votedOption, setVotedOption] = useState<string | null>(null);

  useEffect(() => {
    api.getPollStatus()
      .then((status) => {
        if (status.hasVoted) {
          try {
            localStorage.setItem(POLL_VOTED_KEY, 'true');
          } catch {}
          setHasSubmitted(true);
          if (status.vote?.selected_option) {
            setVotedOption(status.vote.selected_option);
          }
        }
      })
      .catch(() => {});
  }, []);

  const handleDismiss = () => {
    setDismissBetaBanner(true);
    try {
      const expiry = Date.now() + DISMISS_DURATION_MS;
      localStorage.setItem(DISMISS_KEY, String(expiry));
      localStorage.removeItem('dismiss_beta_notice');
    } catch {}
  };

  const handleSelect = async (optionId: string) => {
    if (isSubmitting) return;

    if (optionId === 'other') {
      setSelectedOption('other');
      return;
    }

    setIsSubmitting(true);
    setSelectedOption(optionId);
    try {
      const res = await api.submitPollVote(optionId);
      if (res.success) {
        trackEvent('poll_voted', { option: optionId, hasCustomText: false });
        try {
          localStorage.setItem(POLL_VOTED_KEY, 'true');
        } catch {}
        setHasSubmitted(true);
        setVotedOption(optionId);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitCustom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting || !customText.trim()) return;

    setIsSubmitting(true);
    try {
      const res = await api.submitPollVote('other', customText.trim());
      if (res.success) {
        trackEvent('poll_voted', { option: 'other', hasCustomText: Boolean(customText.trim()) });
        try {
          localStorage.setItem(POLL_VOTED_KEY, 'true');
        } catch {}
        setHasSubmitted(true);
        setVotedOption('other');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (dismissBetaBanner) {
    return null;
  }

  const votedTitle = FEATURE_OPTIONS.find((opt) => opt.id === votedOption)?.title;

  return (
    <div className="mb-6 rounded-2xl bg-[#131522] border border-amber-500/30 shadow-lg overflow-hidden transition-all">
      {/* 1. Top Beta Notice Row */}
      <div className="p-3.5 sm:p-4 bg-amber-500/10 border-b border-amber-500/20 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs text-amber-200/90 leading-relaxed">
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
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-amber-400/20 hover:bg-amber-400/30 text-amber-200 hover:text-white font-semibold text-xs border border-amber-400/40 transition-all cursor-pointer min-h-7.5 h-7.5"
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

      {/* 2. Feature Poll / Contribution Section */}
      <div className="p-4 sm:p-5 bg-gradient-to-br from-[#181a2b] via-[#141624] to-[#0f111a]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl bg-purple-500/15 border border-purple-500/30 text-purple-300 shrink-0 mt-0.5">
              <Vote size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  Community Roadmap
                </span>
                <span className="text-[11px] text-gray-400 flex items-center gap-1">
                  <Sparkles size={12} className="text-purple-400" />
                  1-Click Vote
                </span>
              </div>
              <h3 className="text-sm sm:text-base font-bold text-white tracking-tight">
                Would you like to contribute to the project?
              </h3>
              <p className="text-xs text-gray-400 mt-0.5">
                Help us prioritize our next updates! Vote below on which feature you would love to see next:
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsPollExpanded(!isPollExpanded)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs font-medium text-gray-300 hover:text-white border border-white/10 transition-colors cursor-pointer self-start sm:self-center shrink-0"
          >
            <span>{isPollExpanded ? 'Hide Poll' : 'Show Poll'}</span>
            {isPollExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        </div>

        {isPollExpanded && (
          <div className="pt-2 animate-fadeIn">
            {hasSubmitted ? (
              <div className="py-4 px-4 rounded-xl bg-emerald-500/10 border border-emerald-500/25 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center shrink-0">
                    <Check size={18} className="stroke-[2.5]" />
                  </div>
                  <div>
                    <strong className="block text-sm font-bold text-white">
                      Thank you for contributing!
                    </strong>
                    <span className="text-xs text-gray-300">
                      Your vote {votedTitle ? `for "${votedTitle}"` : ''} directly influences our development roadmap.
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setHasSubmitted(false)}
                  className="text-xs text-purple-400 hover:text-purple-300 underline font-medium cursor-pointer shrink-0"
                >
                  Change vote
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                  {FEATURE_OPTIONS.map((opt) => {
                    const isSelected = selectedOption === opt.id;
                    return (
                      <button
                        key={opt.id}
                        onClick={() => handleSelect(opt.id)}
                        disabled={isSubmitting}
                        className={`text-left p-3 rounded-xl border transition-all cursor-pointer flex items-start gap-2.5 group relative ${
                          isSelected
                            ? 'bg-purple-600/20 border-purple-500 text-white shadow-sm shadow-purple-900/40'
                            : 'bg-white/[0.03] hover:bg-white/[0.07] border-white/10 text-gray-300 hover:border-purple-500/40 hover:text-white'
                        }`}
                      >
                        <div
                          className={`w-3.5 h-3.5 rounded-full mt-0.5 shrink-0 border flex items-center justify-center transition-colors ${
                            isSelected
                              ? 'border-purple-400 bg-purple-500 text-white'
                              : 'border-white/30 group-hover:border-purple-400'
                          }`}
                        >
                          {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold leading-snug">{opt.title}</p>
                          <p className="text-[11px] text-gray-400 mt-0.5 leading-tight">{opt.description}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {selectedOption === 'other' && (
                  <form onSubmit={handleSubmitCustom} className="pt-2 animate-fadeIn">
                    <label htmlFor="hero-custom-feedback" className="block text-xs font-medium text-purple-300 mb-1.5">
                      What feature or improvement do you have in mind?
                    </label>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <input
                        id="hero-custom-feedback"
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
        )}
      </div>
    </div>
  );
};
