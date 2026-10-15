import { useEffect } from 'react';
import { AuthPageHeader } from '@/components/auth/AuthPageHeader';
import { LoginPageHeader } from '@/components/auth/LoginPageHeader';
import { AuthBackground } from '@/components/auth/AuthBackground';
import { AuthFooter } from '@/components/auth/AuthFooter';
import { LoginCard } from '@/components/auth/LoginCard';
import { SignupValuePanel } from '@/components/auth/SignupValuePanel';
import { SignupWizard, SignupFooterNote } from '@/components/auth/SignupWizard';
import { useRobotsMeta } from '@/seo/useRobotsMeta';

export function LoginPage() {
  useRobotsMeta();
  useEffect(() => {
    document.title = 'Iniciar sesión | Clausum';
  }, []);

  return (
    <div className="relative flex min-h-screen flex-col bg-surface-container">
      <AuthBackground />
      <LoginPageHeader />

      <main className="flex flex-1 items-center justify-center px-4 pb-12 pt-28">
        <LoginCard />
      </main>

      <AuthFooter />
    </div>
  );
}

export function SignupPage() {
  useRobotsMeta();
  useEffect(() => {
    document.title = 'Crear cuenta | Clausum';
  }, []);

  return (
    <div className="relative min-h-screen bg-surface-container">
      <AuthBackground />
      <AuthPageHeader alternateLabel="¿Ya tienes cuenta?" alternateTo="/login" />

      <main className="mx-auto flex max-w-6xl flex-col gap-12 px-4 pb-16 pt-24 lg:flex-row lg:gap-16">
        <SignupValuePanel />

        <section className="flex flex-1 flex-col justify-center">
          <SignupWizard />
          <SignupFooterNote />
        </section>
      </main>

      <AuthFooter />
    </div>
  );
}
