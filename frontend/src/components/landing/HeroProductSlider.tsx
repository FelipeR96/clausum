import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/auth/AuthProvider';
import { useRevealOnScroll } from '@/hooks/useRevealOnScroll';
import { useMarketingDestination } from '@/hooks/useMarketingDestination';

const ROTATE_MS = 5500;

const RISK_DISTRIBUTION = [
  { label: 'Alto', count: 2, color: 'bg-red-400', pct: 8 },
  { label: 'Medio', count: 3, color: 'bg-amber-400', pct: 12 },
  { label: 'Seguro', count: 19, color: 'bg-emerald-400', pct: 80 },
];

type SlideId = 'analyze' | 'compare' | 'risks';

type HeroSlide = {
  id: SlideId;
  tabLabel: string;
  eyebrow: string;
  eyebrowIcon: string;
  title: string;
  description: string;
  link: string;
  linkLabel: string;
};

const SLIDES: HeroSlide[] = [
  {
    id: 'analyze',
    tabLabel: 'Analizar',
    eyebrow: 'Análisis con IA',
    eyebrowIcon: 'description',
    title: 'Entiende qué firmas en minutos',
    description:
      'Resumen ejecutivo, estructura del contrato y distribución de riesgos. El detalle forense vive en el perfil de riesgo.',
    link: '/analizar-contratos',
    linkLabel: 'Explorar análisis',
  },
  {
    id: 'compare',
    tabLabel: 'Comparar',
    eyebrow: 'Comparación con IA',
    eyebrowIcon: 'compare_arrows',
    title: 'Controla cada versión del contrato',
    description:
      'Sube dos PDFs y visualiza adiciones, eliminaciones y cambios de riesgo entre borradores antes de firmar.',
    link: '/comparar-contratos',
    linkLabel: 'Explorar comparación',
  },
  {
    id: 'risks',
    tabLabel: 'Riesgos',
    eyebrow: 'Perfil de riesgo',
    eyebrowIcon: 'shield',
    title: 'Negocia con playbook de IA',
    description:
      'Exposición legal, cláusulas ausentes y recomendaciones concretas para cada alerta crítica del contrato.',
    link: '/detectar-riesgos',
    linkLabel: 'Explorar riesgos',
  },
];

