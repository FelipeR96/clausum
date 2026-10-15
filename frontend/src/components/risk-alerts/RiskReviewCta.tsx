import { Link } from 'react-router-dom';
import { ExportPdfButton } from '@/components/contracts/ExportPdfButton';

type RiskReviewCtaProps = {
  totalAlerts: number;
  contractId: string;
  isPro: boolean;
};

export function RiskReviewCta({ totalAlerts, contractId, isPro }: RiskReviewCtaProps) {
  return (
    <section className="relative mt-16 overflow-hidden rounded-3xl bg-primary p-8 sm:p-12">
      <div className="relative z-10 flex flex-col items-center justify-between gap-8 md:flex-row">
        <div className="max-w-xl text-on-primary">
          <h2 className="font-display text-2xl font-bold sm:text-3xl">
            ¿Finalizando tu revisión?
          </h2>
          <p className="mt-4 text-primary-container/90 sm:text-lg">
            Cuando hayas revisado estas {totalAlerts} alertas, puedes generar un
            informe resumido para compartir con tu equipo o asesor legal. La
            exportación PDF completa está disponible en plan Pro.
          </p>
        </div>

        <div className="flex w-full flex-col gap-4 md:w-auto">
          <ExportPdfButton
            contractId={contractId}
            isPro={isPro}
            label="Generar informe limpio"
            variant="cta"
          />
          <Link
            to="/panel/contratos"
            className="flex items-center justify-center gap-3 rounded-xl border border-white/30 px-8 py-4 text-sm font-bold text-on-primary transition hover:bg-white/10"
          >
            Volver al historial
            <span className="material-symbols-outlined">folder_open</span>
          </Link>
        </div>
      </div>

      <span className="pointer-events-none absolute -right-8 -top-8 text-white/5">
        <span className="material-symbols-outlined text-[180px]">shield</span>
      </span>
    </section>
  );
}
