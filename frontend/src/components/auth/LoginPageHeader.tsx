import { Link } from 'react-router-dom';
import { Logo } from '@/components/ui/Logo';

type LoginPageHeaderProps = {
  backTo?: string;
  backLabel?: string;
};

export function LoginPageHeader({
  backTo = '/',
  backLabel = 'Volver al inicio',
}: LoginPageHeaderProps) {
  return (
    <header className="fixed top-0 z-50 w-full border-b border-outline-variant/40 bg-surface/90 shadow-sm backdrop-blur-md">
      <div className="mx-auto flex h-20 max-w-6xl items-center justify-between px-4 sm:px-8">
        <Logo />
        <Link
          to={backTo}
          className="text-sm font-semibold uppercase tracking-wide text-on-surface-variant transition hover:text-primary"
        >
          {backLabel}
        </Link>
      </div>
    </header>
  );
}
