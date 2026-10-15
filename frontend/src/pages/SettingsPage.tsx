import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { AppShell } from '@/components/app/AppShell';
import {
  SettingsLayout,
  useSettingsTab,
} from '@/components/settings/SettingsLayout';
import { SettingsProfileTab } from '@/components/settings/SettingsProfileTab';
import { SettingsSecurityTab } from '@/components/settings/SettingsSecurityTab';
import { SettingsBillingTab } from '@/components/settings/SettingsBillingTab';

export function SettingsPage() {
  const tab = useSettingsTab();

  useEffect(() => {
    document.title = 'Ajustes de la cuenta | Clausum';
  }, []);

  return (
    <AppShell pageTitle="Ajustes" breadcrumb="Cuenta">
      <SettingsLayout>
        {tab === 'profile' && <SettingsProfileTab />}
        {tab === 'security' && <SettingsSecurityTab />}
        {tab === 'billing' && <SettingsBillingTab />}
      </SettingsLayout>

      <footer className="border-t border-outline-variant/60 py-8">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-4 px-4 text-sm text-on-surface-variant sm:flex-row sm:px-6">
          <p>© {new Date().getFullYear()} Clausum. Todos los derechos reservados.</p>
          <div className="flex flex-wrap justify-center gap-4 sm:gap-6">
            <Link to="/legal/privacidad" className="hover:text-primary">
              Privacidad
            </Link>
            <Link to="/legal/terminos" className="hover:text-primary">
              Términos
            </Link>
            <Link to="/legal/aviso-legal" className="hover:text-primary">
              Aviso legal
            </Link>
            <Link to="/legal/cookies" className="hover:text-primary">
              Cookies
            </Link>
          </div>
        </div>
      </footer>
    </AppShell>
  );
}
