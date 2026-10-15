import { useEffect, useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { sendPasswordResetEmail } from 'firebase/auth';
import { useAuth } from '@/auth/AuthProvider';
import { getUserFacingErrorMessage } from '@/services/api/user-facing-errors';
import { getFirebaseAuth } from '@/firebase';
import { useEmulators } from '@/firebase/config';
import { GoogleIcon } from '@/components/auth/GoogleIcon';
import { PasswordInput } from '@/components/auth/PasswordInput';

const REMEMBER_KEY = 'clausum-remember-email';
const REMEMBER_PREF_KEY = 'clausum-remember-enabled';

export function LoginCard() {
  const { signIn, signInDemo, signInWithGoogle } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? '/panel';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(REMEMBER_KEY);
    const rememberEnabled = localStorage.getItem(REMEMBER_PREF_KEY) === '1';
    if (saved) {
      setEmail(saved);
    }
    if (rememberEnabled) {
      setRemember(true);
    }
  }, []);

  const persistRememberedEmail = (nextEmail: string, shouldRemember: boolean) => {
    if (shouldRemember && nextEmail.trim()) {
      localStorage.setItem(REMEMBER_KEY, nextEmail.trim());
      localStorage.setItem(REMEMBER_PREF_KEY, '1');
      return;
    }
    localStorage.removeItem(REMEMBER_KEY);
    localStorage.removeItem(REMEMBER_PREF_KEY);
  };

  const onEmailChange = (nextEmail: string) => {
    setEmail(nextEmail);
    if (remember) {
      persistRememberedEmail(nextEmail, true);
    }
  };

  const onRememberChange = (checked: boolean) => {
    setRemember(checked);
    persistRememberedEmail(email, checked);
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setLoading(true);
    try {
      persistRememberedEmail(email, remember);
      await signIn(email, password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(getUserFacingErrorMessage(err, { action: 'iniciar sesión' }));
    } finally {
      setLoading(false);
    }
  };

  const onGoogle = async () => {
    setLoading(true);
    setError(null);
    setInfo(null);
    try {
      await signInWithGoogle();
      navigate(from, { replace: true });
    } catch (err) {
      setError(getUserFacingErrorMessage(err, { action: 'iniciar sesión con Google' }));
    } finally {
      setLoading(false);
    }
  };

  const onDemo = async () => {
    setLoading(true);
    setError(null);
    try {
      await signInDemo();
      navigate(from, { replace: true });
    } catch (err) {
      setError(getUserFacingErrorMessage(err, { action: 'iniciar sesión demo' }));
    } finally {
      setLoading(false);
    }
  };

  const onForgotPassword = async () => {
    setError(null);
    setInfo(null);
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setError('Escribe tu correo arriba para recuperar la contraseña.');
      document.getElementById('login-email')?.focus();
      return;
    }

    setResetLoading(true);
    try {
      await sendPasswordResetEmail(getFirebaseAuth(), trimmedEmail, {
        url: `${window.location.origin}/login`,
      });
      if (useEmulators) {
        setInfo(
          'Solicitud enviada en el emulador local. Abre Firebase Emulator Suite → Authentication para ver el enlace de recuperación (no llega a tu bandeja real).'
        );
      } else {
        setInfo(
          'Si el correo está registrado, te enviamos un enlace para restablecer la contraseña. Revisa tu bandeja y spam.'
        );
      }
    } catch (err) {
      setError(getUserFacingErrorMessage(err, { action: 'enviar el correo de recuperación' }));
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md rounded-2xl border border-outline-variant/40 bg-surface p-8 shadow-card sm:p-10">
      <div className="mb-8 text-center">
        <h1 className="font-display text-3xl font-bold text-on-surface">
          Bienvenido de nuevo
        </h1>
        <p className="mt-2 text-on-surface-variant">
          Inicia sesión en tu cuenta de Clausum.
        </p>
      </div>

      {error && (
        <div className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>
      )}
      {info && (
        <div className="mb-4 rounded-xl bg-primary-container/40 px-4 py-3 text-sm text-on-primary-container">
          {info}
        </div>
      )}

      <div className="space-y-3">
        <button
          type="button"
          disabled={loading}
          onClick={onGoogle}
          className="flex w-full items-center justify-center gap-3 rounded-xl border border-outline-variant py-3 text-sm font-medium text-on-surface transition hover:bg-surface-container active:scale-[0.99] disabled:opacity-60"
        >
          <GoogleIcon />
          Continuar con Google
        </button>
      </div>

      <div className="my-6 flex items-center gap-4">
        <div className="h-px flex-1 bg-outline-variant" />
        <span className="text-xs font-semibold uppercase tracking-widest text-on-surface-variant">
          O email
        </span>
        <div className="h-px flex-1 bg-outline-variant" />
      </div>

      <form onSubmit={onSubmit} className="space-y-5">
        <div>
          <label
            htmlFor="login-email"
            className="mb-1.5 block px-1 text-xs font-semibold uppercase tracking-wide text-on-surface-variant"
          >
            Correo electrónico
          </label>
          <input
            id="login-email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => onEmailChange(e.target.value)}
            placeholder="nombre@empresa.com"
            className="auth-input"
          />
        </div>

        <div>
          <div className="mb-1.5 flex items-center justify-between px-1">
            <label
              htmlFor="login-password"
              className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant"
            >
              Contraseña
            </label>
            <button
              type="button"
              onClick={() => void onForgotPassword()}
              disabled={resetLoading || loading}
              className="text-xs font-semibold text-primary hover:underline disabled:cursor-wait disabled:opacity-60"
            >
              {resetLoading ? 'Enviando enlace…' : '¿Olvidaste tu contraseña?'}
            </button>
          </div>
          <PasswordInput
            id="login-password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
          />
        </div>

        <label className="flex cursor-pointer items-center gap-2 px-1">
          <input
            type="checkbox"
            checked={remember}
            onChange={(e) => onRememberChange(e.target.checked)}
            className="h-4 w-4 rounded border-outline-variant text-primary focus:ring-primary"
          />
          <span className="text-sm text-on-surface-variant">
            Recordar mi correo en este dispositivo
          </span>
        </label>

        <button
          type="submit"
          disabled={loading}
          className="mt-2 w-full rounded-xl bg-primary py-3.5 text-sm font-semibold text-on-primary shadow-soft transition hover:bg-primary/90 active:scale-[0.99] disabled:opacity-60"
        >
          {loading ? 'Autenticando…' : 'Iniciar sesión'}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-on-surface-variant">
        ¿No tienes una cuenta?{' '}
        <Link to="/signup" className="font-semibold text-primary hover:underline">
          Crear cuenta gratis
        </Link>
      </p>

      <button
        type="button"
        disabled={loading}
        onClick={onDemo}
        className="mt-4 w-full text-center text-xs text-on-surface-variant underline-offset-2 hover:text-primary hover:underline disabled:opacity-60"
      >
        Probar en modo demo (sin registro)
      </button>
    </div>
  );
}
