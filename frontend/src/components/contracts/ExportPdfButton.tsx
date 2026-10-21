import { useState } from 'react';
import { Link } from 'react-router-dom';
import { SETTINGS_BILLING_PATH } from '@/constants/app-paths';
import { descargarInforme, exportContractPdf } from '@/services/export.service';
import { getUserFacingErrorMessage } from '@/services/api/user-facing-errors';

type ExportPdfButtonProps = {
  contractId: string;
  isPro: boolean;
  label?: string;
  variant?: 'default' | 'cta';
  className?: string;
};

export function ExportPdfButton({
  contractId,
  isPro,
  label = 'Exportar PDF',
  variant = 'default',
  className = '',
}: ExportPdfButtonProps) {
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const handleExport = async () => {
    if (!isPro || exporting || !contractId) return;

    setExporting(true);
    setExportError(null);
    try {
      descargarInforme(await exportContractPdf(contractId));
    } catch (error) {
      // El servidor ya dice por que fallo: que el contrato no tiene analisis,
      // que el analisis sigue corriendo, que falta el plan. Tragarse ese
      // mensaje y responder "intenta de nuevo en unos segundos" manda a la
      // persona a repetir algo que no va a funcionar nunca, y a nosotros nos
      // deja sin diagnostico. El generico queda solo como ultimo recurso.
      setExportError(
        getUserFacingErrorMessage(error, {
          action: 'generar el PDF',
          resource: 'informe',
          fallback: 'No pudimos generar el PDF. Intenta de nuevo en unos segundos.',
        })
      );
    } finally {
      setExporting(false);
    }
  };

  if (!isPro) {
    return (
      <Link
        to={SETTINGS_BILLING_PATH}
        title="Exportación PDF disponible en plan Pro"
        className={
          variant === 'cta'
            ? `flex items-center justify-center gap-3 rounded-xl bg-surface px-8 py-4 text-sm font-bold text-on-surface transition hover:bg-surface-container ${className}`
            : `flex items-center gap-2 rounded-xl border border-outline-variant px-5 py-2.5 text-sm font-medium text-on-surface-variant transition hover:bg-surface-container ${className}`
        }
      >
        <span className="material-symbols-outlined text-lg">download</span>
        {label}
        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
          Pro
        </span>
      </Link>
    );
  }

  const defaultClass =
    'flex items-center gap-2 rounded-xl border border-primary/30 bg-primary-container/20 px-5 py-2.5 text-sm font-medium text-on-surface transition hover:bg-primary-container/40 disabled:cursor-wait disabled:opacity-70';
  const ctaClass =
    'flex w-full items-center justify-center gap-3 rounded-xl bg-surface px-8 py-4 text-sm font-bold text-on-surface transition hover:bg-surface-container disabled:cursor-wait disabled:opacity-80';

  return (
    <div className={variant === 'cta' ? 'w-full' : undefined}>
      <button
        type="button"
        onClick={() => void handleExport()}
        disabled={exporting || !contractId}
        title="Descargar informe en PDF"
        className={`${variant === 'cta' ? ctaClass : defaultClass} ${className}`}
      >
        <span className="material-symbols-outlined text-lg">
          {exporting ? 'hourglass_top' : variant === 'cta' ? 'check_circle' : 'download'}
        </span>
        {exporting ? 'Generando…' : label}
      </button>
      {exportError && (
        <p className="mt-2 text-sm text-red-700" role="alert">
          {exportError}
        </p>
      )}
    </div>
  );
}
