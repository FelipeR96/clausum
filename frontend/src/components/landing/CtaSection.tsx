import { Link } from 'react-router-dom';
import { useRevealOnScroll } from '@/hooks/useRevealOnScroll';

export function CtaSection() {
  const ref = useRevealOnScroll<HTMLDivElement>();

  return (
    <section className="py-20 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div
          ref={ref}
          className="reveal relative overflow-hidden rounded-3xl bg-primary px-8 py-14 text-center sm:px-12"
        >
          <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-white/10 blur-2xl" />
          <div className="pointer-events-none absolute -bottom-12 -left-12 h-40 w-40 rounded-full bg-black/10 blur-2xl" />

          <h2 className="relative font-display text-3xl font-bold text-on-primary sm:text-4xl">
            Empieza a revisar contratos hoy
          </h2>
          <p className="relative mx-auto mt-4 max-w-xl text-lg text-on-primary/85">
            Plan gratuito con 3 análisis al mes. Sin tarjeta de crédito. Actualiza
            a Pro para más capacidad, OCR en escaneos y exportación PDF — precios en COP
            (Colombia) o USD (resto de LATAM).
          </p>

          <div className="relative mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              to="/signup"
              className="inline-flex items-center gap-2 rounded-full bg-surface px-8 py-3.5 text-base font-semibold text-primary transition hover:bg-surface-container"
            >
              Crear cuenta gratis
              <span className="material-symbols-outlined">arrow_forward</span>
            </Link>
            <Link
              to="/pricing"
              className="inline-flex items-center gap-2 rounded-full border border-on-primary/30 px-8 py-3.5 text-base font-semibold text-on-primary transition hover:bg-white/10"
            >
              Ver planes y precios
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
