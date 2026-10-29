/**
 * Motor de animación: compone fotogramas SVG y los pasa a MP4 con ffmpeg.
 * Sin dependencias de npm. El rasterizado lo hace ffmpeg (librsvg).
 */
// Identidad real de Clausum, tomada de frontend/tailwind.config.js.
// Para volver a la variante oscura en ámbar, cambia solo este bloque.
export const C = {
  noche: '#00332E',       // verde petróleo profundo (primary oscurecido)
  hondo: '#00201C',       // on-primary-container
  panel: '#004C45',
  borde: '#00615A',
  nieve: '#FFFFFF',
  azul: '#9FF2E8',        // primary-container: el acento claro
  azul200: '#C9F7F1',
  oro: '#9FF2E8',
};

// Manrope y Public Sans, las de Clausum, no están instaladas para
// rasterizar aquí. Lato es la grotesca humanista más cercana a Public Sans.
export const FUENTE = 'Lato';

// ---------- easings ----------
export const clamp01 = (x) => Math.max(0, Math.min(1, x));
export const outCubic = (p) => 1 - Math.pow(1 - p, 3);
export const outBack = (p) => 1 + 2.2 * Math.pow(p - 1, 3) + 1.2 * Math.pow(p - 1, 2);
export const inOut = (p) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2);

/** Progreso 0..1 de un elemento que entra en `inicio` y dura `dur` segundos. */
export const entra = (t, inicio, dur = 0.55) => clamp01((t - inicio) / dur);

const copFmt = new Intl.NumberFormat('es-CO', {
  style: 'currency', currency: 'COP', maximumFractionDigits: 0,
});
export const pesos = (n) => copFmt.format(Math.round(n));

export const esc = (s) => String(s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// ---------- piezas reutilizables ----------
export function fondo(w, h, t) {
  // el halo respira muy lento; es el único movimiento de fondo
  const r = 0.62 + 0.06 * Math.sin(t * 0.7);
  return `
  <rect width="${w}" height="${h}" fill="${C.noche}"/>
  <rect width="${w}" height="${h}" fill="url(#g-fondo)"/>
  <ellipse cx="${w * 0.78}" cy="${h * 0.06}" rx="${w * r}" ry="${h * r * 0.42}" fill="url(#g-halo)"/>`;
}

// Los dos parametros no se usan dentro: el bloque <defs> no depende del
// tamano. Van con guion bajo porque es lo que tu eslint pide para un
// argumento sin usar, y renombrarlos no cambia nada para quien la llama.
export const defs = (_w, _h) => `
<defs>
  <linearGradient id="g-oro" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="64" y2="64">
    <stop offset="0%" stop-color="#5FD9CA"/>
    <stop offset="26%" stop-color="#9FF2E8"/>
    <stop offset="46%" stop-color="#E6FFFB"/>
    <stop offset="66%" stop-color="#9FF2E8"/>
    <stop offset="100%" stop-color="#6FE0D1"/>
  </linearGradient>
  <linearGradient id="g-fondo" x1="0" y1="0" x2="0.5" y2="1">
    <stop offset="0%" stop-color="${C.noche}"/>
    <stop offset="100%" stop-color="${C.hondo}"/>
  </linearGradient>
  <radialGradient id="g-halo">
    <stop offset="0%" stop-color="${C.azul}" stop-opacity="0.14"/>
    <stop offset="100%" stop-color="${C.azul}" stop-opacity="0"/>
  </radialGradient>
</defs>`;

/**
 * Glifo de cláusula: una barra con dos marcas, como el signo de párrafo
 * que se usa para señalar un artículo. PROVISIONAL — Clausum no tiene
 * símbolo propio definido todavía.
 */
export function glifo(x, y, tam, dibujo = 1) {
  const k = tam / 64;
  const d = clamp01(dibujo);
  const L = 64;
  return `<g transform="translate(${x},${y}) scale(${k})">
    <g fill="none" stroke="url(#g-oro)" stroke-width="7" stroke-linecap="round">
      <path d="M 16 10 L 16 54" stroke-dasharray="${L}" stroke-dashoffset="${L * (1 - d)}"/>
      <path d="M 30 22 L 50 22" stroke-dasharray="20" stroke-dashoffset="${20 * (1 - clamp01((d - 0.35) / 0.35))}"/>
      <path d="M 30 42 L 44 42" stroke-dasharray="14" stroke-dashoffset="${14 * (1 - clamp01((d - 0.6) / 0.4))}"/>
    </g>
  </g>`;
}

/**
 * Texto que entra deslizando desde abajo con desvanecido.
 * `p` es el progreso 0..1.
 */
export function texto(txt, x, y, p, o = {}) {
  const {
    tam = 56, peso = 700, fill = C.nieve, anchor = 'start',
    desliz = 34, tracking = '-0.02em', opacidadMax = 1,
  } = o;
  if (p <= 0) return '';
  const e = outCubic(p);
  const dy = desliz * (1 - e);
  return `<text x="${x}" y="${y + dy}" font-family="${FUENTE}" font-size="${tam}"
    font-weight="${peso}" fill="${fill}" text-anchor="${anchor}"
    letter-spacing="${tracking}" opacity="${(e * opacidadMax).toFixed(3)}">${esc(txt)}</text>`;
}

/** Varias líneas con entrada escalonada. */
export function parrafo(lineas, x, y, t, inicio, o = {}) {
  const { interlinea = 1.4, paso = 0.12, tam = 36 } = o;
  return lineas.map((ln, i) =>
    texto(ln, x, y + i * tam * interlinea, entra(t, inicio + i * paso), { tam, peso: 400, fill: C.nieve, ...o })
  ).join('\n');
}

/** Regla que crece de izquierda a derecha. */
export const regla = (x, y, ancho, p, color = C.borde) =>
  p <= 0 ? '' : `<rect x="${x}" y="${y}" width="${ancho * outCubic(p)}" height="2" fill="${color}"/>`;

/** Cifra en oro que sube contando hasta `valor`. */
export function cifra(valor, x, y, p, o = {}) {
  const { tam = 118, anchor = 'start' } = o;
  if (p <= 0) return '';
  const e = outCubic(p);
  const v = valor * e;
  return `<text x="${x}" y="${y}" font-family="${FUENTE}" font-size="${tam}"
    font-weight="700" fill="url(#g-oro)" text-anchor="${anchor}"
    letter-spacing="-0.03em" opacity="${Math.min(1, e * 3).toFixed(3)}">${pesos(v)}</text>`;
}

/** Píldora de llamada a la acción, con latido suave al final. */
export function pildora(txt, cx, y, p, t, o = {}) {
  const { ancho = 620, alto = 108, tam = 40 } = o;
  if (p <= 0) return '';
  const e = outBack(p);
  const latido = 1 + 0.012 * Math.sin(t * 3.4);
  const s = e * latido;
  return `<g transform="translate(${cx},${y}) scale(${s.toFixed(4)})" opacity="${clamp01(p * 2).toFixed(3)}">
    <rect x="${-ancho / 2}" y="${-alto / 2}" width="${ancho}" height="${alto}" rx="${alto / 2}" fill="${C.azul}"/>
    <text x="0" y="${tam * 0.35}" font-family="${FUENTE}" font-size="${tam}" font-weight="600"
      fill="#FFFFFF" text-anchor="middle" letter-spacing="-0.01em">${esc(txt)}</text>
  </g>`;
}
