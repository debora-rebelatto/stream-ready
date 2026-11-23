import React, { useMemo, useState } from 'react';
import { UserPlus } from 'lucide-react';
import type { DailySignupsPoint } from '../../models';

interface DailySignupsChartProps {
  data?: DailySignupsPoint[];
}

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

export const DailySignupsChart: React.FC<DailySignupsChartProps> = ({ data = [] }) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const summary = useMemo(() => {
    if (data.length === 0) {
      return { maxSignups: 0, periodTotal: 0, todaySignups: 0, hasActivity: false };
    }
    let maxSignups = 0;
    let periodTotal = 0;
    for (const point of data) {
      if (point.newUsers > maxSignups) maxSignups = point.newUsers;
      periodTotal += point.newUsers;
    }
    const todaySignups = data[data.length - 1]?.newUsers ?? 0;
    return { maxSignups, periodTotal, todaySignups, hasActivity: maxSignups > 0 };
  }, [data]);

  const yAxisMax = Math.max(summary.maxSignups, 4);
  const yAxisMid = Math.round(yAxisMax / 2);
  const activePoint = hoveredIndex !== null ? data[hoveredIndex] : null;
  const labelStep = data.length <= 10 ? 1 : Math.ceil(data.length / 7);

  return (
    <section className="bg-[#151824] border border-white/5 rounded-2xl p-5 sm:p-6 shadow-sm space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/10">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400">
            <UserPlus size={18} />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-bold text-white tracking-tight">
              Daily New Accounts
            </h3>
            <p className="text-xs text-gray-400">
              New accounts created per day ({data.length} {data.length === 1 ? 'day' : 'days'})
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          {activePoint ? (
            <div className="px-3 py-1.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-300 font-medium">
              <span className="text-gray-300 mr-1.5">{formatFullDate(activePoint.date)}:</span>
              <strong className="text-white">{activePoint.newUsers}</strong>{' '}
              {activePoint.newUsers === 1 ? 'new account' : 'new accounts'}
              <span className="text-gray-400 ml-1.5">
                ({activePoint.cumulativeUsers} total)
              </span>
            </div>
          ) : (
            <>
              <div className="px-2.5 py-1 rounded-lg bg-[#1c2032] border border-white/5 text-gray-400">
                Today: <strong className="text-purple-300">{summary.todaySignups}</strong>
              </div>
              <div className="px-2.5 py-1 rounded-lg bg-[#1c2032] border border-white/5 text-gray-400">
                Period: <strong className="text-white">{summary.periodTotal}</strong>
              </div>
              <div className="px-2.5 py-1 rounded-lg bg-[#1c2032] border border-white/5 text-gray-400">
                Peak: <strong className="text-emerald-300">{summary.maxSignups}</strong>
              </div>
            </>
          )}
        </div>
      </div>

      {!summary.hasActivity ? (
        <div className="h-44 flex items-center justify-center rounded-xl bg-[#1c2032]/60 border border-white/5">
          <p className="text-xs text-gray-400">No new accounts created during this period.</p>
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

              {/* Bars */}
              <div
                className="relative z-10 h-full flex items-end gap-1 sm:gap-1.5"
                role="list"
                aria-label="Daily new accounts chart"
              >
                {data.map((point, index) => {
                  const heightPercent =
                    point.newUsers > 0 ? Math.max((point.newUsers / yAxisMax) * 100, 4) : 0;
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
                      aria-label={`${formatFullDate(point.date)}: ${point.newUsers} new accounts, ${point.cumulativeUsers} total`}
                      className="flex-1 h-full flex items-end justify-center group outline-none cursor-pointer"
                    >
                      <div
                        className={`w-full max-w-8 rounded-t-md transition-colors duration-200 ${
                          point.newUsers === 0
                            ? 'bg-white/5 h-[2px]'
                            : isHovered
                              ? 'bg-purple-400'
                              : 'bg-purple-500 group-hover:bg-purple-400'
                        }`}
                        style={point.newUsers > 0 ? { height: `${heightPercent}%` } : undefined}
                      />
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
