import { useCallback, useEffect, useState } from 'react';
import {
  cambiarEstadoBug,
  listarBugs,
  type BugReport,
  type BugReportEstado,
} from '@/services/bug-report.service';
import { getUserFacingErrorMessage } from '@/services/api/user-facing-errors';

function cuando(iso?: string): string {
  if (!iso) return '—';
  return new Intl.DateTimeFormat('es-CO', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(iso));
}

const FILTROS: { valor: BugReportEstado | 'todos'; etiqueta: string }[] = [
  { valor: 'abierto', etiqueta: 'Abiertos' },
  { valor: 'resuelto', etiqueta: 'Resueltos' },
  { valor: 'todos', etiqueta: 'Todos' },
];

export function AdminBugsSection() {
  const [reportes, setReportes] = useState<BugReport[]>([]);
  const [filtro, setFiltro] = useState<BugReportEstado | 'todos'>('abierto');
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async (f: BugReportEstado | 'todos') => {
    setCargando(true);
    setError(null);
    try {
      const r = await listarBugs(f === 'todos' ? undefined : f);
      setReportes(r.reportes);
    } catch (err) {
      setError(getUserFacingErrorMessage(err, { action: 'cargar los reportes' }));
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    void cargar(filtro);
  }, [filtro, cargar]);

  async function alternar(r: BugReport) {
    const nuevo: BugReportEstado = r.estado === 'abierto' ? 'resuelto' : 'abierto';
    try {
      await cambiarEstadoBug(r.id, nuevo);
      await cargar(filtro);
    } catch (err) {
      setError(getUserFacingErrorMessage(err, { action: 'cambiar el estado' }));
    }
  }

  return (
    <section className="glass-panel rounded-2xl p-6 sm:p-8">
      <h2 className="font-display text-xl font-bold text-on-surface">
        Problemas reportados
      </h2>
      <p className="mt-1 text-sm text-on-surface-variant">
        Lo que los usuarios envían desde el botón del menú.
      </p>

      <div className="mt-4 inline-flex rounded-full border border-outline-variant bg-surface p-1">
        {FILTROS.map((f) => (
          <button
            key={f.valor}
            type="button"
            onClick={() => setFiltro(f.valor)}
            className={`rounded-full px-4 py-1.5 text-xs font-semibold transition ${
              filtro === f.valor
                ? 'bg-primary text-on-primary'
                : 'text-on-surface-variant hover:bg-surface-container'
            }`}
          >
            {f.etiqueta}
          </button>
        ))}
      </div>

      {error && (
        <p className="mt-4 text-sm text-red-600 dark:text-red-400">{error}</p>
      )}

      <ul className="mt-4 space-y-3">
        {reportes.map((r) => (
          <li
            key={r.id}
            className="rounded-xl border border-outline-variant/60 bg-surface/60 p-4"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm text-on-surface">{r.email ?? r.userId}</p>
                <p className="mt-0.5 text-xs text-on-surface-variant">
                  {cuando(r.createdAt)} · plan {r.planId}
                  {r.ruta && ` · ${r.ruta}`}
                </p>
              </div>
              <button
                type="button"
                onClick={() => void alternar(r)}
                className="shrink-0 rounded-lg border border-outline-variant px-3 py-1.5 text-xs font-semibold transition hover:bg-surface-container"
              >
                {r.estado === 'abierto' ? 'Marcar resuelto' : 'Reabrir'}
              </button>
            </div>

            <p className="mt-3 whitespace-pre-wrap text-sm text-on-surface">
              {r.descripcion}
            </p>

            {/* El navegador casi nunca importa, hasta el dia que es la causa. */}
            {r.userAgent && (
              <p className="mt-2 truncate font-mono text-[11px] text-on-surface-variant">
                {r.userAgent}
              </p>
            )}
          </li>
        ))}

        {reportes.length === 0 && !cargando && (
          <li className="py-6 text-center text-sm text-on-surface-variant">
            {filtro === 'abierto'
              ? 'Nada pendiente.'
              : 'No hay reportes con ese filtro.'}
          </li>
        )}
      </ul>
    </section>
  );
}
