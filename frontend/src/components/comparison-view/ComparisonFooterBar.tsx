import { Link } from 'react-router-dom';
import type { ComparisonReviewStatus } from '@clausum/shared';

type ComparisonFooterBarProps = {
  reviewStatus: ComparisonReviewStatus;
  submitting: boolean;
  onDiscard: () => void;
  onApprove: () => void;
};

export function ComparisonFooterBar({
  reviewStatus,
  submitting,
  onDiscard,
  onApprove,
}: ComparisonFooterBarProps) {
  const reviewed = reviewStatus === 'approved' || reviewStatus === 'discarded';

  return (
    <footer className="flex shrink-0 flex-col items-center justify-between gap-4 border-t border-outline-variant/60 bg-surface px-4 py-4 sm:flex-row sm:px-6">
      <div className="flex flex-wrap items-center justify-center gap-4 text-sm text-on-surface-variant sm:justify-start">
        <p>El análisis de Clausum no constituye asesoría legal.</p>
        <Link to="/pricing" className="hidden hover:text-primary sm:inline">
          Planes
        </Link>
      </div>

      <div className="flex flex-col items-center gap-2 sm:items-end">
        {reviewed && (
          <p className="text-xs font-semibold text-on-surface-variant">
            {reviewStatus === 'approved'
              ? 'Revisión aprobada'
              : 'Revisión descartada'}
          </p>
        )}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onDiscard}
            disabled={submitting || reviewed}
            className="rounded-xl px-4 py-2 text-sm font-semibold text-on-surface-variant transition hover:bg-surface-container disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? 'Guardando…' : 'Descartar cambios'}
          </button>
          <button
            type="button"
            onClick={onApprove}
            disabled={submitting || reviewed}
            className="rounded-xl bg-primary px-6 py-2 text-sm font-semibold text-on-primary shadow-soft transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? 'Guardando…' : 'Aprobar revisión'}
          </button>
        </div>
      </div>
    </footer>
  );
}
