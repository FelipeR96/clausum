/**
 * Seed de datos iniciales para emuladores o proyecto dev.
 *
 * Uso (con emuladores corriendo):
 *   pnpm seed:firestore
 */
const { initializeApp } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');

const projectId = process.env.GCLOUD_PROJECT ?? 'clausum-dev';

if (process.env.FIRESTORE_EMULATOR_HOST === undefined) {
  process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';
}

initializeApp({ projectId });
const db = getFirestore();

const plans = {
  free: {
    name: 'Free',
    slug: 'free',
    priceMonthly: 0,
    currency: 'COP',
    limits: {
      analysesPerMonth: 3,
      comparisonsPerMonth: 1,
      maxFileSizeMb: 5,
      maxContracts: 10,
      exportPdf: false,
      fullHistory: false,
      historyMaxEntries: 10,
      alertsAdvanced: false,
      apiAccess: false,
      ocrScannedPdf: false,
    },
    features: [
      '3 análisis al mes',
      '1 comparación al mes',
      'PDF digital o Word (.docx) sin límite de páginas',
      'Sin OCR para PDF escaneados',
      'Alertas básicas',
      'Historial limitado',
    ],
    active: true,
    sortOrder: 0,
    updatedAt: FieldValue.serverTimestamp(),
  },
  pro: {
    name: 'Pro',
    slug: 'pro',
    priceMonthly: 4000000,
    priceYearly: 40000000,
    currency: 'COP',
    limits: {
      analysesPerMonth: 75,
      comparisonsPerMonth: 30,
      maxFileSizeMb: 10,
      maxContracts: -1,
      exportPdf: true,
      fullHistory: true,
      historyMaxEntries: -1,
      alertsAdvanced: true,
      apiAccess: true,
      ocrScannedPdf: true,
    },
    features: [
      '75 análisis al mes',
      '30 comparaciones al mes',
      'PDF digital o Word (.docx) sin límite de páginas',
      'OCR para PDF escaneados (primeras 7 páginas)',
      'Alertas avanzadas',
      'Historial completo',
      'Exportación PDF',
    ],
    active: true,
    sortOrder: 1,
    updatedAt: FieldValue.serverTimestamp(),
  },
};

const config = {
  app: {
    maintenanceMode: false,
    supportEmail: 'soporte@clausum.com',
    minAppVersion: '0.1.0',
    updatedAt: FieldValue.serverTimestamp(),
  },
  features: {
    compareEnabled: true,
    risksEnabled: true,
    paypalEnabled: false,
    betaUsers: [],
    updatedAt: FieldValue.serverTimestamp(),
  },
  limits: {
    updatedAt: FieldValue.serverTimestamp(),
  },
};

async function seed() {
  const batch = db.batch();

  for (const [id, plan] of Object.entries(plans)) {
    batch.set(db.collection('plans').doc(id), plan, { merge: true });
  }

  for (const [id, doc] of Object.entries(config)) {
    batch.set(db.collection('config').doc(id), doc, { merge: true });
  }

  await batch.commit();
  console.log('✅ Seed completado: plans (free, pro) + config (app, features, limits)');
}

seed().catch((err) => {
  console.error('❌ Error en seed:', err);
  process.exit(1);
});
