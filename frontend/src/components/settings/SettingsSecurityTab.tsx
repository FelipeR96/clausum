import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword,
} from 'firebase/auth';
import { useAuth } from '@/auth/AuthProvider';
import { getUserFacingErrorMessage } from '@/services/api/user-facing-errors';
import { deleteAccount, downloadAccountData } from '@/services/account.service';

export function SettingsSecurityTab() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Zona de peligro
  const [showDelete, setShowDelete] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deletePassword, setDeletePassword] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

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
    void navigate('/login');
  };

  const onExportData = async () => {
    setExporting(true);
    setExportError(null);
    try {
      await downloadAccountData();
    } catch (err) {
      setExportError(getUserFacingErrorMessage(err, { action: 'exportar tus datos' }));
    } finally {
      setExporting(false);
    }
  };

  // Se exige escribir el propio email: un botón de confirmación es demasiado
  // fácil de pulsar para algo que no se puede deshacer.
  const confirmationMatches =
    deleteConfirmText.trim().toLowerCase() === (user?.email ?? '').toLowerCase();

  const onDeleteAccount = async () => {
    if (!confirmationMatches) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      const result = await deleteAccount(hasEmailProvider ? deletePassword : undefined);

      // El backend avisa si algo quedó a medias (la pasarela, por ejemplo).
      // La cuenta ya está borrada, así que no se puede mostrar en la app:
      // se deja en consola para soporte y se sigue al login.
      if (result.warnings.length > 0) {
        console.warn('Avisos al eliminar la cuenta:', result.warnings);
      }

      await signOut();
      void navigate('/login?cuenta=eliminada', { replace: true });
    } catch (err) {
      setDeleteError(getUserFacingErrorMessage(err, { action: 'eliminar tu cuenta' }));
      setDeleting(false);
    }
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

      {/* ── Datos personales y zona de peligro ───────────────────── */}
      <div className="space-y-4 pt-4">
        <h2 className="font-display text-lg font-bold text-on-surface">Tus datos</h2>

        <div className="glass-panel flex flex-col justify-between gap-4 rounded-2xl p-6 sm:flex-row sm:items-center">
          <div className="flex gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-container/50">
              <span className="material-symbols-outlined text-primary">download</span>
            </div>
            <div>
              <h3 className="font-display text-lg font-bold">Descargar mis datos</h3>
              <p className="text-sm text-on-surface-variant">
                Tu perfil, contratos, análisis, comparaciones e historial en un
                archivo JSON.
              </p>
              {exportError && (
                <p className="mt-2 text-sm text-red-700" role="alert">
                  {exportError}
                </p>
              )}
            </div>
          </div>
          <button
            type="button"
            disabled={exporting}
            onClick={onExportData}
            className="rounded-xl border border-outline-variant px-4 py-2 text-sm font-semibold transition hover:bg-surface-container disabled:opacity-60"
          >
            {exporting ? 'Preparando…' : 'Descargar'}
          </button>
        </div>

        <div className="rounded-2xl border border-red-200 bg-red-50/40 p-6">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
            <div className="flex gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-red-100">
                <span className="material-symbols-outlined text-red-600">
                  delete_forever
                </span>
              </div>
              <div>
                <h3 className="font-display text-lg font-bold text-red-900">
                  Eliminar mi cuenta
                </h3>
                <p className="mt-1 text-sm text-red-900/80">
                  Esta acción es permanente y no se puede deshacer.
                </p>
              </div>
            </div>
            {!showDelete && (
              <button
                type="button"
                onClick={() => setShowDelete(true)}
                className="shrink-0 rounded-xl border border-red-300 bg-white px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-50"
              >
                Eliminar cuenta
              </button>
            )}
          </div>

          {showDelete && (
            <div className="mt-6 space-y-4 border-t border-red-200 pt-6">
              <div className="text-sm text-red-900/90">
                <p className="font-semibold">Se eliminará de forma permanente:</p>
                <ul className="mt-2 list-disc space-y-1 pl-5">
                  <li>Tu perfil y tus preferencias</li>
                  <li>Todos tus contratos y los archivos que subiste</li>
                  <li>Tus análisis, comparaciones, alertas e historial</li>
                </ul>
                <p className="mt-3 font-semibold">Y además:</p>
                <ul className="mt-2 list-disc space-y-1 pl-5">
                  <li>
                    Tu suscripción se cancelará antes de borrar los datos, para que
                    no se genere ningún cobro posterior.
                  </li>
                  <li>
                    Los comprobantes de pago se conservan sin vincularlos a ti,
                    porque la normativa tributaria obliga a retenerlos.
                  </li>
                </ul>
                <p className="mt-3">
                  Si quieres guardar una copia, descarga tus datos antes de
                  continuar.
                </p>
              </div>

              <label className="block text-sm font-medium text-red-900">
                Escribe <span className="font-mono">{user?.email}</span> para
                confirmar
                <input
                  type="text"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  autoComplete="off"
                  className="mt-1 w-full rounded-xl border border-red-300 px-4 py-3 text-sm"
                />
              </label>

              {hasEmailProvider && (
                <label className="block text-sm font-medium text-red-900">
                  Confirma tu contraseña
                  <input
                    type="password"
                    value={deletePassword}
                    onChange={(e) => setDeletePassword(e.target.value)}
                    autoComplete="current-password"
                    className="mt-1 w-full rounded-xl border border-red-300 px-4 py-3 text-sm"
                  />
                </label>
              )}

              {deleteError && (
                <p className="text-sm font-medium text-red-700" role="alert">
                  {deleteError}
                </p>
              )}

              <div className="flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  disabled={deleting || !confirmationMatches}
                  onClick={onDeleteAccount}
                  className="rounded-xl bg-red-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {deleting ? 'Eliminando…' : 'Eliminar mi cuenta definitivamente'}
                </button>
                <button
                  type="button"
                  disabled={deleting}
                  onClick={() => {
                    setShowDelete(false);
                    setDeleteConfirmText('');
                    setDeletePassword('');
                    setDeleteError(null);
                  }}
                  className="rounded-xl border border-outline-variant px-5 py-2.5 text-sm font-semibold transition hover:bg-surface-container"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
