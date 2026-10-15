import { Link, useSearchParams } from 'react-router-dom';
import type { ReactNode } from 'react';

export type SettingsTab = 'profile' | 'security' | 'billing';

const TABS: { id: SettingsTab; label: string; icon: string }[] = [
  { id: 'profile', label: 'Perfil', icon: 'person' },
  { id: 'security', label: 'Seguridad', icon: 'lock' },
  { id: 'billing', label: 'Facturación', icon: 'payments' },
];

type SettingsLayoutProps = {
  children: ReactNode;
};

export function SettingsLayout({ children }: SettingsLayoutProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = (searchParams.get('tab') as SettingsTab) || 'profile';

  const setTab = (tab: SettingsTab) => {
    setSearchParams({ tab }, { replace: true });
  };

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8 px-4 py-8 sm:px-6 lg:flex-row lg:gap-12">
      <aside className="lg:w-56 lg:shrink-0">
        <p className="mb-3 px-2 text-[10px] font-semibold uppercase tracking-widest text-on-surface-variant/70">
          Cuenta
        </p>
        <nav className="flex gap-2 overflow-x-auto pb-2 lg:flex-col lg:overflow-visible lg:pb-0">
          {TABS.map((tab) => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setTab(tab.id)}
                className={`flex shrink-0 items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition ${
                  active
                    ? 'bg-primary text-on-primary shadow-soft'
                    : 'text-on-surface-variant hover:bg-surface-container'
                }`}
              >
                <span
                  className="material-symbols-outlined text-xl"
                  style={active ? { fontVariationSettings: "'FILL' 1" } : undefined}
                >
                  {tab.icon}
                </span>
                {tab.label}
              </button>
            );
          })}
        </nav>
        <Link
          to="/panel"
          className="mt-6 hidden items-center gap-1 px-2 text-sm font-medium text-on-surface-variant hover:text-primary lg:flex"
        >
          <span className="material-symbols-outlined text-base">arrow_back</span>
          Volver al panel
        </Link>
      </aside>

      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

export function useSettingsTab(): SettingsTab {
  const [searchParams] = useSearchParams();
  const tab = searchParams.get('tab') as SettingsTab;
  if (tab === 'security' || tab === 'billing') return tab;
  return 'profile';
}
