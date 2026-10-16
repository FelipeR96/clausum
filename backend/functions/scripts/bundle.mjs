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
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');

const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));

// Externo: todo lo que Cloud Build va a instalar.
// Interno (se inlinea): @clausum/shared, que nunca llega alli.
const external = [
  ...Object.keys(pkg.dependencies ?? {}),
  ...Object.keys(pkg.peerDependencies ?? {}),
].filter((name) => name !== '@clausum/shared');

const result = await build({
  entryPoints: [join(root, 'src/index.ts')],
  bundle: true,
  platform: 'node',
  // El runtime de Cloud Functions, no el Node de esta maquina.
  target: 'node20',
  format: 'cjs',
  outfile: join(root, 'lib/index.js'),
  sourcemap: true,
  external,
  logLevel: 'info',
  metafile: true,
});

const out = result.metafile.outputs[Object.keys(result.metafile.outputs)[0]];
console.log(`\n✅ lib/index.js — ${(out.bytes / 1024).toFixed(0)} kB`);
console.log(`   externos: ${external.length} paquetes npm`);
console.log(`   inlineado: @clausum/shared`);
