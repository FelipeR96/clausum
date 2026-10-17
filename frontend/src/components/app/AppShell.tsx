import type { ReactNode } from 'react';
import { useState } from 'react';
import { AppSidebar } from '@/components/app/AppSidebar';
import { AppTopBar } from '@/components/app/AppTopBar';

type AppShellProps = {
  children: ReactNode;
  pageTitle?: string;
  breadcrumb?: string;
  onUploadClick?: () => void;
};

export function AppShell({
  children,
  pageTitle = 'Vista general',
  breadcrumb = 'Espacio de trabajo',
  onUploadClick,
}: AppShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-surface-container">
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-72">
        <AppSidebar />
      </div>

      {sidebarOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            onClick={() => setSidebarOpen(false)}
            aria-label="Cerrar menú"
          />
          <div className="relative h-full w-72 shadow-card">
            <AppSidebar onNavigate={() => setSidebarOpen(false)} />
          </div>
        </div>
      )}

      {/*
        min-w-0 no es decorativo. Un hijo flex trae min-width:auto, que le
        prohibe encoger por debajo del ancho minimo de su contenido: la tabla
        de usuarios pedia 978px y estiraba esta columna entera, desbordando
        la pagina en pantallas estrechas. Con min-w-0 la columna encoge y el
        overflow-x-auto de la tabla por fin sirve para algo: la tabla se
        desplaza dentro de su caja en vez de empujar todo el panel.
      */}
      <div className="flex min-h-screen min-w-0 flex-1 flex-col lg:pl-72">
        <AppTopBar
          onMenuClick={() => setSidebarOpen(true)}
          onUploadClick={onUploadClick}
          title={pageTitle}
          breadcrumb={breadcrumb}
        />
        <div className="flex-1">{children}</div>
      </div>

      {onUploadClick && (
        <button
          type="button"
          onClick={onUploadClick}
          className="fixed bottom-8 right-8 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-on-primary shadow-card transition hover:scale-105 active:scale-95 sm:hidden"
          aria-label="Subir contrato"
        >
          <span className="material-symbols-outlined text-3xl">cloud_upload</span>
        </button>
      )}
    </div>
  );
}
