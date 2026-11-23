import React, { useMemo, useState } from 'react';
import { Film } from 'lucide-react';
import type { DailyMoviesAddedPoint } from '../../models';

interface DailyMoviesAddedChartProps {
  data?: DailyMoviesAddedPoint[];
}

const SOURCE_SERIES = [
  { key: 'search', label: 'search', colorClass: 'bg-blue-500', textClass: 'text-blue-400' },
  {
    key: 'recommendations',
    label: 'recommendations',
    colorClass: 'bg-amber-500',
    textClass: 'text-amber-400',
  },
  {
    key: 'curated_list',
    label: 'curated_list',
    colorClass: 'bg-emerald-500',
    textClass: 'text-emerald-400',
  },
  { key: 'manual', label: 'manual', colorClass: 'bg-purple-500', textClass: 'text-purple-400' },
] as const;

function formatShortDate(isoDate: string): string {
  const [year, month, day] = isoDate.split('-').map(Number);
  if (!year || !month || !day) return isoDate;
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
}

function formatFullDate(isoDate: string): string {
  const [year, month, day] = isoDate.split('-').map(Number);
  if (!year || !month || !day) return isoDate;
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

function toPercent(part: number, total: number): number {
  return total > 0 ? Math.round((part / total) * 100) : 0;
}

export const DailyMoviesAddedChart: React.FC<DailyMoviesAddedChartProps> = ({ data = [] }) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const summary = useMemo(() => {
    let maxTotal = 0;
    let total = 0;
    const totals = { search: 0, recommendations: 0, curated_list: 0, manual: 0 };
    for (const point of data) {
      if (point.total > maxTotal) maxTotal = point.total;
      total += point.total;
      totals.search += point.search;
      totals.recommendations += point.recommendations;
      totals.curated_list += point.curated_list;
      totals.manual += point.manual;
    }
    return { maxTotal, total, totals, hasActivity: maxTotal > 0 };
  }, [data]);

  const yAxisMax = Math.max(summary.maxTotal, 4);
  const yAxisMid = Math.round(yAxisMax / 2);
  const activePoint = hoveredIndex !== null ? data[hoveredIndex] : null;
  const labelStep = data.length <= 10 ? 1 : Math.ceil(data.length / 7);

  return (
    <section className="bg-[#151824] border border-white/5 rounded-2xl p-5 sm:p-6 shadow-sm space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/10">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400">
            <Film size={18} />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-bold text-white tracking-tight">
              Daily Movies Added by Analytics Source
            </h3>
            <p className="text-xs text-gray-400">
              Breakdown by analytics event source ({data.length}{' '}
              {data.length === 1 ? 'day' : 'days'})
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          {activePoint ? (
            <div className="px-3 py-1.5 rounded-xl bg-[#1c2032] border border-white/10 text-gray-300 font-medium flex flex-wrap items-center gap-2">
              <span>{formatFullDate(activePoint.date)}:</span>
              <strong className="text-white">{activePoint.total}</strong>
              {SOURCE_SERIES.map((s) => (
                <span key={s.key} className={`${s.textClass} font-mono text-[11px]`}>
                  {s.label}: {activePoint[s.key]}
                </span>
              ))}
            </div>
          ) : (
            <div className="px-2.5 py-1 rounded-lg bg-[#1c2032] border border-white/5 text-gray-400">
              Period Total: <strong className="text-white">{summary.total}</strong>
            </div>
          )}
        </div>
      </div>

      {/* Analytics Source Breakdown Legend */}
      <div className="flex flex-wrap items-center gap-2.5 text-xs">
        {SOURCE_SERIES.map((s) => {
          const count = summary.totals[s.key];
          return (
            <div
              key={s.key}
              className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-[#1c2032] border border-white/5"
            >
              <span className={`w-2.5 h-2.5 rounded-sm ${s.colorClass} shrink-0`} />
              <span className="font-mono text-gray-300">{s.label}</span>
              <strong className="text-white">{count}</strong>
              <span className="text-gray-500">({toPercent(count, summary.total)}%)</span>
            </div>
          );
        })}
      </div>

      {!summary.hasActivity ? (
        <div className="h-44 flex items-center justify-center rounded-xl bg-[#1c2032]/60 border border-white/5">
          <p className="text-xs text-gray-400">No movies added during this period.</p>
        </div>
      ) : (
        <div className="pt-2">
          <div className="flex items-stretch gap-3">
            {/* Y-axis scale */}
            <div className="flex flex-col justify-between text-[10px] font-mono text-gray-500 py-0.5 w-7 text-right shrink-0 select-none">
              <span>{yAxisMax}</span>
              <span>{yAxisMid}</span>
              <span>0</span>
            </div>

            {/* Plot area */}
            <div className="relative flex-1 h-44">
              {/* Horizontal gridlines */}
              <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
                <div className="border-t border-white/5 w-full" />
                <div className="border-t border-dashed border-white/5 w-full" />
                <div className="border-t border-white/10 w-full" />
              </div>

              {/* Stacked Solid Bars */}
              <div
                className="relative z-10 h-full flex items-end gap-1 sm:gap-1.5"
                role="list"
                aria-label="Daily movies added by analytics source chart"
              >
                {data.map((point, index) => {
                  const totalHeight =
                    point.total > 0 ? Math.max((point.total / yAxisMax) * 100, 4) : 0;
                  const isHovered = hoveredIndex === index;

                  return (
                    <div
                      key={point.date}
                      role="listitem"
                      tabIndex={0}
                      onMouseEnter={() => setHoveredIndex(index)}
                      onMouseLeave={() => setHoveredIndex(null)}
                      onFocus={() => setHoveredIndex(index)}
                      onBlur={() => setHoveredIndex(null)}
                      aria-label={`${formatFullDate(point.date)}: ${point.total} movies (search ${point.search}, recommendations ${point.recommendations}, curated_list ${point.curated_list}, manual ${point.manual})`}
                      className="flex-1 h-full flex items-end justify-center outline-none cursor-pointer"
                    >
                      {point.total === 0 ? (
                        <div className="w-full max-w-8 rounded-t-md bg-white/5 h-[2px]" />
                      ) : (
                        <div
                          className={`w-full max-w-8 rounded-t-md overflow-hidden flex flex-col-reverse transition-opacity duration-150 ${
                            hoveredIndex !== null && !isHovered ? 'opacity-50' : 'opacity-100'
                          }`}
                          style={{ height: `${totalHeight}%` }}
                        >
                          {SOURCE_SERIES.map((s) =>
                            point[s.key] > 0 ? (
                              <div
                                key={s.key}
                                className={`w-full ${s.colorClass}`}
                                style={{ height: `${(point[s.key] / point.total) * 100}%` }}
                              />
                            ) : null
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* X-axis date labels */}
          <div className="flex items-center gap-1 sm:gap-1.5 pl-10 mt-2">
            {data.map((point, index) => {
              const showLabel =
                index === 0 || index === data.length - 1 || index % labelStep === 0;
              return (
                <div
                  key={point.date}
                  className="flex-1 text-center text-[10px] font-mono text-gray-500 truncate select-none"
                >
                  {showLabel ? formatShortDate(point.date) : ''}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
};
