import { useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { updateProfile } from 'firebase/auth';
import { useAuth } from '@/auth/AuthProvider';
import { getUserFacingErrorMessage } from '@/services/api/user-facing-errors';
import { getFirebaseAuth } from '@/firebase/auth';
import { PasswordInput } from '@/components/auth/PasswordInput';

const ROLES = [
  'Abogado independiente',
  'Asesor jurídico interno',
  'Administrador de contratos',
  'Estudiante de derecho',
  'Otro',
] as const;

const PROFILE_EXTRA_KEY = 'clausum-profile-extra';

type Step = 1 | 2 | 3;

function stepProgress(step: Step) {
  return (step / 3) * 100;
}

export function SignupWizard() {
  const { signUp, signInWithGoogle } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? '/panel';

  const [step, setStep] = useState<Step>(1);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [role, setRole] = useState<string>(ROLES[0]);
  const [company, setCompany] = useState('');
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [newsletter, setNewsletter] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const goNext = () => {
    setError(null);
    if (step === 1) {
      if (!email.trim() || password.length < 8) {
        setError('Usa un email válido y una contraseña de al menos 8 caracteres.');
        return;
      }
      setStep(2);
      return;
    }
    if (step === 2) {
      if (!firstName.trim() || !lastName.trim()) {
        setError('Indica tu nombre y apellido.');
        return;
      }
      setStep(3);
    }
  };

  const onCreateAccount = async (e: FormEvent) => {
    e.preventDefault();
    if (!acceptTerms) {
      setError('Debes aceptar los términos para continuar.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const displayName = `${firstName.trim()} ${lastName.trim()}`;
      await signUp(email.trim(), password, { displayName });

      const auth = getFirebaseAuth();
      const user = auth.currentUser;

      if (user) {
        await updateProfile(user, { displayName });
        localStorage.setItem(
          `${PROFILE_EXTRA_KEY}:${user.uid}`,
          JSON.stringify({
            jobTitle: role,
            organization: company.trim(),
            newsletter,
          })
        );
      }

      void navigate(from, { replace: true });
    } catch (err) {
      setError(getUserFacingErrorMessage(err, { action: 'crear tu cuenta' }));
    } finally {
      setLoading(false);
    }
  };

  const onGoogle = async () => {
    setLoading(true);
    setError(null);
    try {
      await signInWithGoogle();
      void navigate(from, { replace: true });
    } catch (err) {
      setError(getUserFacingErrorMessage(err, { action: 'iniciar sesión con Google' }));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative w-full max-w-xl overflow-hidden rounded-2xl border border-outline-variant/60 bg-surface shadow-card">
      <div className="absolute left-0 top-0 h-1 w-full bg-surface-container">
        <div
          className="h-full bg-primary transition-all duration-500 ease-out"
          style={{ width: `${stepProgress(step)}%` }}
        />
      </div>

      <div className="relative min-h-[480px] p-6 sm:p-10">
        {error && (
          <div className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800">
            {error}
          </div>
        )}

        {/* Step 1 */}
        <div className={step === 1 ? 'auth-step-active' : 'auth-step-inactive'}>
          <header className="mb-6">
            <h2 className="font-display text-2xl font-bold text-on-surface">
              Comienza tu cuenta
            </h2>
            <p className="mt-2 text-on-surface-variant">
              Ingresa tu correo para empezar con Clausum.
            </p>
          </header>

          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
                Correo electrónico
              </label>
              <input
                type="email"
                autoFocus={step === 1}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nombre@empresa.com"
                className="auth-input"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
                Contraseña
              </label>
              <PasswordInput
                id="signup-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Al menos 8 caracteres"
                minLength={8}
              />
              <p className="mt-1 flex items-center gap-1 text-[11px] text-on-surface-variant">
                <span className="material-symbols-outlined text-sm">info</span>
                Mezcla letras, números y símbolos para mayor seguridad.
              </p>
            </div>

            <button
              type="button"
              onClick={goNext}
              className="mt-2 w-full rounded-xl bg-primary py-3 text-sm font-bold uppercase tracking-wide text-on-primary transition hover:bg-primary/90 active:scale-[0.99]"
            >
              Continuar
            </button>

            <div className="relative py-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-outline-variant" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-surface px-2 text-on-surface-variant">
                  O continúa con
                </span>
              </div>
            </div>

            <button
              type="button"
              disabled={loading}
              onClick={onGoogle}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-outline-variant text-sm font-medium transition hover:bg-surface-container disabled:opacity-60"
            >
              <span className="material-symbols-outlined text-lg">account_circle</span>
              Google
            </button>
          </div>
        </div>

        {/* Step 2 */}
        <div className={step === 2 ? 'auth-step-active' : 'auth-step-inactive'}>
          <header className="mb-6">
            <h2 className="font-display text-2xl font-bold text-on-surface">
              Cuéntanos sobre ti
            </h2>
            <p className="mt-2 text-on-surface-variant">
              Personalizamos la experiencia según tu rol profesional.
            </p>
          </header>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
                  Nombre
                </label>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="auth-input"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
                  Apellido
                </label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="auth-input"
                />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
                Rol profesional
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="auth-input"
              >
                {ROLES.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
                Organización
              </label>
              <input
                type="text"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder="Estudio jurídico o empresa"
                className="auth-input"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="w-1/3 rounded-xl border border-outline-variant py-3 text-sm font-bold uppercase tracking-wide text-primary"
              >
                Atrás
              </button>
              <button
                type="button"
                onClick={goNext}
                className="flex-1 rounded-xl bg-primary py-3 text-sm font-bold uppercase tracking-wide text-on-primary"
              >
                Casi listo
              </button>
            </div>
          </div>
        </div>

        {/* Step 3 */}
        <form
          onSubmit={onCreateAccount}
          className={step === 3 ? 'auth-step-active' : 'auth-step-inactive'}
        >
          <header className="mb-6">
            <h2 className="font-display text-2xl font-bold text-on-surface">
              Finalizar configuración
            </h2>
            <p className="mt-2 text-on-surface-variant">
              Revisa los términos y completa tu cuenta.
            </p>
          </header>

          <div className="space-y-5">
            <label className="flex cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                checked={acceptTerms}
                onChange={(e) => setAcceptTerms(e.target.checked)}
                className="mt-1 h-5 w-5 rounded border-outline-variant text-primary focus:ring-primary"
              />
              <span className="text-sm text-on-surface-variant">
                Acepto los{' '}
                <Link to="/legal/terminos" className="font-semibold text-primary hover:underline">
                  términos de uso
                </Link>{' '}
                y la{' '}
                <Link to="/legal/privacidad" className="font-semibold text-primary hover:underline">
                  política de privacidad
                </Link>{' '}
                de Clausum.
              </span>
            </label>
            <label className="flex cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                checked={newsletter}
                onChange={(e) => setNewsletter(e.target.checked)}
                className="mt-1 h-5 w-5 rounded border-outline-variant text-primary focus:ring-primary"
              />
              <span className="text-sm text-on-surface-variant">
                Recibir novedades sobre análisis legal e IA (opcional).
              </span>
            </label>

            <div className="flex items-start gap-3 rounded-xl bg-primary-container/30 p-4">
              <span className="material-symbols-outlined text-primary">verified_user</span>
              <p className="text-xs leading-relaxed text-on-surface-variant">
                Tus documentos se almacenan en Firebase con reglas de acceso por
                usuario. Clausum no sustituye asesoría legal profesional.
              </p>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="w-1/3 rounded-xl border border-outline-variant py-3 text-sm font-bold uppercase tracking-wide text-primary"
              >
                Atrás
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 rounded-xl bg-primary py-3 text-sm font-bold uppercase tracking-wide text-on-primary shadow-soft disabled:opacity-60"
              >
                {loading ? 'Creando cuenta…' : 'Crear cuenta'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

export function SignupFooterNote() {
  return (
    <p className="mt-8 text-center text-sm text-on-surface-variant">
      ¿Prefieres ver el producto primero?{' '}
      <Link to="/analizar-contratos" className="font-semibold text-primary hover:underline">
        Explora la página de análisis
      </Link>
    </p>
  );
}
