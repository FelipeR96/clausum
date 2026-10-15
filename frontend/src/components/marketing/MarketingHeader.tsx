import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Logo } from '@/components/ui/Logo';
import { useAuth } from '@/auth/AuthProvider';
import { SETTINGS_BILLING_PATH } from '@/constants/app-paths';
import { useMarketingDestination } from '@/hooks/useMarketingDestination';
import { useSubscriptionSummary } from '@/hooks/useSubscriptionSummary';

type NavLink =
  | { kind: 'route'; to: string; label: string }
  | { kind: 'hash'; hash: string; label: string };

const NAV_LINKS: NavLink[] = [
  { kind: 'route', to: '/analizar-contratos', label: 'Analizar' },
  { kind: 'route', to: '/comparar-contratos', label: 'Comparar' },
  { kind: 'route', to: '/detectar-riesgos', label: 'Riesgos' },
  { kind: 'hash', hash: 'beneficios', label: 'Beneficios' },
  { kind: 'hash', hash: 'como-funciona', label: 'Cómo funciona' },
  { kind: 'hash', hash: 'faq', label: 'FAQ' },
  { kind: 'route', to: '/pricing', label: 'Precios' },
];

function navHref(
  link: NavLink,
  pathname: string,
  destinations: Record<string, string>
) {
  if (link.kind === 'route') return destinations[link.to] ?? link.to;
  return pathname === '/' ? `#${link.hash}` : `/#${link.hash}`;
}

function isActive(link: NavLink, pathname: string) {
  if (link.kind === 'route') {
    if (link.to === '/analizar-contratos') {
      return pathname === '/analizar-contratos' || pathname.includes('/resultado');
    }
    if (link.to === '/comparar-contratos') {
      return pathname === '/comparar-contratos' || pathname.includes('/comparar');
    }
    if (link.to === '/detectar-riesgos') {
      return pathname === '/detectar-riesgos' || pathname.includes('/riesgos');
    }
    return pathname === link.to;
  }
  return false;
}

