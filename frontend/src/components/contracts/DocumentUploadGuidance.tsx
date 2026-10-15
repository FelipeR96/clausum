import { Link } from 'react-router-dom';
import {
  DOCUMENT_FORMAT_NOTES,
  OCR_SCANNED_MAX_PAGES,
} from '@clausum/shared';

export type DocumentUploadGuidanceProps = {
  /** Si el plan actual incluye OCR para PDF escaneados */
  ocrAllowed?: boolean;
  /** `full` = panel detallado; `compact` = bajo la zona de drop; `banner` = una línea destacada */
  variant?: 'full' | 'compact' | 'banner';
  className?: string;
};

export function DocumentUploadGuidance({
  ocrAllowed = false,
  variant = 'full',
  className = '',
}: DocumentUploadGuidanceProps) {
  const ocrLimitNote = DOCUMENT_FORMAT_NOTES.ocrScannedLimit(OCR_SCANNED_MAX_PAGES);

  if (variant === 'banner') {
    return (
      <p
        className={`flex items-start gap-2 rounded-xl border border-primary/20 bg-primary-container/30 px-4 py-3 text-sm text-on-surface ${className}`}
      >
        <span className="material-symbols-outlined mt-0.5 shrink-0 text-primary">info</span>
        <span>
          <strong>PDF con texto seleccionable</strong> o <strong>Word (.docx)</strong>: sin límite
          de páginas.
          {!ocrAllowed ? (
            <>
              {' '}
              En plan Free <strong>no analizamos PDF escaneados</strong>.
            </>
          ) : (
            <>
              {' '}
              PDF escaneado: OCR solo en las <strong>primeras {OCR_SCANNED_MAX_PAGES} páginas</strong>
              .
            </>
          )}
        </span>
      </p>
    );
  }

  if (variant === 'compact') {
    return (
      <div
        className={`rounded-xl border border-outline-variant/80 bg-surface-container/60 px-3 py-2.5 text-xs leading-relaxed text-on-surface-variant ${className}`}
      >
        <p className="font-semibold text-on-surface">Formatos admitidos</p>
        <p className="mt-1">
          <span className="text-emerald-700">✓</span> PDF digital o Word (.docx):{' '}
          <strong>sin límite de páginas</strong>
        </p>
        {ocrAllowed ? (
          <p className="mt-1">
            <span className="text-amber-700">!</span> PDF escaneado: OCR en las primeras{' '}
            {OCR_SCANNED_MAX_PAGES} páginas
          </p>
        ) : (
          <p className="mt-1">
            <span className="text-amber-700">✗</span> PDF escaneado — solo en{' '}
            <Link to="/pricing" className="font-semibold text-primary hover:underline">
              Pro
            </Link>{' '}
            (primeras {OCR_SCANNED_MAX_PAGES} páginas con OCR)
          </p>
        )}
      </div>
    );
  }

  return (
    <aside
      className={`rounded-2xl border border-outline-variant/80 bg-surface-container/40 p-4 sm:p-5 ${className}`}
      aria-label="Guía de formatos de documento"
    >
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <span className="material-symbols-outlined">description</span>
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="font-display text-base font-bold text-on-surface">
            ¿Qué documento puedo subir?
          </h3>
          <p className="mt-1 text-sm text-on-surface-variant">
            Hay dos caminos: documentos con texto legible (recomendado) o escaneos con OCR en Pro.
          </p>
        </div>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/80 p-3">
          <p className="text-xs font-bold uppercase tracking-wide text-emerald-800">
            Sin límite de páginas
          </p>
          <ul className="mt-2 space-y-2 text-sm text-emerald-950">
            <li className="flex gap-2">
              <span className="material-symbols-outlined text-base text-emerald-600">check_circle</span>
              <span>
                <strong>PDF digital</strong> — puedes <strong>seleccionar y copiar</strong> el texto.
                Analizamos <strong>todas las páginas</strong> del archivo.
              </span>
            </li>
            <li className="flex gap-2">
              <span className="material-symbols-outlined text-base text-emerald-600">check_circle</span>
              <span>
                <strong>Word (.docx)</strong> — igual: <strong>sin tope de páginas</strong>, documento
                completo.
              </span>
            </li>
          </ul>
        </div>

        <div
          className={`rounded-xl border p-3 ${
            ocrAllowed
              ? 'border-primary/30 bg-primary-container/20'
              : 'border-amber-200/80 bg-amber-50/80'
          }`}
        >
          <p
            className={`text-xs font-bold uppercase tracking-wide ${
              ocrAllowed ? 'text-on-primary-container' : 'text-amber-900'
            }`}
          >
            PDF escaneado (foto o escáner)
          </p>
          {ocrAllowed ? (
            <ul className="mt-2 space-y-2 text-sm text-on-surface">
              <li className="flex gap-2">
                <span className="material-symbols-outlined text-base text-primary">document_scanner</span>
                <span>
                  Pro aplica OCR solo en las <strong>primeras {OCR_SCANNED_MAX_PAGES} páginas</strong>.
                  Si tu contrato escaneado es más largo, sube un PDF digital o Word con el texto
                  completo.
                </span>
              </li>
              <li className="flex gap-2">
                <span className="material-symbols-outlined text-base text-primary">info</span>
                <span>Mejor calidad de escaneo = mejor lectura.</span>
              </li>
            </ul>
          ) : (
            <ul className="mt-2 space-y-2 text-sm text-amber-950">
              <li className="flex gap-2">
                <span className="material-symbols-outlined text-base text-amber-700">block</span>
                <span>{DOCUMENT_FORMAT_NOTES.freeNoOcr}</span>
              </li>
              <li className="flex gap-2">
                <span className="material-symbols-outlined text-base text-amber-700">upgrade</span>
                <span>
                  <Link to="/pricing" className="font-semibold text-primary hover:underline">
                    Plan Pro
                  </Link>
                  : {ocrLimitNote}
                </span>
              </li>
            </ul>
          )}
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-outline-variant/60 bg-surface px-3 py-3">
        <p className="flex items-center gap-2 text-sm font-semibold text-on-surface">
          <span className="material-symbols-outlined text-base text-primary">help</span>
          ¿Cómo sé si mi PDF sirve sin OCR?
        </p>
        <p className="mt-1.5 text-sm leading-relaxed text-on-surface-variant">
          Abre el PDF y prueba <strong>seleccionar una palabra</strong>. Si puedes copiar texto, es
          digital y <strong>no hay límite de páginas</strong>. Si solo ves imagen y no puedes
          seleccionar nada, es escaneado
          {ocrAllowed
            ? ` — Pro lo lee con OCR (máx. ${OCR_SCANNED_MAX_PAGES} páginas).`
            : ' — en Free necesitas otra versión del documento o plan Pro.'}
        </p>
      </div>
    </aside>
  );
}
