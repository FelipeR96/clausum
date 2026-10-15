import { useRevealOnScroll } from '@/hooks/useRevealOnScroll';

const DESKTOP_IMAGE =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuATg8HA_MCrLXdUsAqPww3dywv_UqZlH8JjRXAc0_Gjmc1oshZ1qZf8rG6tdNPGK5qVO3bMxqNLJyVCeJZ4j0CGb_9JjoYXNFRk7k1nqOAfHw8f8WZqYSNMyO2VbLt594MBUtpm-LwkNqnsMEK9fDq3jzVMtL0E5dJWofidN4X8EaD2dPZYWirgiZJQssF9d_YvmAjTWtnWZPZbOBw03SstrTUip69F3y76IniNGXueDXFvOI1TA-CIAJ9y-DdPbg1K6kmytweEVTvu';

const SECTORS = [
  {
    icon: 'handshake',
    title: 'Acuerdos comerciales',
    description:
      'MSAs, SOWs y NDAs: consistencia con plantillas, obligaciones recíprocas y límites de responsabilidad.',
  },
  {
    icon: 'real_estate_agent',
    title: 'Arrendamientos',
    description:
      'Incrementos de renta, gastos comunes, plazos y cláusulas de terminación según Ley 820/2003.',
  },
  {
    icon: 'badge',
    title: 'Contratos laborales',
    description:
      'No competencia, propiedad intelectual e indemnizaciones con referencias al Código Sustantivo del Trabajo.',
  },
] as const;

export function SectorPrecision() {
  const ref = useRevealOnScroll<HTMLDivElement>();

  return (
    <section className="bg-surface-container py-20 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="grid items-center gap-16 lg:grid-cols-2">
          <div
            className="relative aspect-[4/3] w-full overflow-hidden rounded-3xl bg-cover bg-center shadow-card"
            style={{ backgroundImage: `url('${DESKTOP_IMAGE}')` }}
          >
            <div className="absolute inset-0 bg-gradient-to-t from-primary/50 to-transparent" />
            <div className="absolute bottom-6 left-6 right-6 flex items-center justify-between rounded-2xl border border-outline-variant/60 bg-surface/90 p-4 backdrop-blur-md">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-on-primary">
                  <span className="material-symbols-outlined">check</span>
                </div>
                <span className="font-semibold text-on-surface">Texto extraído del PDF</span>
              </div>
              <span className="font-mono text-xs text-on-surface-variant">OCR cuando aplica</span>
            </div>
          </div>

          <div ref={ref} className="reveal space-y-8">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-primary">
                Sectores
              </p>
              <h2 className="mt-3 font-display text-3xl font-bold tracking-tight text-on-surface sm:text-4xl">
                Precisión por tipo de contrato
              </h2>
            </div>
            <div className="space-y-4">
              {SECTORS.map((sector) => (
                <div
                  key={sector.title}
                  className="flex gap-4 rounded-2xl border border-outline-variant bg-surface p-4 transition hover:border-primary/30 hover:shadow-soft"
                >
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-surface-container">
                    <span className="material-symbols-outlined text-primary">
                      {sector.icon}
                    </span>
                  </div>
                  <div>
                    <h4 className="font-display text-lg font-bold">{sector.title}</h4>
                    <p className="mt-1 text-sm text-on-surface-variant">
                      {sector.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