function AnalyzePreview() {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between border-b border-outline-variant pb-3">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-lg text-primary">description</span>
          <span className="font-display text-sm font-semibold sm:text-base">
            Acuerdo_Servicio_v4.pdf
          </span>
        </div>
        <span className="rounded-full bg-primary-container/50 px-2.5 py-0.5 text-[10px] font-bold uppercase text-on-primary-container">
          Análisis general
        </span>
      </div>

      <div className="rounded-2xl bg-surface-container p-4">
        <p className="text-sm font-semibold">Resumen ejecutivo</p>
        <p className="mt-1 text-sm leading-relaxed text-on-surface-variant">
          Contrato de servicios, 12 meses, jurisdicción Bogotá. 24 cláusulas
          identificadas; 5 requieren revisión en perfil de riesgo.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-2 rounded-xl border border-outline-variant/60 p-2.5">
        <div className="text-center">
          <p className="text-[10px] font-semibold uppercase text-on-surface-variant">Cláusulas</p>
          <p className="font-display text-base font-bold">24</p>
        </div>
        <div className="text-center">
          <p className="text-[10px] font-semibold uppercase text-on-surface-variant">Atención</p>
          <p className="font-display text-base font-bold text-red-700">68</p>
        </div>
        <div className="text-center">
          <p className="text-[10px] font-semibold uppercase text-on-surface-variant">Alertas</p>
          <p className="font-display text-base font-bold text-primary">5</p>
        </div>
      </div>

      <div className="rounded-2xl bg-primary p-3.5 text-on-primary">
        <p className="text-xs font-semibold">Distribución de riesgos</p>
        <div className="mt-2 space-y-1.5">
          {RISK_DISTRIBUTION.map((item) => (
            <div key={item.label}>
              <div className="mb-0.5 flex justify-between text-[10px]">
                <span>{item.label}</span>
                <span className="font-bold">{item.count}</span>
              </div>
              <div className="h-1 overflow-hidden rounded-full bg-white/20">
                <div className={`h-full rounded-full ${item.color}`} style={{ width: `${item.pct}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ComparePreview() {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 border-b border-outline-variant pb-3">
        <span className="rounded-full border border-outline-variant bg-surface px-2.5 py-1 text-xs font-medium">
          <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-red-500" />
          v2.4_Maestro.pdf
        </span>
        <span className="material-symbols-outlined text-sm text-on-surface-variant">swap_horiz</span>
        <span className="rounded-full border border-outline-variant bg-surface px-2.5 py-1 text-xs font-medium">
          <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-primary" />
          v3.0_Borrador.pdf
        </span>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {[
          { label: 'Eliminadas', count: 12, color: 'text-red-600' },
          { label: 'Añadidas', count: 24, color: 'text-emerald-600' },
          { label: 'Modificadas', count: 8, color: 'text-primary' },
        ].map((s) => (
          <div key={s.label} className="rounded-xl bg-surface-container p-2.5 text-center">
            <p className={`font-display text-lg font-bold ${s.color}`}>{s.count}</p>
            <p className="text-[10px] text-on-surface-variant">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-outline-variant bg-[#f8faf9] p-4 font-serif text-sm leading-relaxed">
        <p className="mb-2 font-display text-sm font-bold text-on-surface">4. Indemnización</p>
        <p className="text-on-surface-variant">
          <span className="bg-red-100/90 line-through decoration-red-600/70">
            El Consultor indemnizará a la Compañía sin límite de monto.
          </span>
        </p>
        <p className="mt-2 text-on-surface">
          <span className="border-b-2 border-emerald-500 bg-emerald-50 px-0.5">
            Cada parte indemnizará a la otra hasta el valor del contrato.
          </span>
        </p>
      </div>

      <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
        <span className="material-symbols-outlined text-base">edit</span>
        Cambio de riesgo: indemnización unilateral → recíproca
      </div>
    </div>
  );
}

function RisksPreview() {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between border-b border-outline-variant pb-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-red-700">
            Análisis profundo
          </p>
          <p className="font-display text-sm font-bold">Perfil de riesgo</p>
        </div>
        <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-[10px] font-bold text-red-800">
          5 alertas
        </span>
      </div>

      <div className="rounded-2xl border border-red-200 bg-red-50/80 p-4">
        <div className="mb-2 flex items-center gap-2">
          <span className="rounded-full bg-red-600 px-2 py-0.5 text-[10px] font-bold uppercase text-white">
            Riesgo alto
          </span>
          <span className="text-xs text-on-surface-variant">Cláusula 8</span>
        </div>
        <p className="text-sm font-bold text-on-surface">Indemnización unilateral sin tope</p>
        <p className="mt-1 text-xs leading-relaxed text-on-surface-variant">
          Exposición ilimitada ante reclamaciones del cliente, incluso por su propia
          negligencia.
        </p>
        <div className="mt-3 rounded-xl border border-red-100 bg-surface p-3">
          <p className="text-[10px] font-bold uppercase tracking-wide text-on-surface-variant">
            Playbook de negociación
          </p>
          <p className="mt-1 text-xs italic text-on-surface">
            &ldquo;Limitar indemnización al valor del contrato con reciprocidad entre
            partes.&rdquo;
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-dashed border-amber-300 bg-amber-50/50 p-3">
        <p className="text-xs font-semibold text-amber-900">Cláusula ausente detectada</p>
        <p className="mt-1 text-xs text-amber-800/90">
          No se encontró tratamiento de datos personales (Ley 1581/2012).
        </p>
      </div>
    </div>
  );
}

const PREVIEWS: Record<SlideId, () => ReactNode> = {
  analyze: AnalyzePreview,
  compare: ComparePreview,
  risks: RisksPreview,
};

export function HeroProductSlider() {
  const ref = useRevealOnScroll<HTMLDivElement>();
  const { user } = useAuth();
  const analysisDest = useMarketingDestination('analysis');
  const compareDest = useMarketingDestination('compare');
  const risksDest = useMarketingDestination('risks');
  const [activeIndex, setActiveIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  const slide = SLIDES[activeIndex];
  const slideDestinations: Record<SlideId, string> = {
    analyze: analysisDest,
    compare: compareDest,
    risks: risksDest,
  };

  const goTo = useCallback((index: number) => {
    setActiveIndex(index % SLIDES.length);
  }, []);

  const next = useCallback(() => {
    setActiveIndex((i) => (i + 1) % SLIDES.length);
  }, []);

  useEffect(() => {
    if (paused) return;
    const timer = window.setInterval(next, ROTATE_MS);
    return () => window.clearInterval(timer);
  }, [paused, next]);

  return (
    <section
      className="relative overflow-hidden bg-surface-container"
      aria-roledescription="carousel"
      aria-label="Capacidades de Clausum"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <div className="pointer-events-none absolute -right-32 -top-32 h-96 w-96 rounded-full bg-primary/5 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-primary-container/30 blur-3xl" />

      <div className="mx-auto grid max-w-6xl gap-12 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:items-center lg:py-24">
        <div ref={ref} className="reveal">
          <span className="inline-flex items-center gap-2 rounded-full border border-outline-variant bg-surface px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary transition-all duration-500">
            <span className="material-symbols-outlined text-base">{slide.eyebrowIcon}</span>
            {slide.eyebrow}
          </span>

          <h1 className="mt-6 font-display text-4xl font-extrabold leading-tight tracking-tight text-on-surface sm:text-5xl lg:text-[3.25rem]">
            Entiende tus contratos antes de firmar
          </h1>

          <p
            key={slide.id}
            className="mt-5 max-w-xl animate-fade-in text-lg leading-relaxed text-on-surface-variant"
          >
            <span className="font-semibold text-on-surface">{slide.title}. </span>
            {slide.description}
          </p>

          {/* El boton principal lleva a probar el producto, no a registrarse.
              El orden importa: a una marca que nadie conoce no se le crea una
              cuenta por fe, pero si se le sube un contrato para ver que dice.
              Quien ya tiene sesion va a su panel, que es lo que vino a hacer. */}
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link
              to={user ? '/panel' : '/analizar-documento'}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-7 py-3.5 text-base font-semibold text-on-primary shadow-soft transition hover:bg-primary/90"
            >
              {user ? 'Ir al panel' : 'Analizar un contrato'}
              <span className="material-symbols-outlined text-xl">arrow_forward</span>
            </Link>
            {!user && (
              <Link
                to="/signup"
                className="inline-flex items-center justify-center gap-2 rounded-full border border-outline-variant bg-surface px-7 py-3.5 text-base font-semibold text-on-surface transition hover:border-primary/40 hover:text-primary"
              >
                Crear cuenta
              </Link>
            )}
          </div>

          <Link
            to={slideDestinations[slide.id]}
            className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-primary transition hover:underline"
          >
            {slide.linkLabel}
            <span className="material-symbols-outlined text-base" aria-hidden="true">
              arrow_forward
            </span>
          </Link>

          <ul className="mt-10 flex flex-wrap gap-x-6 gap-y-3 text-sm text-on-surface-variant">
            <li className="flex items-center gap-2">
              <span className="material-symbols-outlined text-lg text-primary">check_circle</span>
              Sin cuenta para empezar
            </li>
            <li className="flex items-center gap-2">
              <span className="material-symbols-outlined text-lg text-primary">check_circle</span>
              PDF hasta 5 MB
            </li>
            <li className="flex items-center gap-2">
              <span className="material-symbols-outlined text-lg text-primary">check_circle</span>
              Enfoque Colombia
            </li>
          </ul>
        </div>

        <div className="reveal visible lg:delay-150">
          <div className="relative min-h-[420px]">
            {SLIDES.map((s, index) => {
              const SlidePreview = PREVIEWS[s.id];
              const isActive = index === activeIndex;
              return (
                <div
                  key={s.id}
                  className={`transition-all duration-700 ease-out ${
                    isActive
                      ? 'relative translate-y-0 opacity-100'
                      : 'pointer-events-none absolute inset-0 translate-y-3 opacity-0'
                  }`}
                  aria-hidden={!isActive}
                >
                  <div className="rounded-3xl border border-outline-variant bg-surface p-5 shadow-card sm:p-6">
                    <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                      Vista previa · {s.tabLabel}
                    </p>
                    <SlidePreview />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-5 flex items-center justify-center gap-2" role="tablist">
            {SLIDES.map((s, index) => (
              <button
                key={s.id}
                type="button"
                role="tab"
                aria-selected={index === activeIndex}
                aria-label={`Ver ejemplo: ${s.tabLabel}`}
                onClick={() => goTo(index)}
                className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                  index === activeIndex
                    ? 'bg-primary text-on-primary shadow-soft'
                    : 'bg-surface text-on-surface-variant hover:bg-surface-container'
                }`}
              >
                {s.tabLabel}
              </button>
            ))}
          </div>

          <div className="mt-3 flex justify-center gap-1.5" aria-hidden>
            {SLIDES.map((s, index) => (
              <span
                key={s.id}
                className={`h-1 rounded-full transition-all duration-500 ${
                  index === activeIndex ? 'w-8 bg-primary' : 'w-2 bg-outline-variant'
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
