type QuickActionsProps = {
  onUpload: () => void;
  onAnalyze: () => void;
};

export function QuickActions({ onUpload, onAnalyze }: QuickActionsProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <button
        type="button"
        onClick={onUpload}
        className="group flex flex-col items-start gap-2 rounded-2xl border border-primary/20 bg-surface-container p-6 text-left transition hover:border-primary/40 hover:shadow-soft"
      >
        <span className="mb-1 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary transition group-hover:scale-105">
          <span className="material-symbols-outlined text-3xl">upload_file</span>
        </span>
        <span className="font-display text-lg font-bold">Cargar contrato</span>
        <span className="text-sm text-on-surface-variant">
          PDF con texto seleccionable o Word (.docx)
        </span>
        <span className="text-xs text-on-surface-variant/90">
          PDF/Word: sin límite de páginas · escaneos solo Pro (7 págs.)
        </span>
      </button>

      <button
        type="button"
        onClick={onAnalyze}
        className="group flex flex-col items-start gap-2 rounded-2xl border border-primary/20 bg-surface-container p-6 text-left transition hover:border-primary/40 hover:shadow-soft"
      >
        <span className="mb-1 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary transition group-hover:scale-105">
          <span className="material-symbols-outlined text-3xl">search_insights</span>
        </span>
        <span className="font-display text-lg font-bold">Nuevo análisis</span>
        <span className="text-sm text-on-surface-variant">
          Incluye detección de riesgos y referencias legales
        </span>
        <span className="text-xs text-on-surface-variant/90">
          PDF/Word sin límite de páginas · escaneos solo Pro
        </span>
      </button>
    </div>
  );
}
