import { useCallback, useEffect, useState } from 'react';
import {
  listUsers,
  type AdminUserRow,
  type OrdenUsuarios,
  type PlanSlug,
} from '@/services/admin.service';
import { getUserFacingErrorMessage } from '@/services/api/user-facing-errors';

function fecha(iso?: string): string {
  if (!iso) return '—';
  return new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium' }).format(
    new Date(iso)
  );
}

function dinero(centavos?: number, moneda = 'COP'): string {
  if (typeof centavos !== 'number') return '—';
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: moneda,
    maximumFractionDigits: 0,
  }).format(centavos / 100);
}

/** Cómo llegó al plan: un pago, una concesión manual, o nada. */
function origen(u: AdminUserRow): { texto: string; clase: string } {
  if (u.planId !== 'pro') return { texto: '—', clase: 'text-on-surface-variant' };
  if (u.planGrantedBy) {
    return { texto: 'Cortesía', clase: 'text-amber-700 dark:text-amber-400' };
  }
  if (u.billingProvider) {
    return { texto: u.billingProvider, clase: 'text-on-surface' };
  }
  return { texto: 'Sin origen', clase: 'text-red-600 dark:text-red-400' };
}

/**
 * Lo que de verdad paga esa persona.
 *
 * `subscriptionAmountInCents` sobrevive a un cambio de plan y a una
 * concesión manual, así que mostrarlo sin más haría que una cortesía
 * pareciera un cliente de pago — justo lo que la columna Origen intenta
 * evitar.
 */
function importe(u: AdminUserRow): string {
  if (u.planId !== 'pro' || u.planGrantedBy) return '—';
  return dinero(u.subscriptionAmountInCents);
}

const PLANES: { valor: PlanSlug | 'todos'; etiqueta: string }[] = [
  { valor: 'todos', etiqueta: 'Todos' },
  { valor: 'pro', etiqueta: 'Pro' },
  { valor: 'free', etiqueta: 'Free' },
];

const ESTADOS = [
  { valor: '', etiqueta: 'Cualquier estado' },
  { valor: 'active', etiqueta: 'Activos' },
  { valor: 'canceled', etiqueta: 'Cancelados' },
  { valor: 'past_due', etiqueta: 'En mora' },
];

