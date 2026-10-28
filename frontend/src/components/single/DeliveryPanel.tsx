import { useState } from 'react';
import {
  descargarInformeSuelto,
  enviarInformeSuelto,
} from '@/services/single-analysis.service';
import { descargarInforme } from '@/services/export.service';
import { getUserFacingErrorMessage } from '@/services/api/user-facing-errors';

/**
 * Como se lleva la persona su informe.
 *
 * ── Hay que decir que es UNA sola vez, y decirlo antes ──────────────────
 * El informe se borra en cuanto se entrega, asi que descargar y enviarse el
 * correo no se pueden hacer los dos. Eso es facil de implementar y facil de
 * convertir en una queja: quien descarga y luego busca el boton del correo
 * siente que se lo quitaron. Por eso el aviso va ARRIBA, antes de los
 * botones, y no en un mensaje de error despues.
 *
 * ── Y si falla, no se gasta ─────────────────────────────────────────────
 * El servidor solo cierra la orden cuando la descarga sale completa o el
 * correo se acepta. Un fallo deja todo como estaba, asi que el panel vuelve
 * a mostrar las dos opciones en vez de dar la compra por perdida.
 */

type DeliveryPanelProps = {
  reference: string;
  onEntregado: () => void;
};

type Estado = 'eligiendo' | 'descargando' | 'escribiendo-correo' | 'enviando';

export function DeliveryPanel({ reference, onEntregado }: DeliveryPanelProps) {
  const [estado, setEstado] = useState<Estado>('eligiendo');
  const [correo, setCorreo] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function descargar() {
    setEstado('descargando');
    setError(null);
    try {
      descargarInforme(await descargarInformeSuelto(reference));
      onEntregado();
    } catch (err) {
      setError(getUserFacingErrorMessage(err));
      setEstado('eligiendo');
    }
  }

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setEstado('enviando');
    setError(null);
    try {
      await enviarInformeSuelto(reference, correo.trim());
      onEntregado();
    } catch (err) {
      setError(getUserFacingErrorMessage(err));
      setEstado('escribiendo-correo');
    }
  }

  return (
    <section className="rounded-2xl border border-outline-variant bg-surface p-6 shadow-soft sm:p-8">
      <h2 className="font-display text-2xl font-bold text-on-surface">
        Guarda tu informe
      </h2>

      <div className="mt-4 rounded-xl bg-primary-container/30 p-4">
        <p className="text-sm leading-relaxed text-on-primary-container">
          <span className="font-semibold">Elige una de las dos.</span> No guardamos copia
          de tu análisis: se borra en cuanto te lo entregamos, así que esta es la única
          vez que puedes llevártelo.
        </p>
      </div>

      {estado === 'escribiendo-correo' || estado === 'enviando' ? (
        <form onSubmit={(e) => void enviar(e)} className="mt-6">
          <label
            htmlFor="correo-informe"
            className="block text-sm font-medium text-on-surface"
          >
            ¿A qué correo lo enviamos?
          </label>
          <input
            id="correo-informe"
            type="email"
            required
            autoFocus
            value={correo}
            onChange={(e) => setCorreo(e.target.value)}
            placeholder="tucorreo@ejemplo.com"
            disabled={estado === 'enviando'}
            className="mt-2 w-full rounded-xl border border-outline-variant bg-surface px-4 py-3 text-on-surface outline-none transition focus:border-primary disabled:opacity-60"
          />

          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <button
              type="submit"
              disabled={estado === 'enviando'}
              className="flex-1 rounded-full bg-primary px-6 py-3 font-semibold text-on-primary transition hover:brightness-110 disabled:opacity-60"
            >
              {estado === 'enviando' ? 'Enviando…' : 'Enviar el informe'}
            </button>
            <button
              type="button"
              onClick={() => {
                setEstado('eligiendo');
                setError(null);
              }}
              disabled={estado === 'enviando'}
              className="rounded-full border border-outline-variant px-6 py-3 font-semibold text-on-surface transition hover:bg-surface-container disabled:opacity-60"
            >
              Volver
            </button>
          </div>
        </form>
      ) : (
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={() => void descargar()}
            disabled={estado === 'descargando'}
            className="flex flex-1 items-center justify-center gap-2 rounded-full bg-primary px-6 py-3.5 font-semibold text-on-primary transition hover:brightness-110 disabled:opacity-60"
          >
            <span className="material-symbols-outlined text-xl" aria-hidden="true">
              download
            </span>
            {estado === 'descargando' ? 'Preparando el PDF…' : 'Descargar el PDF'}
          </button>
          <button
            type="button"
            onClick={() => setEstado('escribiendo-correo')}
            disabled={estado === 'descargando'}
            className="flex flex-1 items-center justify-center gap-2 rounded-full border border-outline-variant px-6 py-3.5 font-semibold text-on-surface transition hover:bg-surface-container disabled:opacity-60"
          >
            <span className="material-symbols-outlined text-xl" aria-hidden="true">
              mail
            </span>
            Enviarlo a mi correo
          </button>
        </div>
      )}

      {error && (
        <p className="mt-4 text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}
