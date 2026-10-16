/**
 * Seed del catálogo legal (tipos de contrato + temas).
 * NO carga artículos de ley — eso se hace aparte en laws/.
 *
 * Uso: pnpm seed:legal-catalog
 */
const path = require('path');
const fs = require('fs');
const { initializeApp } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');

const catalogPath = path.resolve(__dirname, '../../../shared/data/legal-catalog.json');
const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
const CONTRACT_TYPE_CATALOG = catalog.contractTypes;
const LEGAL_TOPIC_CATALOG = catalog.legalTopics;

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

initializeApp({ projectId });
const db = getFirestore();

async function seed() {
  const batch = db.batch();
  const now = FieldValue.serverTimestamp();

  for (const ct of CONTRACT_TYPE_CATALOG) {
    batch.set(
      db.collection('contract_types').doc(ct.id),
      { ...ct, updatedAt: now },
      { merge: true }
    );
  }

  for (const topic of LEGAL_TOPIC_CATALOG) {
    batch.set(
      db.collection('legal_topics').doc(topic.id),
      { ...topic, updatedAt: now },
      { merge: true }
    );
  }

  await batch.commit();
  console.log(
    `✅ Catálogo legal: ${CONTRACT_TYPE_CATALOG.length} tipos de contrato, ${LEGAL_TOPIC_CATALOG.length} temas`
  );
  // Se cuenta de verdad. Antes esta linea era texto fijo y decia que
  // laws/ estaba vacia aunque tuviera el corpus entero dentro: un aviso
  // que miente es peor que no tener aviso.
  const { count } = (await db.collection('laws').count().get()).data();
  console.log(
    count === 0
      ? 'ℹ️  Colección laws/ vacía — correr `pnpm import:co-corpus`'
      : `ℹ️  Colección laws/: ${count} artículos`
  );
}

seed().catch((err) => {
  console.error('❌ Error en seed legal:', err);
  process.exit(1);
});
