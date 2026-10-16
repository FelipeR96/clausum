/**
 * Importa artículos legales a Firestore (colección laws/).
 *
 * Formato: array JSON de artículos. Ver import-laws.example.json
 *
 * Uso:
 *   pnpm --filter @clausum/functions import:laws -- ./data/co-arrendamiento.json
 */
const fs = require('fs');
const path = require('path');
const { initializeApp } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');

const projectId = process.env.GCLOUD_PROJECT ?? 'clausum-dev';

// El destino se dice en voz alta, no se adivina.
//
// Antes, si FIRESTORE_EMULATOR_HOST venia vacio este script se apuntaba
// solo al emulador. Eso tiene dos finales malos y ninguno avisa: con el
// emulador apagado se queda colgado reintentando, y con el emulador
// encendido escribe ahi cuando creias estar sembrando el proyecto real.
// Ahora hay que pedir el emulador con --emulator (o con la variable ya
// puesta); si no, va al proyecto, y se imprime cual antes de tocar nada.
const usarEmulador =
  process.argv.includes('--emulator') || process.env.FIRESTORE_EMULATOR_HOST !== undefined;

if (usarEmulador) {
  process.env.FIRESTORE_EMULATOR_HOST ??= '127.0.0.1:8080';
  console.log(`🧪 Emulador: ${process.env.FIRESTORE_EMULATOR_HOST} (proyecto ${projectId})`);
} else {
  console.log(`☁️  Proyecto REAL: ${projectId}`);
  if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    console.log(
      '   (sin GOOGLE_APPLICATION_CREDENTIALS: se usaran las credenciales de gcloud)'
    );
  }
}

const fileArg = process.argv[2];
if (!fileArg) {
  console.error('Uso: node scripts/import-laws.cjs <ruta-al-json>');
  process.exit(1);
}

const filePath = path.resolve(fileArg);
if (!fs.existsSync(filePath)) {
  console.error(`Archivo no encontrado: ${filePath}`);
  process.exit(1);
}

initializeApp({ projectId });
const db = getFirestore();

const REQUIRED = [
  'id',
  'country',
  'codeName',
  'normType',
  'article',
  'content',
  'status',
];

async function importLaws() {
  const raw = fs.readFileSync(filePath, 'utf8');
  const articles = JSON.parse(raw);

  if (!Array.isArray(articles)) {
    throw new Error('El JSON debe ser un array de artículos');
  }

  const batchSize = 400;
  let imported = 0;

  for (let i = 0; i < articles.length; i += batchSize) {
    const batch = db.batch();
    const chunk = articles.slice(i, i + batchSize);

    for (const article of chunk) {
      for (const field of REQUIRED) {
        if (article[field] === undefined || article[field] === '') {
          throw new Error(`Artículo ${article.id ?? '?'} falta campo: ${field}`);
        }
      }

      const docId = article.id;
      batch.set(
        db.collection('laws').doc(docId),
        {
          country: article.country,
          codeName: article.codeName,
          normType: article.normType,
          article: String(article.article),
          title: article.title ?? null,
          content: article.content,
          summary: article.summary ?? null,
          category: article.category ?? null,
          topics: article.topics ?? [],
          keywords: article.keywords ?? [],
          contractTypeIds: article.contractTypeIds ?? [],
          riskLevel: article.riskLevel ?? null,
          officialSource: article.officialSource ?? null,
          status: article.status,
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
    }

    await batch.commit();
    imported += chunk.length;
    console.log(`  … ${imported}/${articles.length}`);
  }

  console.log(`✅ Importados ${imported} artículos en laws/`);
}

importLaws().catch((err) => {
  console.error('❌ Error importando leyes:', err);
  process.exit(1);
});
