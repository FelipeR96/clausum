import { useState, type DragEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CONTRACT_FILE_ACCEPT,
  formatAmount,
  isSupportedContractFileName,
  type CountryCode,
} from '@clausum/shared';
import { MarketingLayout } from '@/components/marketing/MarketingLayout';
import { PageSeo } from '@/seo/PageSeo';
import { SEO_PAGES } from '@/seo/pages';
import { SeoBreadcrumbs } from '@/components/marketing/SeoBreadcrumbs';
import { DocumentUploadGuidance } from '@/components/contracts/DocumentUploadGuidance';
import { AvisoAntesDeAnalizar } from '@/components/single/AvisoAntesDeAnalizar';
import {
  ContractCountrySelect,
  DEFAULT_CONTRACT_COUNTRY,
} from '@/components/contracts/ContractCountrySelect';
import { useBillingRegion } from '@/hooks/useBillingRegion';
import { usePricing, singleAnalysisAmountFor } from '@/hooks/usePricing';
import { analizarSinCuenta } from '@/services/single-analysis.service';
import { getUserFacingErrorMessage } from '@/services/api/user-facing-errors';

/**
 * Subir un contrato sin tener cuenta.
 *
 * ── El analisis va ANTES del pago, y eso manda en la pantalla ───────────
 * Nadie paga 9.550 pesos a una marca que no conoce por algo que no ha
 * visto. Asi que aqui no se pide tarjeta ni correo: se sube el documento, se
 * analiza y se ensena lo que encontramos. El precio se nombra desde el
 * principio para que nadie se sienta emboscado al final, pero el boton no
 * cobra nada.
 *
 * ── Sin OCR, y se dice ──────────────────────────────────────────────────
 * Un PDF escaneado se rechaza. El analisis corre antes de que nadie pague,
 * asi que conceder OCR seria gastar hasta nueve minutos de CPU en gente que
 * quiza no compre. Se avisa arriba y no en un error despues de esperar.
 */

/** 10 MB, el mismo tope que acepta la API. */
const MAX_BYTES = 10 * 1024 * 1024;

