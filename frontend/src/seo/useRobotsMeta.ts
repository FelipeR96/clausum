import { useEffect } from 'react';

function upsertMeta(name: string, content: string) {
  let el = document.querySelector(`meta[name="${name}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute('name', name);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

/**
 * Aplica meta robots en rutas privadas (panel, auth) para evitar indexación.
 */
export function useRobotsMeta(robots = 'noindex, nofollow') {
  useEffect(() => {
    upsertMeta('robots', robots);
  }, [robots]);
}
