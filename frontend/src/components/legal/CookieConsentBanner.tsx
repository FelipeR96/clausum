import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

const STORAGE_KEY = 'clausum_cookie_ack';

export function CookieConsentBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      setVisible(localStorage.getItem(STORAGE_KEY) !== '1');
    } catch {
      setVisible(true);
    }
  }, []);

  const dismiss = () => {
    try {
      localStorage.setItem(STORAGE_KEY, '1');
    } catch {
      // ignore
    }
    setVisible(false);
  };

  if (!visible) {
    return null;
  }

  return (
    <div
      className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-xl rounded-2xl border border-outline-variant/60 bg-surface/95 p-4 shadow-card backdrop-blur-sm sm:left-auto sm:right-6"
      role="dialog"
      aria-label="Aviso de cookies"
    >
      <p className="text-sm text-on-surface-variant">
        Usamos cookies técnicas para mantener tu sesión y el funcionamiento del servicio.{' '}
        <Link to="/legal/cookies" className="font-medium text-primary hover:underline">
          Política de cookies
        </Link>
      </p>
      <button
        type="button"
        onClick={dismiss}
        className="mt-3 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-on-primary transition hover:bg-primary/90"
      >
        Entendido
      </button>
    </div>
  );
}
