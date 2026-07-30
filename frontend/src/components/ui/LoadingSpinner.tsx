/**
 * Loading Spinner — matches AssetFlow design tokens.
 * Usage: <LoadingSpinner /> or <LoadingSpinner text="Loading assets..." />
 */
export default function LoadingSpinner({ text = "Loading AssetFlow...", className = "" }: { text?: string; className?: string }) {
  return (
    <div className={`flex flex-col items-center justify-center py-16 gap-4 ${className}`}>
      <div className="w-8 h-8 border-3 border-surface-200 border-t-brand-900 rounded-full animate-spin" />
      <p className="text-sm font-semibold text-surface-500 dark:text-zinc-500 tracking-wide">{text}</p>
    </div>
  );
}
