import React from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';

export interface FaqItem {
  q: string;
  a: string;
}

export interface LandingFaqSectionProps {
  faqs: FaqItem[];
  openFaq: number | null;
  setOpenFaq: (idx: number | null) => void;
}

export const LandingFaqSection: React.FC<LandingFaqSectionProps> = ({
  faqs,
  openFaq,
  setOpenFaq,
}) => {
  return (
    <section className="max-w-3xl mx-auto px-4">
      <div className="text-center max-w-md mx-auto mb-10">
        <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight mb-2">
          Frequently Asked Questions
        </h2>
        <p className="text-xs text-gray-400">
          Everything you need to know about Good Quality Tracker.
        </p>
      </div>

      <div className="divide-y divide-white/10 rounded-2xl bg-[#141624] border border-white/10 overflow-hidden shadow-xl">
        {faqs.map((faq, idx) => {
          const isOpen = openFaq === idx;
          return (
            <div key={idx} className="transition-colors">
              <button
                onClick={() => setOpenFaq(isOpen ? null : idx)}
                className="w-full p-4 sm:p-5 flex items-center justify-between gap-4 text-left hover:bg-white/2 cursor-pointer"
              >
                <span className="text-sm font-semibold text-white">{faq.q}</span>
                <span className="text-gray-400 shrink-0">
                  {isOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                </span>
              </button>
              {isOpen && (
                <div className="px-4 sm:px-5 pb-5 text-xs text-gray-300 leading-relaxed animate-fadeIn">
                  {faq.a}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
};
