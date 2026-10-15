import { Suspense } from 'react';
import { Outlet } from 'react-router-dom';

/** Indicador discreto mientras llega el chunk de una ruta diferida. */
export function RouteFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-container">
      <div className="text-center">
        <span className="material-symbols-outlined mb-3 animate-pulse text-4xl text-primary">
          hourglass_top
        </span>
        <p className="text-sm text-on-surface-variant">Cargando…</p>
      </div>
    </div>
  );
}

/**
 * Límite de Suspense para rutas diferidas **públicas**.
 *
 * Existe aparte de ProtectedRoute a propósito: diferir una ruta y exigir
 * sesión son cosas distintas, y mezclarlas dejaría las páginas legales
 * detrás del login, que es justo donde no pueden estar.
 */
export function LazyBoundary() {
  return (
    <Suspense fallback={<RouteFallback />}>
      <Outlet />
    </Suspense>
  );
}
