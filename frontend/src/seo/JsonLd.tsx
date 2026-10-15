import { useEffect } from 'react';

type JsonLdProps = {
  data: Record<string, unknown> | Record<string, unknown>[];
  id?: string;
};

export function JsonLd({ data, id = 'page-jsonld' }: JsonLdProps) {
  useEffect(() => {
    const scriptId = `jsonld-${id}`;
    const payload = Array.isArray(data) ? data : [data];

    let script = document.getElementById(scriptId) as HTMLScriptElement | null;
    if (!script) {
      script = document.createElement('script');
      script.id = scriptId;
      script.type = 'application/ld+json';
      document.head.appendChild(script);
    }

    script.textContent = JSON.stringify(
      payload.length === 1 ? payload[0] : payload
    );

    return () => {
      script?.remove();
    };
  }, [data, id]);

  return null;
}
