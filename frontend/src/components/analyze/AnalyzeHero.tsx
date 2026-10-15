import { Link } from 'react-router-dom';
import { useRevealOnScroll } from '@/hooks/useRevealOnScroll';
import { useFeatureCtaDestination } from '@/hooks/useMarketingDestination';

const ENTITY_IMAGE =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuB0_gMOHI_atqSczHWlGW4nL514gX7njxv2z6RxO2LQWnFrQ8IYBBnWAbeuKO5TatgXZfQiMq1fcVxpdzlxbmy9SEixCYSG9ljGhV1XkN3rU1NtYcwL9FmDgZ6NPtImfJsG2Vd4FG2RzHWdMcVoinqj7WIJpxXWV1aBajA3u0Iia-HTEnDwFIBFt84Umi_695Bf_vYFplM6GTFdviX9ssNeZbtv9V2zKQQla5Cid4uc6SSfzni1OjjfRSCuNS1FVXO5jmin_SvGkAmo';

const RISK_DISTRIBUTION = [
  { label: 'Alto', count: 2, color: 'bg-red-400', pct: 8 },
  { label: 'Medio', count: 3, color: 'bg-amber-400', pct: 12 },
  { label: 'Seguro', count: 19, color: 'bg-emerald-400', pct: 80 },
];

export function AnalyzeHero() {
  const ref = useRevealOnScroll<HTMLDivElement>();
  const analyzeCta = useFeatureCtaDestination('analysis');

  return (
    <section className="relative overflow-hidden bg-surface-container">
      <div className="pointer-events-none absolute -right-32 -top-32 h-96 w-96 rounded-full bg-primary/5 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-primary-container/30 blur-3xl" />

      <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:items-center lg:py-24">
        <div ref={ref} className="reveal">
          <span className="inline-flex items-center gap-2 rounded-full border border-outline-variant bg-surface px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary">
            <span
              className="material-symbols-outlined text-base"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              bolt
            </span>
            IA + contexto jurídico
          </span>

          <h1 className="mt-6 font-display text-4xl font-extrabold leading-tight tracking-tight text-on-surface sm:text-5xl lg:text-[3.25rem]">
            Analizar contratos con IA en Colombia
          </h1>

          <p className="mt-5 max-w-xl text-lg leading-relaxed text-on-surface-variant">
            Entiende qué firmas en minutos: Clausum extrae el PDF, identifica la
            estructura del acuerdo y te muestra un resumen ejecutivo. Si hay puntos
            sensibles, el perfil de riesgo profundiza con playbook de negociación.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link
              to={analyzeCta}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-7 py-3.5 text-base font-semibold text-on-primary shadow-soft transition hover:bg-primary/90"
            >
              Analizar documento
              <span className="material-symbols-outlined text-xl">arrow_forward</span>
            </Link>
            <a
              href="#capacidades"
              className="inline-flex items-center justify-center gap-2 rounded-full border border-outline-variant bg-surface px-7 py-3.5 text-base font-semibold text-on-surface transition hover:border-primary/40 hover:text-primary"
            >
              Ver capacidades
            </a>
          </div>

          <ul className="mt-10 flex flex-wrap gap-x-6 gap-y-3 text-sm text-on-surface-variant">
            <li className="flex items-center gap-2">
              <span className="material-symbols-outlined text-lg text-primary">
                check_circle
              </span>
              PDF digital o Word — sin límite de páginas
            </li>
            <li className="flex items-center gap-2">
              <span className="material-symbols-outlined text-lg text-primary">
                check_circle
              </span>
              3 análisis/mes en Free
            </li>
            <li className="flex items-center gap-2">
              <span className="material-symbols-outlined text-lg text-primary">
                info
              </span>
              Escaneos: OCR Pro (7 págs. máx.)
            </li>
          </ul>
        </div>

        <div className="reveal visible">
          <div className="rounded-3xl border border-outline-variant bg-surface p-6 shadow-card transition-transform duration-500 hover:scale-[1.01]">
            <div className="mb-4 flex items-center justify-between border-b border-outline-variant pb-4">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">description</span>
                <span className="font-display font-semibold text-sm sm:text-base">
                  Acuerdo_Servicio_v4.pdf
                </span>
              </div>
              <span className="rounded-full bg-primary-container/50 px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-on-primary-container">
                Análisis general
              </span>
            </div>

            <div className="space-y-3">
              <div className="rounded-2xl bg-surface-container p-4">
                <p className="text-sm font-semibold text-on-surface">Resumen ejecutivo</p>
                <p className="mt-1 text-sm leading-relaxed text-on-surface-variant">
                  Contrato de prestación de servicios entre dos partes, plazo de 12
                  meses y jurisdicción en Bogotá. Se identificaron 24 cláusulas; 5
                  requieren revisión en el perfil de riesgo.
                </p>
              </div>

              <div className="grid grid-cols-3 gap-2 rounded-2xl border border-outline-variant/60 p-3">
                <div className="text-center">
                  <p className="text-[10px] font-semibold uppercase text-on-surface-variant">
                    Cláusulas
                  </p>
                  <p className="font-display text-lg font-bold">24</p>
                </div>
                <div className="text-center">
                  <p className="text-[10px] font-semibold uppercase text-on-surface-variant">
                    Atención
                  </p>
                  <p className="font-display text-lg font-bold text-red-700">68</p>
                </div>
                <div className="text-center">
                  <p className="text-[10px] font-semibold uppercase text-on-surface-variant">
                    Alertas
                  </p>
                  <p className="font-display text-lg font-bold text-primary">5</p>
                </div>
              </div>

              <div className="rounded-2xl bg-primary p-4 text-on-primary">
                <p className="text-sm font-semibold">Distribución de riesgos</p>
                <div className="mt-3 space-y-2">
                  {RISK_DISTRIBUTION.map((item) => (
                    <div key={item.label}>
                      <div className="mb-1 flex justify-between text-xs">
                        <span>{item.label}</span>
                        <span className="font-bold">{item.count}</span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-white/20">
                        <div
                          className={`h-full rounded-full ${item.color}`}
                          style={{ width: `${item.pct}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="relative overflow-hidden rounded-2xl border border-red-200 bg-red-50/50 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="rounded bg-red-100 px-2 py-0.5 text-[10px] font-bold uppercase text-red-800">
                      Riesgo crítico
                    </span>
                    <p className="mt-2 text-sm font-semibold text-on-surface">
                      Cláusula 8: Indemnización
                    </p>
                  </div>
                  <span className="material-symbols-outlined text-on-surface-variant">
                    lock
                  </span>
                </div>
                <p className="mt-2 select-none text-xs text-red-700/70 blur-[2px]">
                  Detalle de exposición legal y recomendación de negociación…
                </p>
                <Link
                  to="/detectar-riesgos"
                  className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                >
                  Ver en perfil de riesgo
                  <span className="material-symbols-outlined text-sm">arrow_forward</span>
                </Link>
              </div>

              <div className="rounded-2xl border border-outline-variant p-4">
                <p className="text-sm font-semibold">Referencias del tipo de contrato</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {['Código Civil', 'Código de Comercio', 'Ley 527/1999'].map((law) => (
                    <span
                      key={law}
                      className="rounded-full bg-primary-container/50 px-3 py-1 text-xs font-medium text-on-primary-container"
                    >
                      {law}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export { ENTITY_IMAGE };
