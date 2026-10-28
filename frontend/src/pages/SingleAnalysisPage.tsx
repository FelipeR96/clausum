import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import type { SingleAnalysisReport, SingleAnalysisState } from '@clausum/shared';
import { MarketingLayout } from '@/components/marketing/MarketingLayout';
import { AnalysisVerdictBanner } from '@/components/analysis-result/AnalysisVerdictBanner';
import { PaywallPanel } from '@/components/single/PaywallPanel';
import { ReportRiskCard } from '@/components/single/ReportRiskCard';
import { DeliveryPanel } from '@/components/single/DeliveryPanel';
import {
  capturarPagoPayPal,
  consultarAnalisisSuelto,
  obtenerInformeSuelto,
} from '@/services/single-analysis.service';
import { getUserFacingErrorMessage } from '@/services/api/user-facing-errors';
import { useRobotsMeta } from '@/seo/useRobotsMeta';

/**
 * El analisis de alguien que no tiene cuenta.
 *
 * ── Por que esta pantalla sondea ────────────────────────────────────────
 * El resto de la aplicacion escucha Firestore y se actualiza sola, pero eso
 * exige sesion. Aqui no hay, asi que se pregunta a la API cada pocos
 * segundos. Son dos momentos distintos:
 *
 *  1. Mientras el analisis corre. Tarda entre medio minuto y tres, asi que
 *     la espera hay que explicarla, no disimularla con un giro infinito.
 *  2. Al volver del pago con Wompi. El cobro lo confirma su webhook, que
 *     llega por detras y puede tardar unos segundos. Sin sondear, la persona
 *     volveria del banco y veria otra vez el boton de pagar.
 *
 * Con PayPal no se espera: se pide la captura, que es una llamada nuestra a
 * PayPal y responde en el acto.
 */

const CADA = 5_000;
/** Tope del sondeo tras volver del pago: 2 minutos. */
const INTENTOS_TRAS_PAGO = 24;

type Vista =
  | { tipo: 'cargando' }
  | { tipo: 'error'; mensaje: string }
  | { tipo: 'estado'; estado: SingleAnalysisState };

function Marco({ children }: { children: React.ReactNode }) {
  return (
    <MarketingLayout>
      <main className="mx-auto w-full max-w-4xl px-4 py-12 sm:px-6 sm:py-16">
        {children}
      </main>
    </MarketingLayout>
  );
}

function Centrado({
  icono,
  titulo,
  children,
}: {
  icono: string;
  titulo: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="mx-auto max-w-xl py-10 text-center">
      <span
        className="material-symbols-outlined text-5xl text-primary"
        aria-hidden="true"
      >
        {icono}
      </span>
      <h1 className="mt-4 font-display text-2xl font-bold text-on-surface sm:text-3xl">
        {titulo}
      </h1>
      {children}
    </div>
  );
}

