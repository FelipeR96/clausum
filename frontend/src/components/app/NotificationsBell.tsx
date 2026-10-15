import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import type { Alert } from '@clausum/shared';
import {
  fetchAlerts,
  markAlertAsRead,
  markAllAlertsAsRead,
} from '@/services/alerts.service';
import { getUserFacingErrorMessage } from '@/services/api/user-facing-errors';

function severityIcon(severity: Alert['severity']): string {
  if (severity === 'critical') return 'error';
  if (severity === 'warning') return 'warning';
  return 'info';
}

function severityClass(severity: Alert['severity']): string {
  if (severity === 'critical') return 'text-red-600 bg-red-50';
  if (severity === 'warning') return 'text-amber-700 bg-amber-50';
  return 'text-primary bg-primary-container/40';
}

export function NotificationsBell() {
  const [open, setOpen] = useState(false);
  const [alerts, setAlerts] = useState<Array<Alert & { id: string }>>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const loadAlerts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchAlerts();
      setAlerts(data.alerts);
      setUnreadCount(data.unreadCount);
    } catch (err) {
      setError(getUserFacingErrorMessage(err, { action: 'cargar notificaciones' }));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAlerts();
    const interval = window.setInterval(() => void loadAlerts(), 60_000);
    return () => window.clearInterval(interval);
  }, [loadAlerts]);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: MouseEvent) => {
      if (!panelRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [open]);

  const handleOpen = () => {
    setOpen((current) => !current);
    if (!open) void loadAlerts();
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllAlertsAsRead();
      setAlerts((current) => current.map((alert) => ({ ...alert, read: true })));
      setUnreadCount(0);
    } catch (err) {
      setError(getUserFacingErrorMessage(err, { action: 'marcar notificaciones' }));
    }
  };

  const handleAlertClick = async (alert: Alert & { id: string }) => {
    if (alert.read) return;
    try {
      await markAlertAsRead(alert.id);
      setAlerts((current) =>
        current.map((item) => (item.id === alert.id ? { ...item, read: true } : item))
      );
      setUnreadCount((count) => Math.max(0, count - 1));
    } catch {
      // Navegación sigue aunque falle el marcado
    }
    setOpen(false);
  };

  return (
    <div ref={panelRef} className="relative">
      <button
        type="button"
        onClick={handleOpen}
        className="relative rounded-xl p-2 text-on-surface-variant transition hover:bg-surface-container hover:text-primary"
        aria-label="Notificaciones"
        aria-expanded={open}
      >
        <span className="material-symbols-outlined">notifications</span>
        {unreadCount > 0 && (
          <span className="absolute right-2 top-2 flex h-2 w-2 items-center justify-center">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-60" />
            <span className="relative h-2 w-2 rounded-full bg-red-500" />
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-outline-variant/60 bg-surface shadow-card">
          <div className="flex items-center justify-between border-b border-outline-variant/60 px-4 py-3">
            <p className="font-display text-sm font-bold text-on-surface">Notificaciones</p>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={() => void handleMarkAllRead()}
                className="text-xs font-semibold text-primary hover:underline"
              >
                Marcar todas leídas
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {loading && (
              <p className="px-4 py-6 text-center text-sm text-on-surface-variant">
                Cargando…
              </p>
            )}
            {error && (
              <p className="px-4 py-6 text-center text-sm text-red-700">{error}</p>
            )}
            {!loading && !error && alerts.length === 0 && (
              <p className="px-4 py-8 text-center text-sm text-on-surface-variant">
                No tienes notificaciones por ahora.
              </p>
            )}
            {!loading &&
              !error &&
              alerts.map((alert) => (
                <Link
                  key={alert.id}
                  to={alert.actionUrl ?? '/panel'}
                  onClick={() => void handleAlertClick(alert)}
                  className={`flex gap-3 border-b border-outline-variant/40 px-4 py-3 transition hover:bg-surface-container ${
                    alert.read ? 'opacity-70' : 'bg-surface-container/40'
                  }`}
                >
                  <span
                    className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${severityClass(alert.severity)}`}
                  >
                    <span className="material-symbols-outlined text-base">
                      {severityIcon(alert.severity)}
                    </span>
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-on-surface">
                      {alert.title}
                    </span>
                    <span className="mt-0.5 line-clamp-2 text-xs text-on-surface-variant">
                      {alert.message}
                    </span>
                  </span>
                </Link>
              ))}
          </div>

          <div className="border-t border-outline-variant/60 px-4 py-2 text-center">
            <Link
              to="/panel"
              onClick={() => setOpen(false)}
              className="text-xs font-semibold text-primary hover:underline"
            >
              Ir al panel
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
