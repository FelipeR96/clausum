import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useLocation } from 'react-router-dom';
import { reportarBug } from '@/services/bug-report.service';
import { getUserFacingErrorMessage } from '@/services/api/user-facing-errors';

const MINIMO = 10;

/**
 * Reportar un error desde donde ocurrió.
 *
 * La ruta se toma sola: pedírsela al usuario es pedirle que haga de
 * informático, y es justo el dato que más falta a la hora de reproducir.
 */
export function ReportBugDialog({ onClose }: { onClose: () => void }) {
  const { pathname } = useLocation();
  const [descripcion, setDescripcion] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [enviado, setEnviado] = useState(false);

  const suficiente = descripcion.trim().length >= MINIMO;

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    if (!suficiente) return;
    setEnviando(true);
    setError(null);
    try {
      await reportarBug(descripcion.trim(), pathname);
      setEnviado(true);
    } catch (err) {
      setError(getUserFacingErrorMessage(err, { action: 'enviar el reporte' }));
    } finally {
      setEnviando(false);
    }
  }

  // Se monta en <body> con un portal, no donde esta escrito.
  //
  // El menu lateral usa backdrop-blur, y un ancestro con backdrop-filter
  // (o transform, o filter) deja de ser transparente para el posicionado:
  // position:fixed pasa a medirse contra ese ancestro en vez de contra la
  // ventana. El dialogo salia recortado dentro del menu.
  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Reportar un problema"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-2xl bg-surface p-6 shadow-card"
        onClick={(ev) => ev.stopPropagation()}
      >
        {enviado ? (
          <>
            <h2 className="font-display text-lg font-bold text-on-surface">
              Gracias
            </h2>
            <p className="mt-2 text-sm text-on-surface-variant">
              Lo recibimos con la página desde la que lo enviaste. Si hace falta
              más información, te escribimos al correo de tu cuenta.
            </p>
            <button
              type="button"
              onClick={onClose}
              className="mt-5 w-full rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-on-primary transition hover:bg-primary/90"
            >
              Cerrar
            </button>
          </>
        ) : (
          <form onSubmit={enviar}>
            <h2 className="font-display text-lg font-bold text-on-surface">
              Reportar un problema
            </h2>
            <p className="mt-1 text-sm text-on-surface-variant">
              Cuéntanos qué intentabas hacer y qué pasó en su lugar.
            </p>

            <textarea
              value={descripcion}
              onChange={(ev) => setDescripcion(ev.target.value)}
              rows={6}
              maxLength={4000}
              autoFocus
              placeholder="Subí un contrato escaneado de 20 páginas y se quedó en «Analizando» más de diez minutos…"
              className="mt-4 w-full rounded-xl border border-outline-variant bg-surface-container px-4 py-3 text-sm text-on-surface placeholder:text-on-surface-variant/70"
            />

            <p className="mt-1 text-xs text-on-surface-variant">
              Adjuntamos automáticamente la página ({pathname}) y tu navegador.
              No incluimos el contenido de tus contratos.
            </p>

            {error && (
              <p className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p>
            )}

            <div className="mt-5 flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 rounded-xl border border-outline-variant px-6 py-2.5 text-sm font-semibold text-on-surface-variant transition hover:bg-surface-container"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={!suficiente || enviando}
                className="flex-1 rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-on-primary transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {enviando ? 'Enviando…' : 'Enviar'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>,
    document.body
  );
}
