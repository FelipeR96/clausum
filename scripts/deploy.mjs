/**
 * Envoltorio de `firebase deploy`.
 *
 * Existe por una razon concreta: para saber que desplegar, firebase-tools
 * carga lib/index.js y lee las funciones que exporta. El limite por defecto
 * para eso son 10 segundos, y este codigo no entra: tesseract.js, pdfkit,
 * mammoth y firebase-admin tardan mas en inicializarse. El sintoma es:
 *
 *   Error: User code failed to load. Cannot determine backend
 *   specification. Timeout after 10000.
 *
 * Es un limite de analisis, no de ejecucion: no dice nada sobre si las
 * funciones arrancan rapido una vez desplegadas.
 *
 * scripts/start-emulators.mjs ya subia este limite a 60s para los
 * emuladores; el despliegue se habia quedado sin esa red.
 *
 * Uso:  pnpm deploy            (todo)
 *       pnpm deploy:functions  (solo functions)
 *       node scripts/deploy.mjs --only hosting
 */
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

const env = {
  ...process.env,
  FUNCTIONS_DISCOVERY_TIMEOUT: process.env.FUNCTIONS_DISCOVERY_TIMEOUT ?? '120',
};

const firebaseBin = join(process.cwd(), 'node_modules', '.bin', 'firebase');
const command = existsSync(firebaseBin) ? `"${firebaseBin}"` : 'npx firebase';

const args = process.argv.slice(2).join(' ');

console.log(
  `⏱️  FUNCTIONS_DISCOVERY_TIMEOUT=${env.FUNCTIONS_DISCOVERY_TIMEOUT}s ` +
    `(la carga de tesseract/pdfkit no entra en los 10s por defecto)\n`
);

const child = spawn(`${command} deploy ${args}`.trim(), [], {
  stdio: 'inherit',
  shell: true,
  env,
});

child.on('exit', (code) => process.exit(code ?? 1));