export function AdminUsersListSection() {
  const [filas, setFilas] = useState<AdminUserRow[]>([]);
  const [plan, setPlan] = useState<PlanSlug | 'todos'>('todos');
  const [estado, setEstado] = useState('');
  const [orden, setOrden] = useState<OrdenUsuarios>('recientes');
  const [buscar, setBuscar] = useState('');
  const [buscado, setBuscado] = useState('');
  const [cursores, setCursores] = useState<string[]>([]);
  const [siguiente, setSiguiente] = useState<string | undefined>();
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(
    async (cursor?: string) => {
      setCargando(true);
      setError(null);
      try {
        const r = await listUsers({
          plan: plan === 'todos' ? undefined : plan,
          estado: estado || undefined,
          buscar: buscado || undefined,
          orden,
          cursor,
          limit: 25,
        });
        setFilas(r.usuarios);
        setSiguiente(r.siguienteCursor);
      } catch (err) {
        setError(getUserFacingErrorMessage(err, { action: 'cargar los usuarios' }));
      } finally {
        setCargando(false);
      }
    },
    [plan, estado, orden, buscado]
  );

  useEffect(() => {
    setCursores([]);
    void cargar(undefined);
    // Cualquier cambio de filtro reinicia la paginación: mantener el cursor
    // daría una página intermedia de otra lista.
  }, [cargar]);

  return (
    <section className="glass-panel rounded-2xl p-6 sm:p-8">
      <h2 className="font-display text-xl font-bold text-on-surface">
        Todos los usuarios
      </h2>
      <p className="mt-1 text-sm text-on-surface-variant">
        Buscar por correo ignora los demás filtros.
      </p>

      <form
        className="mt-4 flex flex-wrap items-end gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          setBuscado(buscar.trim());
        }}
      >
        <label className="text-xs text-on-surface-variant">
          Correo (empieza por)
          <input
            type="search"
            value={buscar}
            onChange={(e) => setBuscar(e.target.value)}
            placeholder="maria@"
            className="mt-1 block w-56 rounded-lg border border-outline-variant bg-surface px-3 py-1.5 text-sm text-on-surface"
          />
        </label>
        <button
          type="submit"
          className="rounded-lg border border-outline-variant px-3 py-1.5 text-sm transition hover:bg-surface-container"
        >
          Buscar
        </button>
        {buscado && (
          <button
            type="button"
            onClick={() => {
              setBuscar('');
              setBuscado('');
            }}
            className="rounded-lg px-3 py-1.5 text-sm text-primary hover:underline"
          >
            Quitar búsqueda
          </button>
        )}
      </form>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <div className="inline-flex rounded-full border border-outline-variant bg-surface p-1">
          {PLANES.map((f) => (
            <button
              key={f.valor}
              type="button"
              disabled={!!buscado}
              onClick={() => setPlan(f.valor)}
              className={`rounded-full px-4 py-1.5 text-xs font-semibold transition disabled:opacity-40 ${
                plan === f.valor
                  ? 'bg-primary text-on-primary'
                  : 'text-on-surface-variant hover:bg-surface-container'
              }`}
            >
              {f.etiqueta}
            </button>
          ))}
        </div>

        <select
          value={estado}
          disabled={!!buscado}
          onChange={(e) => setEstado(e.target.value)}
          className="rounded-lg border border-outline-variant bg-surface px-3 py-1.5 text-sm text-on-surface disabled:opacity-40"
        >
          {ESTADOS.map((e) => (
            <option key={e.valor} value={e.valor}>
              {e.etiqueta}
            </option>
          ))}
        </select>

        <select
          value={orden}
          disabled={!!buscado}
          onChange={(e) => setOrden(e.target.value as OrdenUsuarios)}
          className="rounded-lg border border-outline-variant bg-surface px-3 py-1.5 text-sm text-on-surface disabled:opacity-40"
        >
          <option value="recientes">Más recientes primero</option>
          <option value="vencimiento">Vencen antes primero</option>
        </select>
      </div>

      {orden === 'vencimiento' && !buscado && (
        <p className="mt-2 text-xs text-on-surface-variant">
          Con este orden solo salen quienes tienen periodo de pago; los demás
          no vencen.
        </p>
      )}

      {error && (
        <p className="mt-4 text-sm text-red-600 dark:text-red-400">{error}</p>
      )}

      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[56rem] text-left text-sm">
          <thead>
            <tr className="border-b border-outline-variant/60 text-xs uppercase tracking-wide text-on-surface-variant">
              <th className="py-2 pr-4 font-semibold">Correo</th>
              <th className="py-2 pr-4 font-semibold">Plan</th>
              <th className="py-2 pr-4 font-semibold">Estado</th>
              <th className="py-2 pr-4 font-semibold">Origen</th>
              <th className="py-2 pr-4 font-semibold">Importe</th>
              <th className="py-2 pr-4 font-semibold">Vence</th>
              <th className="py-2 pr-4 font-semibold">Alta</th>
            </tr>
          </thead>
          <tbody>
            {filas.map((u) => {
              const o = origen(u);
              return (
                <tr
                  key={u.uid}
                  className="border-b border-outline-variant/30 align-top"
                >
                  <td className="py-3 pr-4">
                    <div className="text-on-surface">{u.email ?? '—'}</div>
                    {/* El uid y el id de suscripción son lo que hace falta
                        para buscar en Firestore o en el panel de Wompi
                        cuando alguien reclama. */}
                    <div className="mt-0.5 font-mono text-xs text-on-surface-variant">
                      {u.uid}
                    </div>
                    {u.subscriptionId && (
                      <div className="font-mono text-xs text-on-surface-variant">
                        {u.subscriptionId}
                      </div>
                    )}
                  </td>
                  <td className="py-3 pr-4 font-semibold uppercase">{u.planId}</td>
                  <td className="py-3 pr-4">{u.subscriptionStatus ?? '—'}</td>
                  <td className={`py-3 pr-4 ${o.clase}`}>
                    {o.texto}
                    {u.billingInterval && !u.planGrantedBy && (
                      <span className="block text-xs text-on-surface-variant">
                        {u.billingInterval === 'annual' ? 'anual' : 'mensual'}
                      </span>
                    )}
                  </td>
                  <td className="py-3 pr-4">{importe(u)}</td>
                  <td className="py-3 pr-4">{fecha(u.currentPeriodEnd)}</td>
                  <td className="py-3 pr-4">{fecha(u.createdAt)}</td>
                </tr>
              );
            })}
            {filas.length === 0 && !cargando && (
              <tr>
                <td
                  colSpan={7}
                  className="py-6 text-center text-on-surface-variant"
                >
                  {buscado
                    ? `Ningún correo empieza por «${buscado}».`
                    : 'No hay usuarios con esos filtros.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <span className="text-xs text-on-surface-variant">
          {cargando ? 'Cargando…' : `Página ${cursores.length + 1}`}
        </span>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={cursores.length === 0 || cargando}
            onClick={() => {
              const previos = cursores.slice(0, -1);
              setCursores(previos);
              void cargar(previos[previos.length - 1]);
            }}
            className="rounded-lg border border-outline-variant px-3 py-1.5 text-sm transition hover:bg-surface-container disabled:opacity-40"
          >
            Anterior
          </button>
          <button
            type="button"
            disabled={!siguiente || cargando}
            onClick={() => {
              if (!siguiente) return;
              setCursores([...cursores, siguiente]);
              void cargar(siguiente);
            }}
            className="rounded-lg border border-outline-variant px-3 py-1.5 text-sm transition hover:bg-surface-container disabled:opacity-40"
          >
            Siguiente
          </button>
        </div>
      </div>
    </section>
  );
}
