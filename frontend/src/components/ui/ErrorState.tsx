/**
 * Error State — clean error display with retry button.
 * Usage: <ErrorState message="Unable to load assets." onRetry={() => refetch()} />
 */
import { AlertTriangle } from "lucide-react";

export default function ErrorState({
  message = "Something went wrong.",
  onRetry,
  className = "",
}: {
  message?: string;
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <div className={`flex flex-col items-center justify-center py-16 gap-4 ${className}`}>
      <div className="w-14 h-14 rounded-2xl bg-red-50 dark:bg-red-950/30 flex items-center justify-center">
        <AlertTriangle className="w-7 h-7 text-red-500 dark:text-red-400" />
      </div>
      <p className="text-sm font-semibold text-surface-600 dark:text-zinc-400 text-center max-w-xs">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="px-5 py-2.5 rounded-lg border border-surface-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 hover:bg-surface-50 dark:hover:bg-zinc-800 text-sm font-bold text-surface-700 dark:text-zinc-300 shadow-sm transition-all cursor-pointer"
        >
          Retry
        </button>
      )}
    </div>
  );
}
