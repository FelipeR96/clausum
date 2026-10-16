import { Navigate } from 'react-router-dom';
import { useAuth } from '@/auth/AuthProvider';
import { AdminUserSection } from '@/components/admin/AdminUserSection';
import { AdminPricingSection } from '@/components/admin/AdminPricingSection';
import { AdminLimitsSection } from '@/components/admin/AdminLimitsSection';

/**
 * Modulo de administracion.
 *
 * El `isAdmin` de aqui solo decide si se dibuja la pagina. Quien manda es el
 * backend: cada ruta /api/admin vuelve a verificar el claim del token y
 * responde 404 si no esta. Forzar esta condicion desde el navegador muestra
 * una pagina vacia que no puede hacer nada.
 */
export function AdminPage() {
  const { isAdmin, loading } = useAuth();

  if (loading) return null;
  if (!isAdmin) return <Navigate to="/panel" replace />;

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-8 sm:px-6">
      <header>
        <h1 className="font-display text-2xl font-bold text-on-surface sm:text-3xl">
          Administración
        </h1>
        <p className="mt-1 text-sm text-on-surface-variant">
          Cada cambio queda registrado con la cuenta que lo hizo.
        </p>
      </header>

      <AdminUserSection />
      <AdminPricingSection />
      <AdminLimitsSection />
    </div>
  );
}