export function MarketingHeader() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const subscription = useSubscriptionSummary();
  const isPro = subscription?.planId === 'pro';
  const [menuOpen, setMenuOpen] = useState(false);
  const navLinks = user
    ? NAV_LINKS.filter((link) => link.kind !== 'route' || link.to !== '/pricing')
    : NAV_LINKS;
  const analysisDest = useMarketingDestination('analysis');
  const compareDest = useMarketingDestination('compare');
  const risksDest = useMarketingDestination('risks');

  const routeDestinations: Record<string, string> = {
    '/analizar-contratos': analysisDest,
    '/comparar-contratos': compareDest,
    '/detectar-riesgos': risksDest,
  };

  const handleSignOut = async () => {
    await signOut();
    setMenuOpen(false);
    navigate('/login');
  };

  return (
    <header className="sticky top-0 z-50 border-b border-outline-variant/60 bg-surface/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Logo />

        <nav className="hidden items-center gap-8 md:flex">
          {navLinks.map((link) => {
            const href = navHref(link, pathname, routeDestinations);
            const active = isActive(link, pathname);
            const className = `text-sm font-medium transition-colors ${
              active
                ? 'font-semibold text-primary'
                : 'text-on-surface-variant hover:text-primary'
            }`;

            return link.kind === 'route' ? (
              <Link key={href} to={href} className={className}>
                {link.label}
              </Link>
            ) : (
              <a key={href} href={href} className={className}>
                {link.label}
              </a>
            );
          })}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          {user ? (
            <>
              {!isPro && (
                <Link
                  to={SETTINGS_BILLING_PATH}
                  className="rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-on-primary shadow-soft transition hover:bg-primary/90"
                >
                  Pásate a Pro
                </Link>
              )}
              <Link
                to="/panel"
                className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                  isPro
                    ? 'bg-primary px-5 py-2.5 text-on-primary shadow-soft hover:bg-primary/90'
                    : 'text-on-surface-variant hover:text-primary'
                }`}
              >
                Ir al panel
              </Link>
              <button
                type="button"
                onClick={() => void handleSignOut()}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-outline-variant text-on-surface-variant transition hover:border-red-200 hover:bg-red-50 hover:text-red-700"
                aria-label="Cerrar sesión"
                title="Cerrar sesión"
              >
                <span className="material-symbols-outlined text-xl">logout</span>
              </button>
            </>
          ) : (
            <>
              <Link
                to="/panel"
                className="rounded-full px-4 py-2 text-sm font-semibold text-on-surface-variant transition-colors hover:text-primary"
              >
                Panel
              </Link>
              <Link
                to="/login"
                className="rounded-full px-4 py-2 text-sm font-semibold text-on-surface-variant transition-colors hover:text-primary"
              >
                Iniciar sesión
              </Link>
              <Link
                to="/signup"
                className="rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-on-primary shadow-soft transition hover:bg-primary/90"
              >
                Empezar gratis
              </Link>
            </>
          )}
        </div>

        <button
          type="button"
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-outline-variant md:hidden"
          onClick={() => setMenuOpen((open) => !open)}
          aria-label={menuOpen ? 'Cerrar menú' : 'Abrir menú'}
        >
          <span className="material-symbols-outlined">
            {menuOpen ? 'close' : 'menu'}
          </span>
        </button>
      </div>

      {menuOpen && (
        <div className="border-t border-outline-variant bg-surface px-4 py-4 md:hidden">
          <nav className="flex flex-col gap-1">
            {navLinks.map((link) => {
              const href = navHref(link, pathname, routeDestinations);
              const itemClass =
                'rounded-lg px-3 py-2.5 text-sm font-medium text-on-surface-variant hover:bg-surface-container';

              return link.kind === 'route' ? (
                <Link
                  key={href}
                  to={href}
                  className={itemClass}
                  onClick={() => setMenuOpen(false)}
                >
                  {link.label}
                </Link>
              ) : (
                <a
                  key={href}
                  href={href}
                  className={itemClass}
                  onClick={() => setMenuOpen(false)}
                >
                  {link.label}
                </a>
              );
            })}
            <hr className="my-2 border-outline-variant" />
            {user ? (
              <div className="mt-1 flex flex-col gap-2">
                {!isPro && (
                  <Link
                    to={SETTINGS_BILLING_PATH}
                    className="rounded-full bg-primary px-4 py-2.5 text-center text-sm font-semibold text-on-primary"
                    onClick={() => setMenuOpen(false)}
                  >
                    Pásate a Pro
                  </Link>
                )}
                <Link
                  to="/panel"
                  className={`rounded-full px-4 py-2.5 text-center text-sm font-semibold ${
                    isPro
                      ? 'bg-primary text-on-primary'
                      : 'border border-outline-variant text-on-surface'
                  }`}
                  onClick={() => setMenuOpen(false)}
                >
                  Ir al panel
                </Link>
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => void handleSignOut()}
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-outline-variant text-on-surface-variant transition hover:border-red-200 hover:bg-red-50 hover:text-red-700"
                    aria-label="Cerrar sesión"
                    title="Cerrar sesión"
                  >
                    <span className="material-symbols-outlined">logout</span>
                  </button>
                </div>
              </div>
            ) : (
              <>
                <Link
                  to="/login"
                  className="rounded-lg px-3 py-2.5 text-sm font-medium"
                  onClick={() => setMenuOpen(false)}
                >
                  Iniciar sesión
                </Link>
                <Link
                  to="/signup"
                  className="mt-1 rounded-full bg-primary px-4 py-2.5 text-center text-sm font-semibold text-on-primary"
                  onClick={() => setMenuOpen(false)}
                >
                  Empezar gratis
                </Link>
              </>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}

/** @deprecated Usar MarketingHeader */
export const LandingHeader = MarketingHeader;
