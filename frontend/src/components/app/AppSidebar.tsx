import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { Logo } from '@/components/ui/Logo';
import { SidebarUsageLimit } from '@/components/app/SidebarUsageLimit';
import { useAuth } from '@/auth/AuthProvider';
import { fetchMe } from '@/services/user.service';
import { useSubscriptionSummary } from '@/hooks/useSubscriptionSummary';

type NavItem = {
  to: string;
  label: string;
  icon: string;
  disabled?: boolean;
};

const MAIN_NAV: NavItem[] = [
  { to: '/panel', label: 'Panel de control', icon: 'dashboard' },
  { to: '/panel/contratos', label: 'Mis contratos', icon: 'description' },
  { to: '/panel/comparar', label: 'Comparar', icon: 'compare_arrows' },
  { to: '/panel/analisis/resultado', label: 'Análisis de IA', icon: 'psychology' },
  { to: '/panel/riesgos', label: 'Perfil de riesgo', icon: 'warning' },
];

const SECONDARY_NAV: NavItem[] = [
  { to: '/panel/configuracion', label: 'Configuración', icon: 'settings' },
];

/**
 * Solo se dibuja con el claim de administrador. Ocultarlo es comodidad, no
 * seguridad: la pagina redirige y la API responde 404 a quien no lo sea.
 */
const ADMIN_NAV: NavItem = {
  to: '/panel/admin',
  label: 'Administración',
  icon: 'shield_person',
};

type AppSidebarProps = {
  onNavigate?: () => void;
};

function userInitials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');
}

export function AppSidebar({ onNavigate }: AppSidebarProps) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { user, isAdmin, signOut } = useAuth();
  const subscription = useSubscriptionSummary();
  const [displayName, setDisplayName] = useState('Cuenta Clausum');
  const [photoURL, setPhotoURL] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    setDisplayName(user.displayName ?? 'Usuario Clausum');
    setPhotoURL(user.photoURL ?? null);
    fetchMe()
      .then((me) => {
        if (me.displayName) setDisplayName(me.displayName);
        if (me.photoURL) setPhotoURL(me.photoURL);
      })
      .catch(() => undefined);
  }, [user]);

  const planLabel = subscription?.planName ?? 'Plan Free';

  const handleSignOut = async () => {
    await signOut();
    onNavigate?.();
    void navigate('/login');
  };

  const linkClass = (item: NavItem) => {
    const active =
      pathname === item.to ||
      (item.to === '/panel/analisis/resultado' &&
        pathname.includes('/resultado')) ||
      (item.to === '/panel/riesgos' && pathname.includes('/riesgos')) ||
      (item.to === '/panel/comparar' && pathname.includes('/comparar')) ||
      (item.to === '/panel/configuracion' && pathname.startsWith('/panel/configuracion'));
    if (item.disabled) {
      return 'mx-2 flex cursor-not-allowed items-center rounded-xl px-4 py-3 text-sm text-on-surface-variant/50';
    }
    return `mx-2 flex items-center rounded-xl px-4 py-3 text-sm transition ${
      active
        ? 'bg-primary font-semibold text-on-primary shadow-soft'
        : 'text-on-surface-variant hover:bg-surface-container'
    }`;
  };

  const iconStyle = (item: NavItem) => {
    const active =
      pathname === item.to ||
      (item.to === '/panel/analisis/resultado' &&
        pathname.includes('/resultado')) ||
      (item.to === '/panel/riesgos' && pathname.includes('/riesgos')) ||
      (item.to === '/panel/comparar' && pathname.includes('/comparar')) ||
      (item.to === '/panel/configuracion' && pathname.startsWith('/panel/configuracion'));
    return active ? { fontVariationSettings: "'FILL' 1" } : undefined;
  };

  return (
    <aside className="flex h-full w-72 flex-col border-r border-outline-variant/60 bg-surface">
      <div className="px-6 py-6">
        <Logo />
      </div>

      <nav className="flex-1 space-y-1 px-2">
        {MAIN_NAV.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            className={linkClass(item)}
            onClick={onNavigate}
          >
            <span className="material-symbols-outlined mr-3 text-xl" style={iconStyle(item)}>
              {item.icon}
            </span>
            {item.label}
          </Link>
        ))}

        <p className="px-6 pb-2 pt-8 text-[10px] font-semibold uppercase tracking-widest text-on-surface-variant/60">
          Preferencias
        </p>

        {SECONDARY_NAV.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            className={linkClass(item)}
            onClick={onNavigate}
          >
            <span className="material-symbols-outlined mr-3 text-xl" style={iconStyle(item)}>
              {item.icon}
            </span>
            {item.label}
          </Link>
        ))}

        {isAdmin && (
          <Link
            to={ADMIN_NAV.to}
            className={linkClass(ADMIN_NAV)}
            onClick={onNavigate}
          >
            <span
              className="material-symbols-outlined mr-3 text-xl"
              style={iconStyle(ADMIN_NAV)}
            >
              {ADMIN_NAV.icon}
            </span>
            {ADMIN_NAV.label}
          </Link>
        )}
      </nav>

      <div className="border-t border-outline-variant/60 p-4">
        <Link
          to="/panel/configuracion"
          onClick={onNavigate}
          className="flex items-center gap-3 rounded-2xl bg-surface-container p-3 transition hover:bg-surface-container-high"
        >
          <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-primary text-sm font-bold text-on-primary">
            {photoURL ? (
              <img src={photoURL} alt="" className="h-full w-full object-cover" />
            ) : (
              userInitials(displayName)
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold text-on-surface">{displayName}</p>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-primary">
              {planLabel}
            </p>
          </div>
        </Link>
        <Link
          to="/panel/configuracion?tab=billing"
          className="mt-3 block text-center text-xs font-semibold text-primary hover:underline"
          onClick={onNavigate}
        >
          Gestionar plan
        </Link>
        <button
          type="button"
          onClick={() => void handleSignOut()}
          className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-on-surface-variant transition hover:bg-surface-container hover:text-red-700"
        >
          <span className="material-symbols-outlined text-base">logout</span>
          Cerrar sesión
        </button>
        <SidebarUsageLimit />
      </div>
    </aside>
  );
}
