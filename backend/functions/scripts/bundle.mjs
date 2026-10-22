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
import { readFileSync, rmSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'node:module';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');

const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));

// Una sola fuente para el runtime: engines.node del package.json, que es lo
// que lee Firebase. Tenerlo repetido aqui invitaba a que se desincronizaran.
const NODE_TARGET = `node${pkg.engines?.node ?? '22'}`;

// Version de canvas que pdf-img-convert carga de verdad.
//
// Va en el banner por dos motivos: un cambio de binario nativo no altera el
// bundle (y entonces firebase se salta el despliegue), y es la unica forma
// de ver desde el build si el override se aplico.
//
// Se resuelve como lo hace Node, desde pdf-img-convert, no buscando
// carpetas: el store de pnpm conserva versiones viejas y un `find` por
// prefijo devuelve la primera por orden alfabetico, que fue exactamente
// como este script acabo reportando 2.11.2 con la 3.2.3 instalada.
function resolveCanvasVersion() {
  try {
    const here = createRequire(import.meta.url);
    const consumidor = here.resolve('pdf-img-convert', { paths: [root] });
    const desdeAhi = createRequire(consumidor);
    return JSON.parse(
      readFileSync(desdeAhi.resolve('canvas/package.json'), 'utf8')
    ).version;
  } catch (error) {
    return `no resuelto (${error.code ?? 'error'})`;
  }
}

const canvasVersion = resolveCanvasVersion();

// lib/ se borra entera antes de construir.
//
// Este script solo escribe lib/index.js, pero nunca limpiaba lo que hubiera
// antes. Un `tsc` de hace meses habia dejado ahi un arbol compilado
// completo —config/, routes/, services/ y hasta __tests__— y Firebase sube
// la carpeta backend/functions ENTERA a Cloud Build. Es decir: los tests
// compilados, que piden vitest, viajaban a produccion en cada despliegue.
//
// Construir sobre restos tambien es como un archivo borrado del codigo
// sigue vivo en el contenedor durante meses.
rmSync(join(root, 'lib'), { recursive: true, force: true });

// Externo: todo lo que Cloud Build va a instalar. Varios traen binarios
// nativos y no se pueden empaquetar.
// Interno (se inlinea): @clausum/shared, que nunca llega alli.
const external = [
  ...Object.keys(pkg.dependencies ?? {}),
  ...Object.keys(pkg.peerDependencies ?? {}),
];

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
