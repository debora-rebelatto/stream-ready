import React from 'react';

export const HowItWorksSection: React.FC = () => {
  return (
    <section className="max-w-4xl mx-auto px-4">
      <div className="text-center max-w-lg mx-auto mb-12">
        <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight mb-2">
          Get Started in 60 Seconds
        </h2>
        <p className="text-xs sm:text-sm text-gray-400">
          No complicated terminal setups or manual port forwarding.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
        <div className="p-6 rounded-2xl bg-[#141624] border border-white/10 relative">
          <div className="w-8 h-8 rounded-full bg-[#7b42f6] text-white font-bold text-xs flex items-center justify-center mb-4 shadow-md">
            1
          </div>
          <h4 className="text-sm font-bold text-white mb-1.5">Connect Stremio (Required)</h4>
          <p className="text-xs text-gray-400 leading-relaxed">
            Connect your Stremio account with 1-click. Since player addons are read-only, linking
            your account enables cloud synchronization across all your TV and mobile devices.
          </p>
        </div>

        <div className="p-6 rounded-2xl bg-[#141624] border border-white/10 relative">
          <div className="w-8 h-8 rounded-full bg-[#7b42f6] text-white font-bold text-xs flex items-center justify-center mb-4 shadow-md">
            2
          </div>
          <h4 className="text-sm font-bold text-white mb-1.5">Add Movies on Website</h4>
          <p className="text-xs text-gray-400 leading-relaxed">
            Search for any cinema or upcoming movie directly on this dashboard. Adding movies
            happens here on the site because Stremio does not permit adding movies inside the
            player.
          </p>
        </div>

        <div className="p-6 rounded-2xl bg-[#141624] border border-white/10 relative">
          <div className="w-8 h-8 rounded-full bg-emerald-500 text-white font-bold text-xs flex items-center justify-center mb-4 shadow-md">
            3
          </div>
          <h4 className="text-sm font-bold text-white mb-1.5">Watch in True 1080p/4K</h4>
          <p className="text-xs text-gray-400 leading-relaxed">
            When quality releases drop, the movie automatically pops up in your TV Stremio Home
            Catalog ready to stream with high bitrate audio.
          </p>
        </div>
      </div>
    </section>
  );
};
