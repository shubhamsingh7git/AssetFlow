/**
 * Skeleton Loaders — shimmer placeholders for cards, tables, and charts.
 * Prevents layout shift while data loads.
 */

function SkeletonPulse({ className = "" }: { className?: string }) {
  return <div className={`bg-surface-200/60 dark:bg-zinc-800/60 rounded animate-pulse ${className}`} />;
}

export function SkeletonCard() {
  return (
    <div className="bg-white dark:bg-zinc-900 border border-surface-200/80 dark:border-zinc-800/80 rounded-xl p-5 shadow-sm flex flex-col justify-between h-28">
      <SkeletonPulse className="h-3 w-28" />
      <SkeletonPulse className="h-8 w-16 mt-auto" />
    </div>
  );
}

export function SkeletonTableRow({ cols = 5 }: { cols?: number }) {
  return (
    <tr>
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="p-4">
          <SkeletonPulse className="h-4 w-full max-w-[120px]" />
        </td>
      ))}
    </tr>
  );
}

export function SkeletonTable({ rows = 5, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="bg-white dark:bg-zinc-900 border border-surface-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-sm">
      <table className="w-full text-left text-sm border-collapse">
        <thead>
          <tr className="bg-surface-50 border-b border-surface-200">
            {Array.from({ length: cols }).map((_, i) => (
              <th key={i} className="p-4"><SkeletonPulse className="h-3 w-20" /></th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-surface-150 dark:divide-zinc-800">
          {Array.from({ length: rows }).map((_, i) => (
            <SkeletonTableRow key={i} cols={cols} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function SkeletonChart() {
  return (
    <div className="bg-white dark:bg-zinc-900 border border-surface-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm space-y-4">
      <SkeletonPulse className="h-3 w-40" />
      <SkeletonPulse className="h-36 w-full rounded-lg" />
    </div>
  );
}

export function SkeletonActivityList({ count = 3, rows }: { count?: number; rows?: number }) {
  const total = rows ?? count;
  return (
    <div className="bg-white dark:bg-zinc-900 border border-surface-200 dark:border-zinc-800 rounded-xl p-6 space-y-4 shadow-sm">
      <SkeletonPulse className="h-5 w-36" />
      <div className="space-y-3">
        {Array.from({ length: total }).map((_, i) => (
          <div key={i} className="flex justify-between items-center py-2 border-b border-surface-100 dark:border-zinc-800 last:border-b-0">
            <SkeletonPulse className="h-4 w-3/4" />
            <SkeletonPulse className="h-3 w-16" />
          </div>
        ))}
      </div>
    </div>
  );
}

