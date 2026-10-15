import { Link } from 'react-router-dom';
import type { AnalysisResultData } from '@/types/analysis-view.types';
import { contractRiskProfilePath } from '@/utils/risk-routes';

type AnalysisLiveDocumentProps = {
  data: AnalysisResultData;
  contractId: string;
  isPro: boolean;
};

function RiskSectionTeaser({
  title,
  excerpt,
  contractId,
  severity,
  isPro,
}: {
  title: string;
  excerpt: string;
  contractId: string;
  severity: 'high' | 'medium';
  isPro: boolean;
}) {
  const riskPath = isPro ? contractRiskProfilePath(contractId) : '/pricing';
  const colors =
    severity === 'high'
      ? 'border-red-300 bg-red-50/60'
      : 'border-amber-300 bg-amber-50/60';

  return (
    <div className={`-mx-4 mb-6 rounded-r-xl border-l-4 p-4 sm:-mx-6 ${colors}`}>
      <h3 className="mb-2 text-lg font-bold">{title}</h3>
      <p
        className={`mb-3 text-sm italic leading-relaxed text-on-surface-variant ${
          isPro ? '' : 'select-none blur-[4px]'
        }`}
      >
        {isPro
          ? `«${excerpt}»`
          : 'Contenido disponible en el perfil de riesgo con evaluación de exposición legal.'}
      </p>
      <Link
        to={riskPath}
        className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
      >
        <span className="material-symbols-outlined text-base">shield</span>
        Ver cláusula en perfil de riesgo{isPro ? '' : ' Pro'}
      </Link>
    </div>
  );
}

export function AnalysisLiveDocument({ data, contractId, isPro }: AnalysisLiveDocumentProps) {
  return (
    <div className="flex h-[min(640px,calc(100vh-10rem))] flex-col lg:sticky lg:top-20">
      <div className="flex items-center justify-between rounded-t-2xl bg-primary px-4 py-3 text-on-primary">
        <span className="flex items-center gap-2 text-sm font-medium">
          <span className="material-symbols-outlined text-lg">visibility</span>
          Vista del documento
        </span>
        <span className="rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-semibold uppercase">
          Lectura general
        </span>
      </div>

      <div className="contract-viewer-scroll flex-1 overflow-y-auto rounded-b-2xl border border-t-0 border-outline-variant bg-[#f8faf9] p-6 shadow-inner sm:p-8">
        <div className="mx-auto max-w-prose font-serif text-sm leading-relaxed text-on-surface sm:text-base">
          <h2 className="mb-6 text-center text-xl font-bold uppercase">
            {data.contractTitle}
          </h2>
          <p className="mb-6 text-on-surface-variant">{data.documentParagraphs.intro}</p>

          {data.documentParagraphs.indemnity && (
            <RiskSectionTeaser
              title="Cláusula sensible"
              excerpt={data.documentParagraphs.indemnity}
              contractId={contractId}
              severity="high"
              isPro={isPro}
            />
          )}
          {data.documentParagraphs.ip && (
            <RiskSectionTeaser
              title="Otra cláusula sensible"
              excerpt={data.documentParagraphs.ip}
              contractId={contractId}
              severity="medium"
              isPro={isPro}
            />
          )}

          {data.documentParagraphs.law && (
            <div className="mb-8 rounded-lg border border-emerald-200 bg-emerald-50/50 p-4">
              <h3 className="mb-2 text-lg font-bold">Referencia normativa</h3>
              <p className="text-on-surface-variant">{data.documentParagraphs.law}</p>
            </div>
          )}

          <div className="border-t border-dashed border-outline-variant pt-6">
            <p className="text-xs text-on-surface-variant">
              Referencias legales del tipo de contrato: {data.lawReferences.join(' · ')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
