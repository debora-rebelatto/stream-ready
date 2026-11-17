import React from 'react';
import { Vote, MessageSquare } from 'lucide-react';
import type { PollFeedbackMetric, PollCustomFeedback } from '../../models';

interface PollFeedbackCardProps {
  totalVotes: number;
  breakdown: PollFeedbackMetric[];
  customFeedback: PollCustomFeedback[];
}

export const PollFeedbackCard: React.FC<PollFeedbackCardProps> = ({
  totalVotes,
  breakdown,
  customFeedback,
}) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Poll Votes */}
      <div className="bg-[#151824] border border-white/5 rounded-2xl p-5 sm:p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400">
              <Vote size={18} />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-white tracking-tight">
                Community Roadmap Poll
              </h3>
              <p className="text-xs text-gray-400">
                User demand for requested platform enhancements.
              </p>
            </div>
          </div>
          <span className="text-xs font-bold text-purple-300 bg-purple-500/15 px-2.5 py-1 rounded-lg border border-purple-500/20">
            {totalVotes} Votes
          </span>
        </div>

        <div className="space-y-3.5 pt-1">
          {breakdown.length === 0 ? (
            <p className="text-xs text-gray-400">No poll votes recorded yet.</p>
          ) : (
            breakdown.map((item) => (
              <div key={item.option} className="space-y-1.5">
                <div className="flex justify-between text-xs font-semibold text-white">
                  <span>{item.option}</span>
                  <span className="text-purple-400">
                    {item.percentage}% ({item.count})
                  </span>
                </div>
                <div className="w-full bg-white/5 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-purple-500 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${item.percentage}%` }}
                  />
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* User Custom Feedback Suggestions */}
      <div className="bg-[#151824] border border-white/5 rounded-2xl p-5 sm:p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-2.5 pb-3 border-b border-white/10">
          <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400">
            <MessageSquare size={18} />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-bold text-white tracking-tight">
              User Suggestions &amp; Ideas
            </h3>
            <p className="text-xs text-gray-400">
              Direct feedback written by community members.
            </p>
          </div>
        </div>

        <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
          {customFeedback.length === 0 ? (
            <p className="text-xs text-gray-400">No user written feedback yet.</p>
          ) : (
            customFeedback.map((fb, idx) => (
              <div
                key={idx}
                className="p-3 rounded-xl bg-[#1c2032] border border-white/5 text-xs text-gray-200 leading-relaxed"
              >
                "{fb.customText}"
                {fb.createdAt && (
                  <span className="block text-[10px] text-gray-400 mt-1 font-mono">
                    {new Date(fb.createdAt).toLocaleDateString()}
                  </span>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
