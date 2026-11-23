import React from 'react';
import { SlidersHorizontal, Flame, Eye, Zap, Film, Lock } from 'lucide-react';

export const FeaturesGridSection: React.FC = () => {
  return (
    <section className="max-w-6xl mx-auto px-4">
      <div className="text-center max-w-xl mx-auto mb-12 sm:mb-16">
        <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight mb-3">
          Engineered for Serious Movie Lovers
        </h2>
        <p className="text-sm text-gray-400">
          More than a simple list — an intelligent assistant that watches stream releases so you
          don't have to.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="p-6 rounded-2xl bg-[#141624] border border-white/10 hover:border-purple-500/40 transition-all hover:-translate-y-1 group">
          <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400 mb-4 group-hover:scale-110 transition-transform">
            <SlidersHorizontal size={24} />
          </div>
          <h3 className="text-base font-bold text-white mb-2">1080p &amp; 4K Quality Filters</h3>
          <p className="text-xs text-gray-400 leading-relaxed">
            Have an OLED TV or Dolby Atmos setup? Choose "4K Ultra HD Only" globally or toggle
            per-movie. You won't be alerted until real 2160p arrives.
          </p>
        </div>

        <div className="p-6 rounded-2xl bg-[#141624] border border-white/10 hover:border-purple-500/40 transition-all hover:-translate-y-1 group">
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-4 group-hover:scale-110 transition-transform">
            <Flame size={24} />
          </div>
          <h3 className="text-base font-bold text-white mb-2">NEW RELEASE Badges</h3>
          <p className="text-xs text-gray-400 leading-relaxed">
            Spot fresh arrivals instantly. Any movie released or available in good quality within
            the last 3 months gets highlighted with a flaming badge in Stremio and web.
          </p>
        </div>

        <div className="p-6 rounded-2xl bg-[#141624] border border-white/10 hover:border-purple-500/40 transition-all hover:-translate-y-1 group">
          <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400 mb-4 group-hover:scale-110 transition-transform">
            <Eye size={24} />
          </div>
          <h3 className="text-base font-bold text-white mb-2">Auto-Archive upon Watching</h3>
          <p className="text-xs text-gray-400 leading-relaxed">
            Finished a film? Click the quick eye button to move it to your Watched History tab,
            automatically keeping your active catalog clean and organized.
          </p>
        </div>

        <div className="p-6 rounded-2xl bg-[#141624] border border-white/10 hover:border-purple-500/40 transition-all hover:-translate-y-1 group">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-4 group-hover:scale-110 transition-transform">
            <Zap size={24} />
          </div>
          <h3 className="text-base font-bold text-white mb-2">Debrid &amp; P2P Compatible</h3>
          <p className="text-xs text-gray-400 leading-relaxed">
            Works seamlessly with Torrentio, Real-Debrid, AllDebrid, Premiumize, Torbox, and
            standard community scrapers without extra plugins.
          </p>
        </div>

        <div className="p-6 rounded-2xl bg-[#141624] border border-white/10 hover:border-purple-500/40 transition-all hover:-translate-y-1 group">
          <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 mb-4 group-hover:scale-110 transition-transform">
            <Film size={24} />
          </div>
          <h3 className="text-base font-bold text-white mb-2">Direct IMDb &amp; URL Search</h3>
          <p className="text-xs text-gray-400 leading-relaxed">
            Search by title with instant Cinemeta auto-complete, or paste full IMDb links (e.g.
            imdb.com/title/tt1234567) to track with 1 click.
          </p>
        </div>

        <div className="p-6 rounded-2xl bg-[#141624] border border-white/10 hover:border-purple-500/40 transition-all hover:-translate-y-1 group">
          <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400 mb-4 group-hover:scale-110 transition-transform">
            <Lock size={24} />
          </div>
          <h3 className="text-base font-bold text-white mb-2">AES-256-GCM Encrypted</h3>
          <p className="text-xs text-gray-400 leading-relaxed">
            Your Stremio session is encrypted end-to-end. We never see or store your password, and
            we never collect or share personal telemetry.
          </p>
        </div>
      </div>
    </section>
  );
};
