import { Link } from 'react-router-dom';
import { NotificationsBell } from '@/components/app/NotificationsBell';
import { SETTINGS_BILLING_PATH } from '@/constants/app-paths';
import { useSubscriptionSummary } from '@/hooks/useSubscriptionSummary';

type AppTopBarProps = {
  onMenuClick?: () => void;
  onUploadClick?: () => void;
  title?: string;
  breadcrumb?: string;
};

export function AppTopBar({
  onMenuClick,
  onUploadClick,
  title = 'Vista general',
  breadcrumb = 'Espacio de trabajo',
}: AppTopBarProps) {
  const subscription = useSubscriptionSummary();
  const showUpgrade = subscription?.planId !== 'pro';

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-outline-variant/60 bg-surface/95 px-4 backdrop-blur-md sm:px-6">
      <div className="flex min-w-0 items-center gap-3">
        <button
          type="button"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-outline-variant lg:hidden"
          onClick={onMenuClick}
          aria-label="Abrir menú"
        >
          <span className="material-symbols-outlined">menu</span>
        </button>
        <div className="flex min-w-0 items-center gap-2 text-sm">
          <span className="hidden text-on-surface-variant sm:inline">{breadcrumb}</span>
          <span className="material-symbols-outlined hidden text-base text-outline-variant sm:inline">
            chevron_right
          </span>
          <span className="flex items-center gap-2 truncate font-semibold text-on-surface">
            <span className="material-symbols-outlined hidden text-primary sm:inline">
              gavel
            </span>
            {title}
          </span>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-3 sm:gap-4">
        {showUpgrade && (
          <Link
            to={SETTINGS_BILLING_PATH}
            className="hidden rounded-full bg-primary px-4 py-2 text-sm font-semibold text-on-primary shadow-soft transition hover:bg-primary/90 sm:inline-flex"
          >
            Pásate a Pro
          </Link>
        )}
        <NotificationsBell />
        {onUploadClick && (
          <button
            type="button"
            onClick={onUploadClick}
            className="hidden items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-on-primary shadow-soft transition hover:bg-primary/90 sm:flex"
          >
            <span className="material-symbols-outlined text-lg">add</span>
            Subir contrato
          </button>
        )}
        <Link
          to="/"
          className="text-sm font-medium text-on-surface-variant hover:text-primary lg:hidden"
        >
          Inicio
        </Link>
      </div>
    </header>
  );
}