function tamano(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function AnalizarDocumentoPage() {
  const navigate = useNavigate();
  const { region } = useBillingRegion();
  const { pricing } = usePricing();
  const precio = singleAnalysisAmountFor(pricing, region);
  const moneda = region === 'CO' ? pricing.CO.currency : pricing.LATAM.currency;

  const [file, setFile] = useState<File | null>(null);
  const [country, setCountry] = useState<CountryCode>(DEFAULT_CONTRACT_COUNTRY);
  const [encima, setEncima] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [subiendo, setSubiendo] = useState(false);

  function elegir(elegido: File | undefined) {
    if (!elegido) return;

    // Las dos comprobaciones se hacen aqui y tambien en el servidor. Aqui
    // para no hacer esperar una subida que va a fallar; alli porque el
    // navegador no es sitio donde confiar un limite.
    if (!isSupportedContractFileName(elegido.name)) {
      setError('Solo aceptamos PDF o Word (.doc, .docx).');
      return;
    }
    if (elegido.size > MAX_BYTES) {
      setError(`El archivo pesa ${tamano(elegido.size)} y el máximo son 10 MB.`);
      return;
    }

    setError(null);
    setFile(elegido);
  }

  function soltar(e: DragEvent) {
    e.preventDefault();
    setEncima(false);
    elegir(e.dataTransfer.files[0]);
  }

  async function analizar() {
    if (!file) return;
    setSubiendo(true);
    setError(null);
    try {
      const { reference } = await analizarSinCuenta({ file, region, country });
      // void: navigate() devuelve una promesa en react-router v7 y aqui no hay
      // nada que esperar --la navegacion es lo ultimo que hace esta funcion.
      void navigate(`/analisis/${reference}`);
    } catch (err) {
      setError(getUserFacingErrorMessage(err));
      setSubiendo(false);
    }
  }

  return (
    <MarketingLayout>
      <PageSeo page={SEO_PAGES.singleDocument} />
      <SeoBreadcrumbs items={SEO_PAGES.singleDocument.breadcrumbs} />
      <main className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
        <h1 className="font-display text-3xl font-bold text-on-surface sm:text-4xl">
          Analiza un contrato sin crear cuenta
        </h1>
        <p className="mt-4 text-base leading-relaxed text-on-surface-variant">
          Sube el documento y te decimos a quién favorece, cuántas cláusulas peligrosas
          tiene y cuáles son, citando tu propio texto. Eso es gratis y no pedimos ni
          correo. Si quieres el detalle de cada riesgo y qué pedir para arreglarlo, cuesta{' '}
          <span className="font-semibold text-on-surface">
            {formatAmount(precio, moneda)}
          </span>{' '}
          una sola vez.
        </p>

        <div className="mt-6 rounded-xl border border-outline-variant bg-surface-container/50 p-4">
          <p className="text-sm leading-relaxed text-on-surface-variant">
            <span className="font-semibold text-on-surface">
              Tu contrato no se guarda.
            </span>{' '}
            El archivo no toca nuestro disco: se lee en memoria y se descarta. El análisis
            vive 24 horas por si quieres volver, y se borra en cuanto te lo entregamos.
          </p>
        </div>

        <DocumentUploadGuidance variant="banner" ocrAllowed={false} className="mt-6" />

        <div
          onDragOver={(e) => {
            e.preventDefault();
            setEncima(true);
          }}
          onDragLeave={() => setEncima(false)}
          onDrop={soltar}
          className={`mt-8 rounded-2xl border-2 border-dashed p-8 text-center transition sm:p-12 ${
            encima
              ? 'border-primary bg-primary-container/30'
              : 'border-outline-variant bg-surface'
          }`}
        >
          {file ? (
            <div>
              <span
                className="material-symbols-outlined text-4xl text-primary"
                aria-hidden="true"
              >
                description
              </span>
              <p className="mt-3 font-semibold text-on-surface">{file.name}</p>
              <p className="text-sm text-on-surface-variant">{tamano(file.size)}</p>
              <button
                type="button"
                onClick={() => setFile(null)}
                disabled={subiendo}
                className="mt-3 text-sm font-semibold text-primary hover:underline disabled:opacity-60"
              >
                Elegir otro archivo
              </button>
            </div>
          ) : (
            <div>
              <span
                className="material-symbols-outlined text-4xl text-on-surface-variant"
                aria-hidden="true"
              >
                upload_file
              </span>
              <p className="mt-3 font-semibold text-on-surface">
                Arrastra tu contrato aquí
              </p>
              <p className="mt-1 text-sm text-on-surface-variant">PDF o Word, hasta 10 MB</p>
              <label className="mt-4 inline-block cursor-pointer rounded-full border border-outline-variant px-5 py-2.5 text-sm font-semibold text-on-surface transition hover:bg-surface-container">
                Buscar en mi equipo
                <input
                  type="file"
                  accept={CONTRACT_FILE_ACCEPT}
                  className="hidden"
                  onChange={(e) => elegir(e.target.files?.[0])}
                />
              </label>
            </div>
          )}
        </div>

        <div className="mt-6">
          <label
            htmlFor="pais-contrato"
            className="block text-sm font-medium text-on-surface"
          >
            ¿Bajo qué país se rige?
          </label>
          <p className="mb-2 mt-1 text-xs text-on-surface-variant">
            Decide con qué leyes se compara tu contrato.
          </p>
          {/* El selector ya pinta el descargo del pais por su cuenta. */}
          <ContractCountrySelect
            id="pais-contrato"
            value={country}
            onChange={setCountry}
            disabled={subiendo}
          />
        </div>

        <button
          type="button"
          onClick={() => void analizar()}
          disabled={!file || subiendo}
          className="mt-8 w-full rounded-full bg-primary px-6 py-4 font-semibold text-on-primary transition hover:brightness-110 disabled:opacity-50"
        >
          {subiendo ? 'Subiendo tu contrato…' : 'Analizar gratis'}
        </button>

        {error && (
          <p className="mt-4 text-center text-sm text-red-600" role="alert">
            {error}
          </p>
        )}

        <p className="mt-4 text-center text-xs text-on-surface-variant">
          No se cobra nada ahora. Verás el precio y lo que encontramos antes de decidir.
        </p>

        <AvisoAntesDeAnalizar />
      </main>
    </MarketingLayout>
  );
}
