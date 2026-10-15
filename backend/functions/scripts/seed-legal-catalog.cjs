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

if (process.env.FIRESTORE_EMULATOR_HOST === undefined) {
  process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';
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
  console.log('ℹ️  Colección laws/ vacía — agregar artículos cuando el corpus esté listo');
}

seed().catch((err) => {
  console.error('❌ Error en seed legal:', err);
  process.exit(1);
});
