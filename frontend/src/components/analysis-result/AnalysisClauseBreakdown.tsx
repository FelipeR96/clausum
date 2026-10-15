import type { AnalysisResultData } from '@/types/analysis-view.types';
import { AnalysisLiveDocument } from '@/components/analysis-result/AnalysisLiveDocument';
import { AnalysisRiskTeaserCard } from '@/components/analysis-result/AnalysisRiskTeaserCard';
import { AnalysisStandardClauseCard } from '@/components/analysis-result/AnalysisStandardClauseCard';

type AnalysisClauseBreakdownProps = {
  data: AnalysisResultData;
  contractId: string;
  isPro: boolean;
};

export function AnalysisClauseBreakdown({
  data,
  contractId,
  isPro,
}: AnalysisClauseBreakdownProps) {
  const standardClauses = data.clauses.filter((c) => c.severity === 'standard');
  const riskyClauses = data.clauses.filter((c) => c.severity !== 'standard');

  return (
    <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-12">
      <div className="space-y-6 lg:col-span-7">
        {riskyClauses.length > 0 && (
          <section>
            <div className="mb-4">
              <h2 className="font-display text-xl font-bold">Cláusulas que requieren revisión</h2>
              <p className="mt-1 text-sm text-on-surface-variant">
                {isPro
                  ? 'Riesgos detectados durante el análisis. El perfil completo incluye exposición, cláusulas ausentes y playbook de negociación.'
                  : 'Vista previa. Actualiza a Pro para ver el detalle forense, exposición y playbook de negociación.'}
              </p>
            </div>
            <div className="space-y-4">
              {riskyClauses.map((clause) => (
                <AnalysisRiskTeaserCard
                  key={clause.id}
                  clause={clause}
                  contractId={contractId}
                  locked={!isPro}
                />
              ))}
            </div>
          </section>
        )}

        <section>
          <div className="mb-4">
            <h2 className="font-display text-xl font-bold">Estructura del contrato</h2>
            <p className="mt-1 text-sm text-on-surface-variant">
              Cláusulas estándar identificadas en el análisis general.
            </p>
          </div>
          <div className="space-y-4">
            {standardClauses.map((clause) => (
              <AnalysisStandardClauseCard key={clause.id} clause={clause} />
            ))}
          </div>
        </section>
      </div>

      <div className="lg:col-span-5">
        <AnalysisLiveDocument data={data} contractId={contractId} isPro={isPro} />
      </div>
    </div>
  );
}
