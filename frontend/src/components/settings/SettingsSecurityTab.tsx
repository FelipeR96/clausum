import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword,
} from 'firebase/auth';
import { useAuth } from '@/auth/AuthProvider';
import { getUserFacingErrorMessage } from '@/services/api/user-facing-errors';

export function SettingsSecurityTab() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const hasEmailProvider = user?.providerData.some((p) => p.providerId === 'password');
  const isAnonymous = user?.isAnonymous;

  const onChangePassword = async () => {
    if (!user?.email || !currentPassword || !newPassword) return;
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const cred = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, cred);
      await updatePassword(user, newPassword);
      setMessage('Contraseña actualizada correctamente.');
      setCurrentPassword('');
      setNewPassword('');
      setShowPasswordForm(false);
    } catch (err) {
      setError(getUserFacingErrorMessage(err, { action: 'actualizar tu contraseña' }));
    } finally {
      setSaving(false);
    }
  };

  const onSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <section className="space-y-6">
      <header>
        <h1 className="font-display text-2xl font-bold text-on-surface sm:text-3xl">
          Seguridad
        </h1>
        <p className="mt-2 text-on-surface-variant">
          Administra la autenticación de tu cuenta y tus preferencias de seguridad.
        </p>
      </header>

      <div className="space-y-4">
        <div className="glass-panel flex flex-col justify-between gap-4 rounded-2xl p-6 sm:flex-row sm:items-center">
          <div className="flex gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-container/50">
              <span className="material-symbols-outlined text-primary">password</span>
            </div>
            <div>
              <h2 className="font-display text-lg font-bold">Cambiar contraseña</h2>
              <p className="text-sm text-on-surface-variant">
                {isAnonymous
                  ? 'Crea una cuenta con email para gestionar contraseña.'
                  : hasEmailProvider
                    ? 'Actualiza tu contraseña de acceso.'
                    : 'Iniciaste sesión con un proveedor externo.'}
              </p>
            </div>
          </div>
          {hasEmailProvider && !isAnonymous ? (
            <button
              type="button"
              onClick={() => setShowPasswordForm((v) => !v)}
              className="rounded-xl border border-outline-variant px-4 py-2 text-sm font-semibold transition hover:bg-surface-container"
            >
              {showPasswordForm ? 'Cancelar' : 'Actualizar'}
            </button>
          ) : (
            <Link
              to="/signup"
              className="rounded-xl border border-outline-variant px-4 py-2 text-center text-sm font-semibold transition hover:bg-surface-container"
            >
              Crear cuenta
            </Link>
          )}
        </div>

        {showPasswordForm && (
          <div className="glass-panel space-y-4 rounded-2xl p-6">
            <input
              type="password"
              placeholder="Contraseña actual"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full rounded-xl border border-outline-variant px-4 py-3 text-sm"
            />
            <input
              type="password"
              placeholder="Nueva contraseña (mín. 6 caracteres)"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              minLength={6}
              className="w-full rounded-xl border border-outline-variant px-4 py-3 text-sm"
            />
            {error && <p className="text-sm text-red-700">{error}</p>}
            {message && <p className="text-sm text-primary">{message}</p>}
            <button
              type="button"
              disabled={saving}
              onClick={onChangePassword}
              className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-on-primary disabled:opacity-60"
            >
              {saving ? 'Guardando…' : 'Guardar nueva contraseña'}
            </button>
          </div>
        )}

        <div className="glass-panel flex flex-col justify-between gap-4 rounded-2xl p-6 sm:flex-row sm:items-center">
          <div className="flex gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-50">
              <span className="material-symbols-outlined text-red-600">logout</span>
            </div>
            <div>
              <h2 className="font-display text-lg font-bold">Cerrar sesión</h2>
              <p className="text-sm text-on-surface-variant">
                Sal de tu cuenta en este dispositivo.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onSignOut}
            className="rounded-xl border border-red-200 px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-50"
          >
            Cerrar sesión
          </button>
        </div>
      </div>
    </section>
  );
}
