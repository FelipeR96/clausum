import { useEffect, useState } from 'react';
import {
  fetchPlan,
  savePlanLimits,
  type PlanLimits,
  type PlanSlug,
} from '@/services/admin.service';
import { getUserFacingErrorMessage } from '@/services/api/user-facing-errors';

const NUMERICOS: { clave: keyof PlanLimits; etiqueta: string; ayuda?: string }[] = [
  { clave: 'analysesPerMonth', etiqueta: 'Análisis al mes', ayuda: '-1 = sin límite' },
  { clave: 'comparisonsPerMonth', etiqueta: 'Comparaciones al mes', ayuda: '-1 = sin límite' },
  { clave: 'maxFileSizeMb', etiqueta: 'Tamaño máximo (MB)' },
  { clave: 'maxContracts', etiqueta: 'Contratos guardados', ayuda: '-1 = sin límite' },
  { clave: 'historyMaxEntries', etiqueta: 'Entradas de historial' },
];

const BOOLEANOS: { clave: keyof PlanLimits; etiqueta: string }[] = [
  { clave: 'ocrScannedPdf', etiqueta: 'OCR de PDF escaneados' },
  { clave: 'exportPdf', etiqueta: 'Exportar a PDF' },
  { clave: 'fullHistory', etiqueta: 'Historial completo' },
  { clave: 'alertsAdvanced', etiqueta: 'Alertas avanzadas' },
  { clave: 'apiAccess', etiqueta: 'Acceso por API' },
];

function PanelPlan({ slug }: { slug: PlanSlug }) {
  const [limits, setLimits] = useState<PlanLimits | null>(null);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  useEffect(() => {
    let vigente = true;
    fetchPlan(slug)
      .then((p) => {
        if (vigente) setLimits(p.limits);
      })
      .catch((err) => {
        if (vigente) setError(getUserFacingErrorMessage(err));
      })
      .finally(() => {
        if (vigente) setCargando(false);
      });
    return () => {
      vigente = false;
    };
  }, [slug]);

  function cambiar<K extends keyof PlanLimits>(clave: K, valor: PlanLimits[K]) {
    setLimits((prev) => (prev ? { ...prev, [clave]: valor } : prev));
    setAviso(null);
  }

  async function guardar() {
    if (!limits) return;
    setGuardando(true);
    setError(null);
    setAviso(null);
    try {
      const r = await savePlanLimits(slug, limits);
      setLimits(r.limits);
      setAviso('Límites guardados. Tardan hasta un minuto en aplicarse.');
    } catch (err) {
      setError(getUserFacingErrorMessage(err));
    } finally {
      setGuardando(false);
    }
  }

  if (cargando) {
    return <p className="text-sm text-on-surface-variant">Cargando {slug}…</p>;
  }
  if (!limits) {
    return (
      <p className="text-sm text-error">
        {error ?? `No se pudo cargar el plan ${slug}.`}
      </p>
    );
  }

  return (
    <div className="rounded-2xl border border-outline/30 p-5">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-on-surface-variant">
        Plan {slug}
      </h3>

      <div className="mt-4 space-y-3">
        {NUMERICOS.map(({ clave, etiqueta, ayuda }) => (
          <label key={clave} className="flex items-center justify-between gap-4">
            <span className="text-sm text-on-surface">
              {etiqueta}
              {ayuda && (
                <span className="ml-2 text-xs text-on-surface-variant">{ayuda}</span>
              )}
            </span>
            <input
              type="number"
              value={String(limits[clave] as number)}
              onChange={(e) => cambiar(clave, Number(e.target.value) as never)}
              className="w-24 rounded-lg border border-outline/40 bg-surface px-3 py-1.5 text-sm text-on-surface"
            />
          </label>
        ))}
      </div>

      <div className="mt-5 space-y-2 border-t border-outline/20 pt-4">
        {BOOLEANOS.map(({ clave, etiqueta }) => (
          <label key={clave} className="flex items-center justify-between gap-4">
            <span className="text-sm text-on-surface">{etiqueta}</span>
            <input
              type="checkbox"
              checked={Boolean(limits[clave])}
              onChange={(e) => cambiar(clave, e.target.checked as never)}
              className="h-4 w-4 accent-primary"
            />
          </label>
        ))}
      </div>

      {error && (
        <p className="mt-4 text-sm text-error" role="alert">
          {error}
        </p>
      )}
      {aviso && <p className="mt-4 text-sm text-primary">{aviso}</p>}

      <button
        type="button"
        onClick={() => void guardar()}
        disabled={guardando}
        className="mt-5 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-on-primary disabled:opacity-50"
      >
        {guardando ? 'Guardando…' : `Guardar ${slug}`}
      </button>
    </div>
  );
}

export function AdminLimitsSection() {
  return (
    <section className="glass-panel rounded-2xl p-6 sm:p-8">
      <h2 className="font-display text-xl font-bold text-on-surface">
        Límites de los planes
      </h2>
      <p className="mt-1 text-sm text-on-surface-variant">
        Lo que cada plan puede hacer. Se aplica a todos sus usuarios, también a
        los que ya están suscritos.
      </p>

      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        <PanelPlan slug="free" />
        <PanelPlan slug="pro" />
      </div>
    </section>
  );
}
