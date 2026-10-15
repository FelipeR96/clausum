import { Link } from 'react-router-dom';
import { Logo } from '@/components/ui/Logo';

type AuthPageHeaderProps = {
  alternateLabel: string;
  alternateTo: string;
};

export function AuthPageHeader({ alternateLabel, alternateTo }: AuthPageHeaderProps) {
  return (
    <header className="fixed top-0 z-50 w-full border-b border-outline-variant/40 bg-surface/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-8">
        <Logo />
        <div className="flex items-center gap-3 text-sm">
          <span className="hidden text-on-surface-variant sm:inline">{alternateLabel}</span>
          <Link
            to={alternateTo}
            className="font-semibold text-primary transition hover:text-primary/80"
          >
            {alternateTo === '/login' ? 'Iniciar sesión' : 'Crear cuenta'}
          </Link>
        </div>
      </div>
    </header>
  );
}