export function SingleAnalysisPage() {
  // Esta pagina es el informe de alguien, y la referencia de la URL es su
  // credencial. Que no se indexe aunque el enlace se filtre.
  useRobotsMeta();

  const { reference = '' } = useParams<{ reference: string }>();
  const [searchParams] = useSearchParams();
  const vueltaDePago = searchParams.get('pago') === 'ok';

  const [vista, setVista] = useState<Vista>({ tipo: 'cargando' });
  const [informe, setInforme] = useState<SingleAnalysisReport | null>(null);
  const [entregado, setEntregado] = useState(false);

  /**
   * Si seguimos esperando la confirmacion del pago.
   *
   * Es estado y no un ref porque el render lo necesita: el aviso de "estamos
   * confirmando tu pago" depende de el. Un ref no provoca repintado, asi que
   * leerlo al renderizar da el valor de la vuelta anterior --y React avisa de
   * ello con razon.
   *
   * El CONTADOR si es un ref: solo lo lee el efecto que sondea, y subirlo no
   * tiene por que repintar nada.
   */
  const [esperandoConfirmacion, setEsperandoConfirmacion] = useState(vueltaDePago);
  const intentos = useRef(0);
  // La captura de PayPal se pide una vez, no en cada sondeo.
  const capturaPedida = useRef(false);

  const consultar = useCallback(async () => {
    try {
      const estado = await consultarAnalisisSuelto(reference);
      setVista({ tipo: 'estado', estado });
      return estado;
    } catch (err) {
      setVista({ tipo: 'error', mensaje: getUserFacingErrorMessage(err) });
      return null;
    }
  }, [reference]);

  useEffect(() => {
    void consultar();
  }, [consultar]);

  // Al volver de PayPal hay que pedir la captura: el cobro no se completa
  // solo. Con Wompi no hace falta, su webhook lo confirma.
  const estadoActual = vista.tipo === 'estado' ? vista.estado : null;

  useEffect(() => {
    if (!vueltaDePago || capturaPedida.current) return;
    if (estadoActual?.estado !== 'listo') return;
    if (estadoActual.pagado || estadoActual.provider !== 'paypal') return;

    capturaPedida.current = true;
    void capturarPagoPayPal(reference)
      .then(() => consultar())
      .catch(() => {
        // Si la captura falla, el sondeo de abajo sigue: el webhook de PayPal
        // es la otra via y puede llegar igual. No se pinta un error todavia
        // para no decirle "fallo" a alguien cuyo pago quiza ya entro.
      });
  }, [vueltaDePago, estadoActual, reference, consultar]);

  // Sondeo: mientras analiza, y tras volver del pago hasta que se confirme.
  useEffect(() => {
    if (!estadoActual) return;

    const analizando = estadoActual.estado === 'analizando';
    const esperandoPago =
      esperandoConfirmacion && estadoActual.estado === 'listo' && !estadoActual.pagado;

    if (!analizando && !esperandoPago) return;

    const t = window.setTimeout(() => {
      if (esperandoPago) {
        intentos.current += 1;
        if (intentos.current >= INTENTOS_TRAS_PAGO) {
          // Se deja de preguntar, pero no se dice que el pago fallo: pudo
          // entrar y tardar. La pantalla vuelve a ensenar el boton de pagar,
          // y si ya estaba cobrado la orden lo rechaza con ALREADY_PAID.
          setEsperandoConfirmacion(false);
          return;
        }
      }
      void consultar();
    }, CADA);

    return () => window.clearTimeout(t);
  }, [estadoActual, esperandoConfirmacion, consultar]);

  // Una vez pagado, se trae el informe entero. Verlo en pantalla no gasta la
  // entrega: eso lo gasta la descarga o el correo.
  const pagado = estadoActual?.estado === 'listo' && estadoActual.pagado;

  useEffect(() => {
    if (!pagado || informe || entregado) return;
    void obtenerInformeSuelto(reference)
      .then(setInforme)
      .catch(() => {
        // Si no se puede leer, el panel de entrega sigue sirviendo: el PDF se
        // genera en el servidor y no depende de esta lectura.
      });
  }, [pagado, informe, entregado, reference]);

  if (vista.tipo === 'cargando') {
    return (
      <Marco>
        <Centrado icono="hourglass_top" titulo="Buscando tu análisis…" />
      </Marco>
    );
  }

  if (vista.tipo === 'error') {
    return (
      <Marco>
        <Centrado icono="search_off" titulo="No encontramos este análisis">
          <p className="mt-3 text-on-surface-variant">{vista.mensaje}</p>
          <Link
            to="/analizar-documento"
            className="mt-6 inline-block rounded-full bg-primary px-6 py-3 font-semibold text-on-primary transition hover:brightness-110"
          >
            Analizar un contrato
          </Link>
        </Centrado>
      </Marco>
    );
  }

  const estado = vista.estado;

  if (estado.estado === 'expirado') {
    return (
      <Marco>
        <Centrado icono="auto_delete" titulo="Este análisis ya se borró">
          <p className="mt-3 leading-relaxed text-on-surface-variant">
            Los análisis sin cuenta duran 24 horas y luego se borran. No es un límite
            arbitrario: es la razón por la que puedes subir un contrato aquí sin
            registrarte.
          </p>
          <Link
            to="/analizar-documento"
            className="mt-6 inline-block rounded-full bg-primary px-6 py-3 font-semibold text-on-primary transition hover:brightness-110"
          >
            Analizar otro contrato
          </Link>
        </Centrado>
      </Marco>
    );
  }

  if (estado.estado === 'analizando') {
    return (
      <Marco>
        <Centrado icono="neurology" titulo="Estamos leyendo tu contrato">
          <p className="mt-3 leading-relaxed text-on-surface-variant">
            Suele tardar entre treinta segundos y dos minutos. Puedes dejar esta pestaña
            abierta; se actualiza sola.
          </p>
          <p className="mt-6 text-sm text-on-surface-variant">
            Guarda este enlace si quieres volver: es la única forma de recuperar tu
            análisis, porque no tenemos tu correo ni tu cuenta.
          </p>
        </Centrado>
      </Marco>
    );
  }

  if (entregado) {
    return (
      <Marco>
        <Centrado icono="task_alt" titulo="Listo, ya es tuyo">
          <p className="mt-3 leading-relaxed text-on-surface-variant">
            Tu informe ya salió y el análisis se borró de nuestros servidores, como
            prometimos. Si lo descargaste, revisa tu carpeta de descargas; si lo pediste
            por correo, puede tardar un par de minutos en llegar.
          </p>
          <Link
            to="/analizar-documento"
            className="mt-6 inline-block rounded-full border border-outline-variant px-6 py-3 font-semibold text-on-surface transition hover:bg-surface-container"
          >
            Analizar otro contrato
          </Link>
        </Centrado>
      </Marco>
    );
  }

  if (!estado.pagado) {
    return (
      <Marco>
        {esperandoConfirmacion && (
          <div className="mb-8 rounded-xl border border-outline-variant bg-primary-container/30 p-4 text-sm text-on-primary-container">
            Estamos confirmando tu pago con la pasarela. Puede tardar unos segundos; esta
            página se actualiza sola.
          </div>
        )}
        <h1 className="mb-6 font-display text-3xl font-bold text-on-surface sm:text-4xl">
          Tu contrato, revisado
        </h1>
        <PaywallPanel
          preview={estado.preview}
          amountInCents={estado.amountInCents}
          currency={estado.currency}
          truncado={estado.truncado}
          reference={reference}
        />
      </Marco>
    );
  }

  return (
    <Marco>
      <h1 className="mb-6 font-display text-3xl font-bold text-on-surface sm:text-4xl">
        Tu informe completo
      </h1>

      <div className="space-y-8">
        <DeliveryPanel reference={reference} onEntregado={() => setEntregado(true)} />

        {informe && (
          <>
            <AnalysisVerdictBanner favorability={informe.analysis.favorability} />

            {informe.analysis.summary && (
              <section>
                <h2 className="mb-3 font-display text-xl font-bold text-on-surface">
                  Resumen
                </h2>
                <p className="text-sm leading-relaxed text-on-surface-variant sm:text-base">
                  {informe.analysis.summary}
                </p>
              </section>
            )}

            {informe.risks.length > 0 && (
              <section>
                <h2 className="mb-2 font-display text-xl font-bold text-on-surface">
                  Riesgos encontrados
                </h2>
                {informe.risksSummary && (
                  <p className="mb-5 text-sm leading-relaxed text-on-surface-variant">
                    {informe.risksSummary}
                  </p>
                )}
                <div className="space-y-5">
                  {informe.risks.map((risk, i) => (
                    <ReportRiskCard key={`${risk.title}-${i}`} risk={risk} />
                  ))}
                </div>
              </section>
            )}

            <p className="text-xs leading-relaxed text-on-surface-variant">
              Este es un análisis automático y no sustituye la asesoría de un abogado.
            </p>
          </>
        )}
      </div>
    </Marco>
  );
}
