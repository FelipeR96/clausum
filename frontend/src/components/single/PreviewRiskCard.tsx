import type { PreviewRisk } from '@clausum/shared';

/**
 * Un riesgo tal y como lo ve quien todavia no ha pagado.
 *
 * ── Lo que se ensena y lo que no ────────────────────────────────────────
 * Gratis van el nivel, el titulo y la CITA TEXTUAL del contrato. Esa cita es
 * la pieza que convence y conviene no quitarla para "dar menos": es texto
 * del documento que la persona acaba de subir, asi que no se le regala nada
 * que no tenga, y demuestra que leimos SU contrato y no una plantilla.
 *
 * ── El difuminado no esconde nada, porque no hay nada debajo ────────────
 * Un difuminado suele significar "esta aqui pero tapado", y aqui no: el
 * texto de pago no viaja al navegador. Lo que se pinta borroso son lineas
 * falsas del ancho aproximado que tendria el texto. Por eso se dice en voz
 * alta junto al candado --prometer que no esta y pintar algo que parece
 * estarlo seria una contradiccion que alguien va a abrir las herramientas
 * del navegador a comprobar.
 */

const NOMBRES: Record<string, string> = {
  description: 'En qué consiste',
  impact: 'Qué te pasa si se aplica',
  recommendation: 'Qué pedir',
  suggestedWording: 'Redacción sugerida',
};

/** Cuantas lineas falsas pinta cada campo, segun lo largo que suele ser. */
const LINEAS: Record<string, number> = {
  description: 2,
  impact: 2,
  recommendation: 2,
  suggestedWording: 3,
};

function LineasFalsas({ cuantas }: { cuantas: number }) {
  // Anchos distintos para que parezca un parrafo y no una barra de carga.
  const anchos = ['100%', '92%', '74%', '86%'];

  return (
    <div className="space-y-1.5" aria-hidden="true">
      {Array.from({ length: cuantas }, (_, i) => (
        <div
          key={i}
          className="h-2.5 rounded-full bg-on-surface/15"
          style={{ width: anchos[i % anchos.length] }}
        />
      ))}
    </div>
  );
}

export function PreviewRiskCard({ risk }: { risk: PreviewRisk }) {
  const esAlto = risk.level === 'high';
  const esMedio = risk.level === 'medium';

  const tarjeta = esAlto
    ? 'risk-card-high'
    : esMedio
      ? 'risk-card-medium'
      : 'border border-outline-variant bg-surface';

  const insignia = esAlto
    ? 'bg-red-600 text-white'
    : esMedio
      ? 'bg-amber-500 text-white'
      : 'bg-on-surface/10 text-on-surface-variant';

  const etiqueta = esAlto ? 'Riesgo alto' : esMedio ? 'Riesgo medio' : 'Riesgo bajo';

  return (
    <article className={`${tarjeta} rounded-2xl p-6 shadow-soft sm:p-7`}>
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <span
          className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-widest ${insignia}`}
        >
          {etiqueta}
        </span>
      </div>

      <h3 className="mb-4 font-display text-lg font-bold text-on-surface sm:text-xl">
        {risk.title}
      </h3>

      {risk.excerpt && (
        <blockquote className="border-l-2 border-outline-variant pl-4 text-sm italic leading-relaxed text-on-surface-variant">
          &ldquo;{risk.excerpt}&rdquo;
        </blockquote>
      )}

      {risk.locked.length > 0 && (
        <div className="mt-6 space-y-5 rounded-xl bg-surface-container/60 p-5">
          {risk.locked.map((campo) => (
            <div key={campo}>
              <div className="mb-2 flex items-center gap-1.5">
                <span
                  className="material-symbols-outlined text-sm text-on-surface-variant"
                  aria-hidden="true"
                >
                  lock
                </span>
                <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                  {NOMBRES[campo] ?? campo}
                </span>
              </div>
              <LineasFalsas cuantas={LINEAS[campo] ?? 2} />
            </div>
          ))}
        </div>
      )}
    </article>
  );
}
