/**
 * Genera e importa el corpus legal MVP de Colombia (laws/).
 *
 * Uso (emuladores corriendo):
 *   pnpm import:co-corpus
 */
const { execSync } = require('child_process');
const path = require('path');

const root = path.resolve(__dirname, '..');

console.log('📦 Generando co-mvp-corpus.json…');
execSync('node scripts/build-co-corpus.cjs', { cwd: root, stdio: 'inherit' });

const corpusPath = path.join(root, 'data', 'co-mvp-corpus.json');
console.log('📥 Importando a Firestore laws/…');
execSync(`node scripts/import-laws.cjs "${corpusPath}"`, { cwd: root, stdio: 'inherit' });

console.log('✅ Corpus legal Colombia importado.');
