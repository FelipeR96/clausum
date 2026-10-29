/**
 * Videos de Clausum para redes.
 *
 *   node generar-video.mjs            todos
 *   node generar-video.mjs firma      solo uno
 *
 * Salida: videos/*.mp4 (H.264, yuv420p — suben directo a TikTok,
 * Reels, Stories y Facebook).
 *
 * Público: quien está a punto de firmar algo y no lo entiende.
 * Sin precios ni planes a propósito: la cifra caduca el video y le
 * quita al espectador la razón para entrar.
 */
import { writeFileSync, mkdirSync, rmSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import {
  C, defs, fondo, glifo, texto, parrafo, regla, pildora, entra, outCubic,
} from './video.mjs';

const AQUI = dirname(fileURLToPath(import.meta.url));
const SALIDA = join(AQUI, 'videos');
const TMP = join(tmpdir(), 'clausum-frames');

const SITIO = 'clausumlegal.com';

const V = 1920, H1 = 1080;

const cabecera = (t, x, tam = 92) => `
${glifo(x, 150, tam, entra(t, 0.1, 0.9))}
${texto('Clausum', x + tam + 24, 222, entra(t, 0.45), { tam: 54 })}`;

/** Viñeta con palomita, para listas. */
const punto = (txt, x, y, p, tam = 46) => p <= 0 ? '' : `
  <g opacity="${outCubic(p).toFixed(3)}">
    ${texto(txt, x + 70, y, p, { tam, peso: 500 })}
    <circle cx="${x + 24}" cy="${y - 15}" r="18" fill="none" stroke="${C.azul}" stroke-width="4"/>
    <path d="M ${x + 15} ${y - 15} l 7 8 l 14 -16" fill="none" stroke="${C.azul}"
          stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"/>
  </g>`;

// ============================================================
//  1. FIRMA A CIEGAS — vertical, el principal
// ============================================================
const firma = {
  nombre: 'firma-a-ciegas',
  w: 1080, h: V, dur: 8, fps: 24,
  destino: 'TikTok · Reels · Stories',
  frame(t) {
    const x = 96;
    return `${defs(1080, V)}
${fondo(1080, V, t)}
${cabecera(t, x)}

${texto('Estás a punto', x, 640, entra(t, 0.9), { tam: 110, desliz: 48 })}
${texto('de firmar algo', x, 762, entra(t, 1.05), { tam: 110, desliz: 48 })}
${texto('que no leíste', x, 884, entra(t, 1.2), { tam: 110, desliz: 48, fill: C.azul })}

${regla(x, 970, 520, entra(t, 1.7, 0.7), C.azul)}

${parrafo([
  'Súbelo en PDF o Word.',
  'Te decimos qué dice,',
  'qué te expone y qué falta.',
], x, 1130, t, 2.2, { tam: 48, peso: 500, opacidadMax: 0.9, interlinea: 1.45 })}

${texto('Contratos colombianos.', x, 1420, entra(t, 3.5), { tam: 42, peso: 500, fill: C.azul200, opacidadMax: 0.8 })}
${texto('Con la norma que lo respalda.', x, 1478, entra(t, 3.65), { tam: 42, peso: 500, fill: C.azul200, opacidadMax: 0.8 })}

${pildora(SITIO, 540, 1720, entra(t, 4.4, 0.7), t, { ancho: 620 })}`;
  },
};

// ============================================================
//  2. QUÉ DICE TU CONTRATO — cuadrado, para el feed
// ============================================================
const queDice = {
  nombre: 'que-dice-tu-contrato',
  w: 1080, h: H1, dur: 6, fps: 24,
  destino: 'Feed de Instagram y Facebook',
  frame(t) {
    const x = 96;
    return `${defs(1080, H1)}
${fondo(1080, H1, t)}
${glifo(x, 108, 76, entra(t, 0.1, 0.8))}
${texto('Clausum', x + 100, 166, entra(t, 0.4), { tam: 46 })}

${texto('¿Qué dice', x, 420, entra(t, 0.85), { tam: 108, desliz: 44 })}
${texto('tu contrato?', x, 540, entra(t, 1.0), { tam: 108, desliz: 44, fill: C.azul })}

${regla(x, 614, 520, entra(t, 1.6, 0.7), C.azul)}

${parrafo([
  'Arriendo, laboral, préstamo.',
  'Lo leemos cláusula por cláusula',
  'y te decimos qué te expone.',
], x, 720, t, 2.0, { tam: 44, peso: 500, opacidadMax: 0.85, interlinea: 1.45 })}

${pildora(SITIO, 540, 990, entra(t, 3.3, 0.7), t, { ancho: 560, alto: 96, tam: 38 })}`;
  },
};

// ============================================================
//  3. LO QUE NO VISTE — vertical, muestra el producto
// ============================================================
const noViste = {
  nombre: 'lo-que-no-viste',
  w: 1080, h: V, dur: 8, fps: 24,
  destino: 'TikTok · Reels',
  frame(t) {
    const x = 96;
    const punto = (txt, y, p) => p <= 0 ? '' : `
      <g opacity="${outCubic(p).toFixed(3)}">
        ${texto(txt, x + 70, y, p, { tam: 46, peso: 500 })}
        <circle cx="${x + 24}" cy="${y - 15}" r="18" fill="none" stroke="${C.azul}" stroke-width="4"/>
        <path d="M ${x + 15} ${y - 15} l 7 8 l 14 -16" fill="none" stroke="${C.azul}"
              stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"/>
      </g>`;
    return `${defs(1080, V)}
${fondo(1080, V, t)}
${cabecera(t, x)}

${texto('Lo que no viste', x, 580, entra(t, 0.9), { tam: 94, desliz: 44 })}
${texto('en tu contrato', x, 686, entra(t, 1.05), { tam: 94, desliz: 44, fill: C.azul })}

${regla(x, 770, 520, entra(t, 1.6, 0.7), C.borde)}

${punto('Resumen en español claro', 900, entra(t, 1.9))}
${punto('Riesgos ordenados por gravedad', 1000, entra(t, 2.1))}
${punto('Cláusulas que debería tener', 1100, entra(t, 2.3))}
${punto('La norma que respalda cada punto', 1200, entra(t, 2.5))}

${texto('No reemplaza a un abogado.', x, 1400, entra(t, 3.4), { tam: 38, peso: 400, opacidadMax: 0.55 })}
${texto('Te dice qué preguntarle.', x, 1452, entra(t, 3.55), { tam: 38, peso: 400, opacidadMax: 0.55 })}

${pildora(SITIO, 540, 1740, entra(t, 4.4, 0.7), t, { ancho: 560, alto: 100, tam: 38 })}`;
  },
};


// ============================================================
//  4. LO QUE NO DICE — cláusulas ausentes
// ============================================================
const noDice = {
  nombre: 'lo-que-no-dice',
  w: 1080, h: V, dur: 8, fps: 24,
  destino: 'TikTok · Reels',
  frame(t) {
    const x = 96;
    return `${defs(1080, V)}
${fondo(1080, V, t)}
${cabecera(t, x)}

${texto('El problema', x, 620, entra(t, 0.9), { tam: 96, desliz: 46 })}
${texto('no es lo que dice', x, 730, entra(t, 1.05), { tam: 96, desliz: 46 })}
${texto('Es lo que falta', x, 840, entra(t, 1.25), { tam: 96, desliz: 46, fill: C.azul })}

${regla(x, 920, 520, entra(t, 1.8, 0.7), C.borde)}

${parrafo([
  'Un contrato sin cláusula de',
  'terminación, sin plazo claro',
  'o sin quién responde por qué',
  'te deja expuesto en silencio.',
], x, 1070, t, 2.2, { tam: 44, peso: 500, opacidadMax: 0.88, interlinea: 1.45 })}

${texto('Te decimos qué debería tener.', x, 1440, entra(t, 3.6), { tam: 46, peso: 600, fill: C.azul200 })}

${pildora(SITIO, 540, 1720, entra(t, 4.4, 0.7), t, { ancho: 580 })}`;
  },
};

// ============================================================
//  5. QUÉ CAMBIÓ — comparar dos versiones
// ============================================================
const queCambio = {
  nombre: 'que-cambio',
  w: 1080, h: V, dur: 8, fps: 24,
  destino: 'TikTok · Reels',
  frame(t) {
    const x = 96;
    return `${defs(1080, V)}
${fondo(1080, V, t)}
${cabecera(t, x)}

${texto('Te devolvieron', x, 630, entra(t, 0.9), { tam: 104, desliz: 46 })}
${texto('el contrato', x, 746, entra(t, 1.05), { tam: 104, desliz: 46 })}
${texto('¿Qué cambió?', x, 862, entra(t, 1.25), { tam: 104, desliz: 46, fill: C.azul })}

${regla(x, 940, 520, entra(t, 1.8, 0.7), C.borde)}

${parrafo([
  'Nadie te avisa qué línea',
  'se movió entre una versión',
  'y la siguiente.',
], x, 1090, t, 2.2, { tam: 46, peso: 500, opacidadMax: 0.88, interlinea: 1.45 })}

${punto('Sube las dos versiones', x, 1350, entra(t, 3.1))}
${punto('Te marcamos cada cambio', x, 1445, entra(t, 3.3))}
${punto('Y si te deja peor que antes', x, 1540, entra(t, 3.5))}

${pildora(SITIO, 540, 1740, entra(t, 4.5, 0.7), t, { ancho: 580 })}`;
  },
};

// ============================================================
//  6. CONTRATO DE ARRIENDO — nicho, el más compartible
// ============================================================
const arriendo = {
  nombre: 'contrato-de-arriendo',
  w: 1080, h: V, dur: 8, fps: 24,
  destino: 'TikTok · Reels',
  frame(t) {
    const x = 96;
    return `${defs(1080, V)}
${fondo(1080, V, t)}
${cabecera(t, x)}

${texto('Antes de firmar', x, 650, entra(t, 0.9), { tam: 104, desliz: 46 })}
${texto('el arriendo', x, 766, entra(t, 1.08), { tam: 104, desliz: 46, fill: C.azul })}

${regla(x, 846, 520, entra(t, 1.7, 0.7), C.borde)}

${parrafo([
  'Revisa quién paga las',
  'reparaciones, cómo y cuándo',
  'sube el canon, y qué pasa',
  'si te tienes que ir antes.',
], x, 990, t, 2.1, { tam: 46, peso: 500, opacidadMax: 0.88, interlinea: 1.45 })}

${texto('Súbelo y te lo revisamos', x, 1400, entra(t, 3.5), { tam: 50, peso: 600, fill: C.azul200 })}
${texto('cláusula por cláusula.', x, 1462, entra(t, 3.65), { tam: 50, peso: 600, fill: C.azul200 })}

${pildora(SITIO, 540, 1740, entra(t, 4.5, 0.7), t, { ancho: 580 })}`;
  },
};

// ============================================================
//  7. CONTRATO LABORAL — nicho
// ============================================================
const laboral = {
  nombre: 'contrato-laboral',
  w: 1080, h: V, dur: 8, fps: 24,
  destino: 'TikTok · Reels',
  frame(t) {
    const x = 96;
    return `${defs(1080, V)}
${fondo(1080, V, t)}
${cabecera(t, x)}

${texto('Te pasaron', x, 640, entra(t, 0.9), { tam: 106, desliz: 46 })}
${texto('el contrato', x, 758, entra(t, 1.05), { tam: 106, desliz: 46 })}
${texto('laboral', x, 876, entra(t, 1.25), { tam: 106, desliz: 46, fill: C.azul })}

${regla(x, 950, 520, entra(t, 1.8, 0.7), C.borde)}

${parrafo([
  'Lo leemos contra la norma',
  'colombiana y te señalamos',
  'lo que no cuadra.',
], x, 1100, t, 2.2, { tam: 46, peso: 500, opacidadMax: 0.88, interlinea: 1.45 })}

${texto('No reemplaza a un abogado.', x, 1420, entra(t, 3.5), { tam: 38, peso: 400, opacidadMax: 0.55 })}
${texto('Te dice qué preguntarle.', x, 1472, entra(t, 3.65), { tam: 38, peso: 400, opacidadMax: 0.55 })}

${pildora(SITIO, 540, 1740, entra(t, 4.4, 0.7), t, { ancho: 580 })}`;
  },
};

// ============================================================
//  8. EN ESPAÑOL CLARO — cuadrado, para el feed
// ============================================================
const claro = {
  nombre: 'en-espanol-claro',
  w: 1080, h: H1, dur: 6, fps: 24,
  destino: 'Feed de Instagram y Facebook',
  frame(t) {
    const x = 96;
    return `${defs(1080, H1)}
${fondo(1080, H1, t)}
${glifo(x, 108, 76, entra(t, 0.1, 0.8))}
${texto('Clausum', x + 100, 166, entra(t, 0.4), { tam: 46 })}

${texto('Tu contrato,', x, 420, entra(t, 0.85), { tam: 102, desliz: 44 })}
${texto('en español', x, 534, entra(t, 1.0), { tam: 102, desliz: 44, fill: C.azul })}

${regla(x, 606, 520, entra(t, 1.6, 0.7), C.borde)}

${parrafo([
  'Sin latinazgos ni párrafos',
  'de media página. Qué dice,',
  'qué te expone, qué falta.',
], x, 710, t, 2.0, { tam: 44, peso: 500, opacidadMax: 0.88, interlinea: 1.45 })}

${pildora(SITIO, 540, 990, entra(t, 3.3, 0.7), t, { ancho: 540, alto: 96, tam: 38 })}`;
  },
};

// ============================================================
const VIDEOS = [firma, queDice, noViste, noDice, queCambio, arriendo, laboral, claro];
const pedido = process.argv[2];
const lista = pedido ? VIDEOS.filter((v) => v.nombre.includes(pedido)) : VIDEOS;
if (!lista.length) {
  console.error('No encontré ese video. Hay: ' + VIDEOS.map((v) => v.nombre).join(', '));
  process.exit(1);
}

mkdirSync(SALIDA, { recursive: true });

for (const v of lista) {
  const total = Math.round(v.dur * v.fps);
  const dir = join(TMP, v.nombre);
  if (existsSync(dir)) rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });

  process.stdout.write(`${v.nombre}: componiendo ${total} fotogramas`);
  for (let i = 0; i < total; i++) {
    const t = i / v.fps;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${v.w}" height="${v.h}" viewBox="0 0 ${v.w} ${v.h}">${v.frame(t)}</svg>`;
    writeFileSync(join(dir, 'f_' + String(i).padStart(4, '0') + '.svg'), svg);
  }
  process.stdout.write(' · codificando');

  execFileSync('ffmpeg', [
    '-y', '-loglevel', 'error',
    '-framerate', String(v.fps),
    '-i', join(dir, 'f_%04d.svg'),
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '19',
    '-pix_fmt', 'yuv420p', '-movflags', '+faststart',
    join(SALIDA, v.nombre + '.mp4'),
  ]);
  rmSync(dir, { recursive: true, force: true });
  console.log(` · listo → videos/${v.nombre}.mp4  (${v.w}x${v.h}, ${v.dur}s · ${v.destino})`);
}
