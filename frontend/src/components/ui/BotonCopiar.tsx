import { useEffect, useState } from 'react';

/**
 * Boton de copiar para un texto que existe para pegarse en otro sitio.
 *
 * Vive aqui y no dentro de una tarjeta porque lo usan las dos clases de
 * informe --el de un usuario con cuenta y el de una compra suelta-- y
 * copiarlo en ambas significaba que el dia que cambie el aviso de "Copiado"
 * cambie en una y no en la otra.
 */
export function BotonCopiar({
  texto,
  etiqueta = 'Copiar redacción',
}: {
  texto: string;
  etiqueta?: string;
}) {
  const [copiado, setCopiado] = useState(false);

  // Si el componente se desmonta antes de los dos segundos, el temporizador
  // escribiria estado sobre algo que ya no existe.
  useEffect(() => {
    if (!copiado) return;
    const t = window.setTimeout(() => setCopiado(false), 2000);
    return () => window.clearTimeout(t);
  }, [copiado]);

  async function copiar() {
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(true);
    } catch {
      // Sin portapapeles (contexto no seguro o permiso negado) el texto sigue
      // visible y seleccionable. No hay nada que avisar.
    }
  }

  return (
    <button
      type="button"
      onClick={() => void copiar()}
      className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-primary transition hover:underline"
    >
      <span className="material-symbols-outlined text-sm" aria-hidden="true">
        {copiado ? 'check' : 'content_copy'}
      </span>
      {copiado ? 'Copiado' : etiqueta}
    </button>
  );
}
