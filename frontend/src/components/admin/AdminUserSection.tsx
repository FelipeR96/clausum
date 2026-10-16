import { useState } from 'react';
import {
  findUser,
  setUserPlan,
  type AdminUserView,
} from '@/services/admin.service';
import { getUserFacingErrorMessage } from '@/services/api/user-facing-errors';

function formatDate(iso?: string): string {
  if (!iso) return '—';
  return new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium' }).format(
    new Date(iso)
  );
}

function Dato({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-on-surface-variant">
        {etiqueta}
      </dt>
      <dd className="mt-0.5 text-sm text-on-surface">{valor}</dd>
    </div>
  );
}

export function AdminUserSection() {
  const [email, setEmail] = useState('');
  const [user, setUser] = useState<AdminUserView | null>(null);
  const [days, setDays] = useState(30);
  const [buscando, setBuscando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  async function buscar(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setBuscando(true);
    setError(null);
    setAviso(null);
    try {
      setUser(await findUser(email.trim()));
    } catch (err) {
      setUser(null);
      setError(getUserFacingErrorMessage(err));
    } finally {
      setBuscando(false);
    }
  }

  async function cambiarPlan(planId: 'free' | 'pro') {
    if (!user) return;
    setGuardando(true);
    setError(null);
    setAviso(null);
    try {
      const actualizado = await setUserPlan(
        user.uid,
        planId,
        planId === 'pro' ? days : undefined
      );
      setUser(actualizado);
      setAviso(
        planId === 'pro'
          ? `Pro concedido por ${days} días. No es un pago: queda marcado como concesión.`
          : 'Plan retirado. Vuelve a los límites de Free.'
      );
    } catch (err) {
      setError(getUserFacingErrorMessage(err));
    } finally {
      setGuardando(false);
    }
  }

  const esPro = user?.planId === 'pro';
  const concedido = Boolean(user?.planGrantedBy);

  return (
    <section className="glass-panel rounded-2xl p-6 sm:p-8">
      <h2 className="font-display text-xl font-bold text-on-surface">Usuarios</h2>
      <p className="mt-1 text-sm text-on-surface-variant">
        Buscar por correo exacto para cambiarle el plan. El listado completo está más abajo.
      </p>

      <form onSubmit={buscar} className="mt-5 flex flex-wrap gap-3">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="correo@ejemplo.com"
          className="min-w-64 flex-1 rounded-xl border border-outline/40 bg-surface px-4 py-2.5 text-sm text-on-surface"
        />
        <button
          type="submit"
          disabled={buscando || !email.trim()}
          className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-on-primary disabled:opacity-50"
        >
          {buscando ? 'Buscando…' : 'Buscar'}
        </button>
      </form>

      {error && (
        <p className="mt-4 text-sm text-error" role="alert">
          {error}
        </p>
      )}
      {aviso && <p className="mt-4 text-sm text-primary">{aviso}</p>}

      {user && (
        <div className="mt-6 rounded-2xl border border-outline/30 p-5">
          <dl className="grid gap-4 sm:grid-cols-3">
            <Dato etiqueta="Correo" valor={user.email ?? '—'} />
            <Dato etiqueta="Nombre" valor={user.displayName ?? '—'} />
            <Dato etiqueta="Plan" valor={user.planId.toUpperCase()} />
            <Dato etiqueta="Estado" valor={user.subscriptionStatus ?? '—'} />
            <Dato etiqueta="Fin de periodo" valor={formatDate(user.currentPeriodEnd)} />
            <Dato etiqueta="Registrado" valor={formatDate(user.createdAt)} />
            <Dato
              etiqueta="Origen del plan"
              valor={
                concedido
                  ? 'Concesión manual'
                  : user.billingProvider
                    ? `Pago (${user.billingProvider})`
                    : '—'
              }
            />
            <Dato etiqueta="Administrador" valor={user.isAdmin ? 'Sí' : 'No'} />
            <Dato
              etiqueta="Monto suscrito"
              valor={
                user.subscriptionAmountInCents
                  ? `${(user.subscriptionAmountInCents / 100).toLocaleString('es-CO')}`
                  : '—'
              }
            />
          </dl>

          {concedido && (
            <p className="mt-4 rounded-xl bg-primary-container/30 p-3 text-sm text-on-surface-variant">
              Este Pro lo concedió un administrador, no un pago. No genera
              ingresos ni se renueva solo.
            </p>
          )}

          <div className="mt-5 flex flex-wrap items-end gap-3 border-t border-outline/20 pt-5">
            {!esPro && (
              <label className="text-sm text-on-surface-variant">
                Días
                <input
                  type="number"
                  min={1}
                  max={3650}
                  value={days}
                  onChange={(e) => setDays(Number(e.target.value))}
                  className="ml-2 w-24 rounded-lg border border-outline/40 bg-surface px-3 py-1.5 text-sm text-on-surface"
                />
              </label>
            )}
            <button
              type="button"
              disabled={guardando}
              onClick={() => void cambiarPlan(esPro ? 'free' : 'pro')}
              className={
                esPro
                  ? 'rounded-xl border border-outline/40 px-5 py-2.5 text-sm font-semibold text-on-surface disabled:opacity-50'
                  : 'rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-on-primary disabled:opacity-50'
              }
            >
              {guardando
                ? 'Guardando…'
                : esPro
                  ? 'Pasar a Free'
                  : `Conceder Pro ${days} días`}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
