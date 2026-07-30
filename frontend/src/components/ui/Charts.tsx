
// ─── Donut / Pie Chart ───────────────────────────────────────────────────────
export interface ChartDataItem {
  label: string;
  value: number;
  color?: string;
}

const DEFAULT_COLORS = ['#4f46e5', '#0284c7', '#16a34a', '#d97706', '#dc2626', '#8b5cf6', '#ec4899', '#64748b'];

export function DonutChart({ data, title, totalLabel = "Total" }: { data: ChartDataItem[]; title?: string; totalLabel?: string }) {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  let cumulativeAngle = 0;

  if (total === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-6 text-xs text-surface-400">
        No chart data available
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center">
      {title && <h4 className="text-xs font-extrabold uppercase tracking-wider text-surface-500 dark:text-zinc-400 mb-4">{title}</h4>}
      <div className="relative w-44 h-44">
        <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
          {data.map((item, i) => {
            const percentage = item.value / total;
            const strokeDasharray = `${percentage * 282.7} 282.7`;
            const strokeDashoffset = -cumulativeAngle * 282.7;
            cumulativeAngle += percentage;
            const color = item.color || DEFAULT_COLORS[i % DEFAULT_COLORS.length];

            return (
              <circle
                key={item.label}
                cx="50"
                cy="50"
                r="45"
                fill="transparent"
                stroke={color}
                strokeWidth="10"
                strokeDasharray={strokeDasharray}
                strokeDashoffset={strokeDashoffset}
                className="transition-all duration-500 hover:opacity-80 cursor-pointer"
              />
            );
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-xl font-extrabold font-mono text-surface-900 dark:text-white">{total}</span>
          <span className="text-[10px] font-semibold text-surface-500 uppercase tracking-wider">{totalLabel}</span>
        </div>
      </div>

      {/* Legend */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 mt-4 w-full text-xs">
        {data.map((item, i) => {
          const color = item.color || DEFAULT_COLORS[i % DEFAULT_COLORS.length];
          const pct = Math.round((item.value / total) * 100);
          return (
            <div key={item.label} className="flex items-center justify-between">
              <div className="flex items-center space-x-1.5 truncate">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                <span className="truncate text-surface-650 dark:text-zinc-400 font-medium">{item.label}</span>
              </div>
              <span className="font-mono font-bold text-surface-900 dark:text-zinc-200 ml-1">{item.value} ({pct}%)</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Bar Chart ───────────────────────────────────────────────────────────────
export function BarChart({ data, title }: { data: ChartDataItem[]; title?: string }) {
  const maxValue = Math.max(...data.map(d => d.value), 1);

  return (
    <div className="w-full">
      {title && <h4 className="text-xs font-extrabold uppercase tracking-wider text-surface-500 dark:text-zinc-400 mb-4">{title}</h4>}
      <div className="space-y-2.5">
        {data.map((item, i) => {
          const pct = Math.round((item.value / maxValue) * 100);
          const color = item.color || DEFAULT_COLORS[i % DEFAULT_COLORS.length];

          return (
            <div key={item.label} className="space-y-1">
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-surface-700 dark:text-zinc-300 truncate">{item.label}</span>
                <span className="font-mono font-bold text-surface-900 dark:text-white">{item.value.toLocaleString()}</span>
              </div>
              <div className="w-full h-2.5 bg-surface-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${Math.max(pct, 4)}%`, backgroundColor: color }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Area / Line Trend Chart ─────────────────────────────────────────────────
export function TrendChart({ data, title, height = 120 }: { data: { label: string; value: number }[]; title?: string; height?: number }) {
  if (data.length < 2) {
    return <div className="text-xs text-surface-400 text-center py-4">Insufficient data for trend</div>;
  }

  const maxValue = Math.max(...data.map(d => d.value), 1);
  const points = data.map((d, index) => {
    const x = (index / (data.length - 1)) * 300;
    const y = height - (d.value / maxValue) * (height - 20) - 10;
    return `${x},${y}`;
  }).join(' ');

  const areaPoints = `0,${height} ${points} 300,${height}`;

  return (
    <div className="w-full">
      {title && <h4 className="text-xs font-extrabold uppercase tracking-wider text-surface-500 dark:text-zinc-400 mb-2">{title}</h4>}
      <div className="w-full relative" style={{ height: `${height}px` }}>
        <svg viewBox={`0 0 300 ${height}`} className="w-full h-full overflow-visible">
          <defs>
            <linearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#4f46e5" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#4f46e5" stopOpacity="0.0" />
            </linearGradient>
          </defs>
          <polygon points={areaPoints} fill="url(#trendGradient)" />
          <polyline fill="none" stroke="#4f46e5" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" points={points} />
          {data.map((d, index) => {
            const x = (index / (data.length - 1)) * 300;
            const y = height - (d.value / maxValue) * (height - 20) - 10;
            return (
              <circle key={d.label} cx={x} cy={y} r="4" fill="#4f46e5" stroke="#ffffff" strokeWidth="2" />
            );
          })}
        </svg>
      </div>
      <div className="flex justify-between text-[10px] font-semibold text-surface-500 dark:text-zinc-500 mt-2">
        {data.map(d => (
          <span key={d.label}>{d.label}</span>
        ))}
      </div>
    </div>
  );
}
