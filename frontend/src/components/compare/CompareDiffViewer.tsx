import { useCallback, useRef } from 'react';

const CHANGE_SUMMARY = [
  { label: 'Eliminaciones', count: 12, icon: 'remove_circle', tone: 'text-red-600' },
  { label: 'Adiciones', count: 24, icon: 'add_circle', tone: 'text-emerald-600' },
  { label: 'Modificaciones', count: 8, icon: 'edit', tone: 'text-primary' },
] as const;

const VERSIONS = [
  {
    when: 'Hoy, 10:45',
    title: 'v3.0 Borrador (actual)',
    note: 'Revisión del cliente',
    active: true,
  },
  {
    when: 'Ayer',
    title: 'v2.4 Maestro SA',
    note: 'Aprobación interna',
    active: false,
  },
  {
    when: '12 oct',
    title: 'v1.0 Plantilla',
    note: 'Versión base',
    active: false,
  },
] as const;

export function CompareDiffViewer() {
  const leftRef = useRef<HTMLDivElement>(null);
  const rightRef = useRef<HTMLDivElement>(null);
  const syncing = useRef<'left' | 'right' | null>(null);

  const onLeftScroll = useCallback(() => {
    if (syncing.current === 'right') return;
    syncing.current = 'left';
    if (leftRef.current && rightRef.current) {
      rightRef.current.scrollTop = leftRef.current.scrollTop;
    }
    syncing.current = null;
  }, []);

  const onRightScroll = useCallback(() => {
    if (syncing.current === 'left') return;
    syncing.current = 'right';
    if (leftRef.current && rightRef.current) {
      leftRef.current.scrollTop = rightRef.current.scrollTop;
    }
    syncing.current = null;
  }, []);

  return (
    <section id="vista-previa" className="bg-surface py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div className="flex h-[560px] flex-col overflow-hidden rounded-3xl border border-outline-variant bg-surface shadow-card lg:col-span-8">
            <div className="flex items-center justify-between border-b border-outline-variant bg-surface-container px-4 py-3">
              <div className="flex flex-wrap items-center gap-2 sm:gap-4">
                <div className="flex items-center gap-2 rounded-full border border-outline-variant bg-surface px-3 py-1.5 text-sm font-medium shadow-soft">
                  <span className="h-2 w-2 rounded-full bg-red-500" />
                  v2.4_Maestro_SA.pdf
                </div>
                <span className="material-symbols-outlined text-on-surface-variant">
                  swap_horiz
                </span>
                <div className="flex items-center gap-2 rounded-full border border-outline-variant bg-surface px-3 py-1.5 text-sm font-medium shadow-soft">
                  <span className="h-2 w-2 rounded-full bg-primary" />
                  v3.0_Borrador_Cliente.pdf
                </div>
              </div>
              <div className="hidden gap-1 sm:flex">
                <button
                  type="button"
                  className="rounded-lg p-2 text-on-surface-variant hover:bg-surface-container-high"
                  aria-label="Buscar"
                >
                  <span className="material-symbols-outlined">search</span>
                </button>
                <button
                  type="button"
                  className="rounded-lg p-2 text-on-surface-variant hover:bg-surface-container-high"
                  aria-label="Descargar"
                >
                  <span className="material-symbols-outlined">download</span>
                </button>
              </div>
            </div>

            <div className="flex min-h-0 flex-1 overflow-hidden">
              <div
                ref={leftRef}
                onScroll={onLeftScroll}
                className="contract-scroll compare-gradient flex-1 overflow-y-auto border-r border-outline-variant p-6 sm:p-8"
              >
                <div className="mx-auto max-w-prose">
                  <h3 className="mb-6 font-display text-xl font-bold">4. Indemnización</h3>
                  <p className="text-sm leading-relaxed text-on-surface-variant sm:text-base">
                    El Consultor indemnizará y mantendrá indemne a la Compañía de
                    todas las reclamaciones derivadas de la prestación de servicios.
                  </p>
                  <div className="diff-removed my-4 rounded-r-lg p-4">
                    <p className="text-sm italic leading-relaxed text-red-700 sm:text-base">
                      La responsabilidad máxima no excederá los honorarios de los
                      seis meses anteriores.
                    </p>
                  </div>
                  <p className="mt-4 text-sm leading-relaxed text-on-surface-variant sm:text-base">
                    Esta obligación sobrevivirá por un período de tres (3) años.
                  </p>
                </div>
              </div>

              <div
                ref={rightRef}
                onScroll={onRightScroll}
                className="contract-scroll compare-gradient flex-1 overflow-y-auto p-6 sm:p-8"
              >
                <div className="mx-auto max-w-prose">
                  <h3 className="mb-6 font-display text-xl font-bold">4. Indemnización</h3>
                  <p className="text-sm leading-relaxed text-on-surface-variant sm:text-base">
                    El Consultor indemnizará y mantendrá indemne a la Compañía de
                    todas las reclamaciones derivadas de la prestación de servicios.
                  </p>
                  <div className="diff-added my-4 rounded-r-lg p-4">
                    <p className="text-sm font-medium leading-relaxed text-emerald-800 sm:text-base">
                      La responsabilidad agregada se limitará a $5.000.000 COP o el
                      doble del valor anual del contrato, lo que sea mayor.
                    </p>
                  </div>
                  <p className="mt-4 text-sm leading-relaxed text-on-surface-variant sm:text-base">
                    Esta obligación sobrevivirá{' '}
                    <span className="diff-changed px-1 font-medium text-primary">
                      indefinidamente
                    </span>
                    .
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-6 lg:col-span-4">
            <div className="flex-1 rounded-3xl border border-outline-variant bg-surface p-6 shadow-soft">
              <h4 className="font-display text-xl font-bold">Resumen de cambios</h4>
              <div className="mt-5 space-y-3">
                {CHANGE_SUMMARY.map((item) => (
                  <div
                    key={item.label}
                    className="flex items-center justify-between rounded-2xl bg-surface-container p-3"
                  >
                    <div className="flex items-center gap-3">
                      <span className={`material-symbols-outlined ${item.tone}`}>
                        {item.icon}
                      </span>
                      <span className="text-sm">{item.label}</span>
                    </div>
                    <span className="font-display text-xl font-bold">{item.count}</span>
                  </div>
                ))}
              </div>

              <div className="mt-8">
                <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
                  Evaluación de riesgo IA
                </p>
                <div className="flex items-start gap-2 rounded-2xl border border-red-200 bg-red-50 p-3">
                  <span className="material-symbols-outlined text-red-600">warning</span>
                  <p className="text-sm font-semibold text-red-800">
                    Cambio crítico en cláusula de responsabilidad e indemnización
                  </p>
                </div>
              </div>
            </div>

            <div className="flex-1 rounded-3xl bg-primary p-6 text-on-primary shadow-card">
              <h4 className="font-display text-xl font-bold">Historial de versiones</h4>
              <div className="relative mt-6 space-y-6 before:absolute before:bottom-2 before:left-[11px] before:top-2 before:w-px before:bg-white/25">
                {VERSIONS.map((version) => (
                  <div
                    key={version.title}
                    className={`relative pl-10 ${version.active ? '' : 'opacity-70'}`}
                  >
                    <div
                      className={`absolute left-0 top-1 h-6 w-6 rounded-full border-4 border-primary ${
                        version.active ? 'bg-primary-container' : 'bg-white/30'
                      }`}
                    />
                    <p className="text-xs uppercase tracking-wide text-on-primary/70">
                      {version.when}
                    </p>
                    <p className="font-semibold">{version.title}</p>
                    <p className="text-sm text-on-primary/80">{version.note}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-on-surface-variant">
          Vista previa ilustrativa. Los resultados reales dependen del contenido de tus documentos.
        </p>
      </div>
    </section>
  );
}
