/**
 * Empaqueta las Cloud Functions en un unico archivo.
 *
 * El motivo es concreto: Firebase sube SOLO la carpeta backend/functions a
 * Cloud Build, que instala con npm. Y npm no entiende el protocolo
 * `workspace:*` de pnpm, asi que un despliegue con @clausum/shared como
 * dependencia muere con:
 *
 *   npm error Unsupported URL Type "workspace:": workspace:*
 *
 * La solucion habitual es copiar el paquete compartido dentro de la carpeta
 * y reescribir el package.json antes de desplegar. Aqui no hace falta:
 * @clausum/shared es TypeScript puro, sin una sola dependencia, asi que se
 * inlinea en el bundle y deja de existir como dependencia.
 *
 * Todo lo demas (firebase-admin, express, tesseract...) queda EXTERNO: son
 * paquetes npm normales que Cloud Build instala, varios con binarios
 * nativos que no se pueden empaquetar.
 */
import { build } from 'esbuild';
import { readFileSync, readdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');

const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));

// Una sola fuente para el runtime: engines.node del package.json, que es lo
// que lee Firebase. Tenerlo repetido aqui invitaba a que se desincronizaran.
const NODE_TARGET = `node${pkg.engines?.node ?? '22'}`;

// Version real de canvas tras los overrides. Va en el banner porque un
// cambio de binario nativo no altera el bundle, y porque es la unica forma
// de ver desde el build si el override se aplico de verdad.
//
// pnpm no deja el paquete en node_modules/canvas sino en
// node_modules/.pnpm/canvas@<version>/node_modules/canvas.
function resolveCanvasVersion() {
  const candidates = [
    join(root, 'node_modules/canvas/package.json'),
    join(root, '../../node_modules/canvas/package.json'),
  ];
  for (const file of candidates) {
    try {
      return JSON.parse(readFileSync(file, 'utf8')).version;
    } catch {
      /* siguiente */
    }
  }
  try {
    const store = join(root, '../../node_modules/.pnpm');
    const dir = readdirSync(store).find((d) => d.startsWith('canvas@'));
    if (dir) {
      return JSON.parse(
        readFileSync(join(store, dir, 'node_modules/canvas/package.json'), 'utf8')
      ).version;
    }
  } catch {
    /* no instalado */
  }
  return 'no encontrado';
}

const canvasVersion = resolveCanvasVersion();

const result = await build({
  entryPoints: [join(root, 'src/index.ts')],
  bundle: true,
  platform: 'node',
  // El runtime de Cloud Functions, no el Node de esta maquina.
  target: NODE_TARGET,
  format: 'cjs',
  outfile: join(root, 'lib/index.js'),
  // Explicito: de aqui salen los `paths`, y de ahi @clausum/shared.
  tsconfig: join(root, 'tsconfig.json'),
  // firebase-tools decide si redesplegar comparando un hash del codigo
  // subido. Un cambio que no toca el bundle -- subir el runtime, forzar una
  // version de una dependencia nativa -- deja el hash igual, y el despliegue
  // responde "Skipped (No changes detected)" y reporta exito sin haber
  // cambiado nada. Paso de verdad: engines.node a 22 y las funciones
  // siguieron en nodejs20.
  //
  // Meter el runtime y las versiones en el propio archivo hace que el hash
  // cambie exactamente cuando debe cambiar.
  banner: {
    js:
      `/* clausum functions | runtime ${NODE_TARGET} | ` +
      `canvas ${canvasVersion} | ${pkg.version} */`,
  },
  sourcemap: true,
  external,
  logLevel: 'info',
  metafile: true,
});

// El metafile incluye el .map; nos interesa el .js.
const [, out] = Object.entries(result.metafile.outputs).find(([name]) =>
  name.endsWith('index.js')
);
console.log(`\n✅ lib/index.js — ${(out.bytes / 1024).toFixed(0)} kB`);
console.log(`   runtime   : ${NODE_TARGET} (de engines.node)`);
console.log(`   canvas    : ${canvasVersion}`);
console.log(`   externos: ${external.length} paquetes npm`);
console.log(`   inlineado: @clausum/shared`);
