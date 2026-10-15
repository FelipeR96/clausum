type DocumentProcessingProgressProps = {
  title: string;
  message: string;
  percent?: number;
  hint?: string;
  className?: string;
};

export function DocumentProcessingProgress({
  title,
  message,
  percent,
  hint,
  className = '',
}: DocumentProcessingProgressProps) {
  const clampedPercent =
    percent !== undefined ? Math.max(4, Math.min(100, Math.round(percent))) : undefined;

  return (
    <div
      className={`rounded-2xl border border-primary/20 bg-primary-container/20 p-5 ${className}`}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="flex items-start gap-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10">
          <span className="material-symbols-outlined animate-spin text-primary">
            progress_activity
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-display text-base font-bold text-on-surface">{title}</p>
          <p className="mt-1 text-sm text-on-surface-variant">{message}</p>

          {clampedPercent !== undefined ? (
            <div className="mt-4">
              <div className="mb-1 flex items-center justify-between text-xs text-on-surface-variant">
                <span>Progreso</span>
                <span>{clampedPercent}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-surface-container">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-500 ease-out"
                  style={{ width: `${clampedPercent}%` }}
                />
              </div>
            </div>
          ) : (
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-surface-container">
              <div className="h-full w-1/3 animate-pulse rounded-full bg-primary/70" />
            </div>
          )}

          {hint && (
            <p className="mt-4 rounded-xl bg-surface/80 px-3 py-2 text-xs leading-relaxed text-on-surface-variant">
              {hint}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
