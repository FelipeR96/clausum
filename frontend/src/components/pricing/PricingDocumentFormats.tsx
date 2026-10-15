import { DOCUMENT_FORMAT_NOTES, OCR_SCANNED_MAX_PAGES } from '@clausum/shared';

export function PricingDocumentFormats() {
  return (
    <section className="mt-14 rounded-3xl border border-outline-variant/80 bg-surface p-6 sm:p-8">
      <h2 className="font-display text-xl font-bold text-on-surface sm:text-2xl">
        Formatos de documento
      </h2>
      <p className="mt-2 max-w-3xl text-sm text-on-surface-variant sm:text-base">
        No es lo mismo un PDF “de verdad” que una foto del papel. Esto evita sorpresas al subir tu
        contrato. Las mismas reglas de formato y OCR aplican en Colombia y en el resto de LATAM.
      </p>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-emerald-200/80 bg-emerald-50/60 p-5">
          <p className="flex items-center gap-2 text-sm font-bold text-emerald-900">
            <span className="material-symbols-outlined text-lg">check_circle</span>
            PDF digital y Word (.doc, .docx)
          </p>
          <p className="mt-3 text-sm leading-relaxed text-emerald-950">
            {DOCUMENT_FORMAT_NOTES.digitalUnlimited}
          </p>
          <p className="mt-2 text-xs text-emerald-800">
            Disponible en Free y Pro. Ideal para contratos largos exportados desde Word, Google Docs
            o un PDF con texto seleccionable.
          </p>
        </div>

        <div className="rounded-2xl border border-primary/25 bg-primary-container/15 p-5">
          <p className="flex items-center gap-2 text-sm font-bold text-on-surface">
            <span className="material-symbols-outlined text-lg text-primary">document_scanner</span>
            PDF escaneado (solo Pro)
          </p>
          <p className="mt-3 text-sm leading-relaxed text-on-surface">
            {DOCUMENT_FORMAT_NOTES.ocrScannedLimit(OCR_SCANNED_MAX_PAGES)}
          </p>
          <p className="mt-2 text-xs text-on-surface-variant">
            {DOCUMENT_FORMAT_NOTES.freeNoOcr}
          </p>
        </div>
      </div>
    </section>
  );
}
