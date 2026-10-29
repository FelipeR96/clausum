/**
 * Fotos de perfil para redes.
 *   node perfil.mjs
 * Escribe SVG y PNG de 1080x1080 en perfil/.
 * Paleta tomada de frontend/tailwind.config.js.
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const AQUI = dirname(fileURLToPath(import.meta.url));
const OUT = join(AQUI, 'perfil');
mkdirSync(OUT, { recursive: true });

const T = {
  primary: '#006A60',
  hondo: '#00332E',
  masHondo: '#00201C',
  mint: '#9FF2E8',
  mintClaro: '#C9F7F1',
  blanco: '#FFFFFF',
};

const S = 1080;
// userSpaceOnUse a proposito: un trazo vertical tiene caja de ancho cero
// y con gradientUnits relativo el degradado se degenera y no pinta nada.
const grad = (id, a, b) => `
  <linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="${S}" y2="${S}">
    <stop offset="0%" stop-color="${a}"/><stop offset="100%" stop-color="${b}"/>
  </linearGradient>`;

/**
 * Glifo de cláusula: barra vertical con dos marcas, como el signo que
 * señala un artículo. Trazos gruesos para que sobreviva a 100 px.
 */
const glifo = (trazo, grosor = 86) => `
  <g fill="none" stroke="${trazo}" stroke-width="${grosor}" stroke-linecap="round">
    <path d="M 340 300 L 340 780"/>
    <path d="M 480 420 L 760 420"/>
    <path d="M 480 660 L 650 660"/>
  </g>`;

/** C geométrica con un corte, que lee como inicial y como sello abierto. */
const letraC = (trazo, grosor = 112) => `
  <g fill="none" stroke="${trazo}" stroke-width="${grosor}" stroke-linecap="round">
    <path d="M 720 370 A 230 230 0 1 0 720 710"/>
  </g>`;

const VARIANTES = [
  {
    nombre: 'a-glifo-oscuro',
    nota: 'Glifo mint sobre verde profundo. El mismo de los videos.',
    svg: `<defs>${grad('f', T.hondo, T.masHondo)}${grad('m', T.mint, '#6FE0D1')}</defs>
      <rect width="${S}" height="${S}" fill="url(#f)"/>
      ${glifo('url(#m)')}`,
  },
  {
    nombre: 'b-glifo-claro',
    nota: 'Glifo verde sobre mint. El que más resalta en un feed oscuro.',
    svg: `<defs>${grad('f', T.mint, T.mintClaro)}</defs>
      <rect width="${S}" height="${S}" fill="url(#f)"/>
      ${glifo(T.primary)}`,
  },
  {
    nombre: 'c-letra-oscuro',
    nota: 'C abierta, mint sobre verde. Lee como inicial y como sello.',
    svg: `<defs>${grad('f', T.hondo, T.masHondo)}${grad('m', T.mint, '#6FE0D1')}</defs>
      <rect width="${S}" height="${S}" fill="url(#f)"/>
      ${letraC('url(#m)')}`,
  },
  {
    nombre: 'd-letra-primario',
    nota: 'C sobre el verde #006A60 exacto de la marca.',
    svg: `<rect width="${S}" height="${S}" fill="${T.primary}"/>
      ${letraC(T.blanco)}`,
  },
];

for (const v of VARIANTES) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${S}" height="${S}" viewBox="0 0 ${S} ${S}">${v.svg}</svg>`;
  const rutaSvg = join(OUT, v.nombre + '.svg');
  writeFileSync(rutaSvg, svg);
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', rutaSvg, join(OUT, v.nombre + '.png')]);
  console.log(v.nombre.padEnd(20), v.nota);
}
console.log('\n' + VARIANTES.length + ' variantes en perfil/ (SVG + PNG 1080x1080)');
