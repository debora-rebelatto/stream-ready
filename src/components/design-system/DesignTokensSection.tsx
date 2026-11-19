import React, { useState } from 'react';
import { Copy, Check, Palette } from 'lucide-react';
import { DESIGN_COLOR_TOKENS, DESIGN_TYPOGRAPHY_TOKENS } from '../../models';
import { Card, Badge } from '../common';

export const DesignTokensSection: React.FC = () => {
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  const handleCopyToken = (val: string) => {
    navigator.clipboard.writeText(val).catch(() => {});
    setCopiedToken(val);
    setTimeout(() => setCopiedToken(null), 1500);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-150">
      {/* Color Tokens Palette */}
      <Card
        header={
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400">
                <Palette size={18} />
              </div>
              <div>
                <h2 className="text-base font-bold text-white tracking-tight">
                  Color Palette &amp; CSS Tokens
                </h2>
                <p className="text-xs text-gray-400">
                  Dark-first cinema theme engineered for Stremio TV and web contrast. Click any
                  token to copy.
                </p>
              </div>
            </div>
            <Badge variant="purple" size="xs" uppercase>
              {DESIGN_COLOR_TOKENS.length} Tokens
            </Badge>
          </div>
        }
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {DESIGN_COLOR_TOKENS.map((token) => (
            <button
              key={token.cssVar}
              type="button"
              onClick={() => handleCopyToken(`var(${token.cssVar})`)}
              className="group flex items-start gap-3.5 p-3.5 rounded-xl bg-[#1a1e2e] border border-white/5 hover:border-purple-500/40 text-left transition-all cursor-pointer"
            >
              <div
                className="w-11 h-11 rounded-xl border border-white/15 shrink-0 shadow-inner"
                style={{ backgroundColor: token.hex }}
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-white truncate">{token.name}</span>
                  <span className="text-[10px] font-mono text-gray-400 group-hover:text-purple-300 flex items-center gap-1 shrink-0">
                    {copiedToken === `var(${token.cssVar})` ? (
                      <>
                        <Check size={11} className="text-emerald-400" /> Copied
                      </>
                    ) : (
                      <>
                        <Copy size={11} /> {token.hex}
                      </>
                    )}
                  </span>
                </div>
                <code className="block text-[10px] font-mono text-purple-300 mt-0.5">
                  {token.cssVar}
                </code>
                <p className="text-[11px] text-gray-400 mt-1 line-clamp-2 leading-relaxed">
                  {token.usage}
                </p>
              </div>
            </button>
          ))}
        </div>
      </Card>

      {/* Typography Hierarchy */}
      <Card
        header={
          <div>
            <h2 className="text-base font-bold text-white tracking-tight">
              Typography &amp; Hierarchy Scale
            </h2>
            <p className="text-xs text-gray-400">
              Responsive typographic scale optimized for high-density movie grids and analytics
              dashboards.
            </p>
          </div>
        }
      >
        <div className="divide-y divide-white/5">
          {DESIGN_TYPOGRAPHY_TOKENS.map((typo) => (
            <div
              key={typo.name}
              className="py-4 first:pt-0 last:pb-0 flex flex-col md:flex-row md:items-center justify-between gap-3"
            >
              <div className="space-y-1 max-w-sm">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-white">{typo.name}</span>
                  <Badge variant="neutral" size="xs">
                    {typo.sizeLabel}
                  </Badge>
                </div>
                <p className="text-[11px] text-gray-400">{typo.usage}</p>
                <code className="block text-[10px] font-mono text-purple-300">
                  {typo.className}
                </code>
              </div>
              <div className="p-3 rounded-xl bg-black/30 border border-white/5 flex-1">
                <span className={`${typo.className} text-white block truncate`}>
                  Dune: Part Two • 4K UHD Release Confirmed
                </span>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};
