import { Suspense } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/auth/AuthProvider';
import { useRobotsMeta } from '@/seo/useRobotsMeta';
import { RouteFallback } from '@/app/LazyBoundary';

export function ProtectedRoute() {
  const { user, loading } = useAuth();
  const location = useLocation();
  useRobotsMeta();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface-container">
        <div className="text-center">
          <span className="material-symbols-outlined mb-3 animate-pulse text-4xl text-primary">
            hourglass_top
          </span>
          <p className="text-sm text-on-surface-variant">Cargando sesión…</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  // Las páginas del panel llegan diferidas: el Suspense va aquí dentro,
  // ya pasada la comprobación de sesión, para que el chunk no se pida
  // hasta que se sepa que el usuario puede verlo.
  return (
    <Suspense fallback={<RouteFallback />}>
      <Outlet />
    </Suspense>
  );
}
