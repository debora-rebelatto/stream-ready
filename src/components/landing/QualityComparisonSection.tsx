import React from 'react';
import { XCircle, CheckCircle2, Flame, Popcorn } from 'lucide-react';

export const QualityComparisonSection: React.FC = () => {
  return (
    <section className="max-w-5xl mx-auto px-4">
      <div className="text-center max-w-xl mx-auto mb-10">
        <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight mb-2">
          The Quality Dilemma, Solved.
        </h2>
        <p className="text-sm text-gray-400">
          Compare the frustrating manual search with automated release tracking.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 items-stretch">
        <div className="rounded-2xl bg-red-950/15 border border-red-500/20 p-6 sm:p-7 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-red-400 font-bold text-xs uppercase tracking-wider mb-4">
              <XCircle size={16} />
              <span>The Usual Stremio Experience</span>
            </div>
            <div className="space-y-3.5 text-xs text-gray-300">
              <div className="p-3.5 rounded-xl bg-black/40 border border-white/5 flex items-start gap-3">
                <XCircle size={16} className="text-red-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-white">45 streams found for new cinema title</p>
                  <p className="text-gray-400 text-[11px] mt-0.5">
                    You click play with excitement, only to find every link is a shaky Telesync
                    recorded on a phone in a cinema.
                  </p>
                </div>
              </div>
              <div className="p-3.5 rounded-xl bg-black/40 border border-white/5 flex items-start gap-3">
                <XCircle size={16} className="text-red-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-white">Manual weekly checking</p>
                  <p className="text-gray-400 text-[11px] mt-0.5">
                    Constantly checking forums, Reddit, or Stremio searches: "Has Dune 2 or
                    Gladiator dropped in digital yet?"
                  </p>
                </div>
              </div>
              <div className="p-3.5 rounded-xl bg-black/40 border border-white/5 flex items-start gap-3">
                <XCircle size={16} className="text-red-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-white">Ruined movie nights</p>
                  <p className="text-gray-400 text-[11px] mt-0.5">
                    Couch ready, popcorn in hand, only to suffer terrible audio, washed-out colors,
                    and people coughing in the theater.
                  </p>
                </div>
              </div>
            </div>
          </div>
          <div className="mt-6 pt-4 border-t border-red-500/10 text-[11px] text-red-300/80 font-medium">
            Frustrating, repetitive, and wastes your leisure time.
          </div>
        </div>

        <div className="rounded-2xl bg-purple-950/20 border border-purple-500/30 p-6 sm:p-7 flex flex-col justify-between relative shadow-lg">
          <div className="absolute top-4 right-4 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold">
            AUTOMATED
          </div>
          <div>
            <div className="flex items-center gap-2 text-purple-300 font-bold text-xs uppercase tracking-wider mb-4">
              <CheckCircle2 size={16} className="text-emerald-400" />
              <span>With Good Quality Tracker</span>
            </div>
            <div className="space-y-3.5 text-xs text-gray-300">
              <div className="p-3.5 rounded-xl bg-black/40 border border-purple-500/20 flex items-start gap-3">
                <CheckCircle2 size={16} className="text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-white">Anti-CAM Release Intelligence</p>
                  <p className="text-gray-400 text-[11px] mt-0.5">
                    Our regex filters isolate Telesync, HDCAM, and TC tags. You will never
                    accidentally launch a bad recording.
                  </p>
                </div>
              </div>
              <div className="p-3.5 rounded-xl bg-black/40 border border-purple-500/20 flex items-start gap-3">
                <CheckCircle2 size={16} className="text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-white">Automated 24/7 Cloud Monitoring</p>
                  <p className="text-gray-400 text-[11px] mt-0.5">
                    Our server checks providers every 30 minutes in the background with zero battery
                    or data consumption on your devices.
                  </p>
                </div>
              </div>
              <div className="p-3.5 rounded-xl bg-black/40 border border-purple-500/20 flex items-start gap-3">
                <CheckCircle2 size={16} className="text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-white">Instant Smart TV Home Sync</p>
                  <p className="text-gray-400 text-[11px] mt-0.5">
                    As soon as clean 1080p or 4K drops, it appears on your Smart TV home row with
                    the{' '}
                    <span className="inline-flex items-center gap-0.5 text-amber-300 font-semibold">
                      <Flame size={11} className="inline" /> NEW RELEASE
                    </span>{' '}
                    badge!
                  </p>
                </div>
              </div>
            </div>
          </div>
          <div className="mt-6 pt-4 border-t border-purple-500/20 text-[11px] text-emerald-300 font-semibold flex items-center justify-between">
            <span>Sit back, relax, and enjoy pristine cinema quality.</span>
            <span className="inline-flex items-center gap-1.5 text-purple-300">
              <Popcorn size={13} />
              <span>Popcorn ready</span>
            </span>
          </div>
        </div>
      </div>
    </section>
  );
};
