const BENTO = [
  {
    span: 'col-span-2',
    icon: 'psychology',
    title: 'Análisis con IA',
    description:
      'Resumen ejecutivo, cláusulas clave y referencias al corpus legal colombiano en cada revisión.',
    className: 'bg-surface-container',
    titleClass: undefined,
  },
  {
    span: '',
    icon: 'warning',
    title: 'Mitigación de riesgos',
    description: 'Prioriza alertas altas y medias antes de firmar.',
    className: 'bg-red-50/80',
    titleClass: 'text-red-800',
  },
  {
    span: '',
    icon: 'compare_arrows',
    title: 'Comparar versiones',
    description: 'Detecta cambios entre borradores con evaluación de riesgo.',
    className: 'bg-primary-container/30',
    titleClass: 'text-primary',
  },
] as const;

export function SignupValuePanel() {
  return (
    <section className="hidden flex-col gap-8 lg:flex lg:w-2/5">
      <div className="pt-8">
        <h1 className="font-display text-3xl font-bold leading-tight text-on-surface xl:text-4xl">
          Revisa contratos con más claridad
        </h1>
        <p className="mt-4 max-w-md text-lg text-on-surface-variant">
          Clausum ayuda a equipos legales en Colombia a analizar PDFs, detectar
          riesgos y comparar versiones. Tu cuenta guarda el historial de lo que
          analices; los análisis van con el plan Pro o se pagan por documento.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {BENTO.map((item) => (
          <div
            key={item.title}
            className={`flex flex-col gap-2 rounded-2xl p-5 ${item.className} ${item.span}`}
          >
            <span
              className={`material-symbols-outlined text-3xl ${
                item.titleClass ?? 'text-primary'
              }`}
            >
              {item.icon}
            </span>
            <h2
              className={`font-display text-base font-bold ${
                item.titleClass ?? 'text-on-surface'
              }`}
            >
              {item.title}
            </h2>
            <p className="text-sm text-on-surface-variant">{item.description}</p>
          </div>
        ))}
      </div>

      <blockquote className="mt-auto border-l-4 border-primary pl-4 text-sm italic text-on-surface-variant">
        &ldquo;Una primera pasada con IA nos ahorra horas de lectura lineal en cada
        contrato nuevo.&rdquo;
        <footer className="mt-2 not-italic text-xs text-on-surface-variant/80">
          — Equipo legal, cliente beta Clausum
        </footer>
      </blockquote>
    </section>
  );
}
