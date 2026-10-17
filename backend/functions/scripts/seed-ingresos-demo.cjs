/**
 * Pagos de mentira para mirar la pantalla de Ingresos.
 *
 * Los tests prueban la aritmetica de getIngresos, pero nadie ha dibujado
 * todavia las pantallas nuevas. Esto siembra los casos que pueden reventar
 * al renderizar y que de otro modo no se ven:
 *
 *   - dos monedas a la vez (COP y USD), que es la razon de ser del cambio
 *   - tres medios de pago en Wompi, con comisiones distintas
 *   - un pago de PayPal SIN tarifa configurada, para ver el aviso ambar
 *   - una renovacion, para que el bloque "nuevos vs renovaciones" no salga
 *     siempre en cero
 *   - un pago fallido y uno pendiente, que NO deben aparecer
 *
 * SOLO emulador. Estos documentos no deben acercarse al proyecto real.
 *
 * Uso (con los emuladores corriendo):
 *   node scripts/seed-ingresos-demo.cjs --emulator
 *   node scripts/seed-ingresos-demo.cjs --emulator --borrar
 */
const { initializeApp } = require('firebase-admin/app');
const { getFirestore, Timestamp } = require('firebase-admin/firestore');

const projectId = process.env.GCLOUD_PROJECT ?? 'clausum-dev';

// Igual que el resto de scripts: el destino se pide, no se adivina. Y aqui
// ademas no hay destino alternativo: sin emulador no se ejecuta.
const usarEmulador =
  process.argv.includes('--emulator') || process.env.FIRESTORE_EMULATOR_HOST !== undefined;

if (!usarEmulador) {
  console.error('✋ Este script solo corre contra el emulador.');
  console.error('   Son pagos falsos: en el proyecto real ensuciarian los ingresos.');
  console.error('   Usa: node scripts/seed-ingresos-demo.cjs --emulator');
  process.exit(1);
}

process.env.FIRESTORE_EMULATOR_HOST ??= '127.0.0.1:8080';
console.log(`🧪 Emulador: ${process.env.FIRESTORE_EMULATOR_HOST} (proyecto ${projectId})`);

initializeApp({ projectId });
const db = getFirestore();

/** Hace N dias, a mediodia local: siempre dentro del mes en curso. */
function hace(dias) {
  const d = new Date();
  d.setDate(d.getDate() - dias);
  d.setHours(12, 0, 0, 0);
  return Timestamp.fromDate(d);
}

const PREFIJO = 'demo-ingreso-';

const PAGOS = [
  {
    id: 'cop-tarjeta-1',
    status: 'succeeded',
    amount: 3_300_000,
    currency: 'COP',
    provider: 'wompi',
    paymentMethodType: 'CARD',
    billingInterval: 'monthly',
    userId: 'demo-cliente-1',
    paidAt: hace(9),
  },
  {
    id: 'cop-tarjeta-2',
    status: 'succeeded',
    amount: 33_000_000,
    currency: 'COP',
    provider: 'wompi',
    paymentMethodType: 'CARD',
    billingInterval: 'annual',
    userId: 'demo-cliente-2',
    paidAt: hace(7),
  },
  {
    id: 'cop-pse',
    status: 'succeeded',
    amount: 3_300_000,
    currency: 'COP',
    provider: 'wompi',
    paymentMethodType: 'PSE',
    billingInterval: 'monthly',
    userId: 'demo-cliente-3',
    paidAt: hace(5),
  },
  {
    id: 'cop-nequi',
    status: 'succeeded',
    amount: 3_300_000,
    currency: 'COP',
    provider: 'wompi',
    paymentMethodType: 'NEQUI',
    billingInterval: 'monthly',
    userId: 'demo-cliente-4',
    paidAt: hace(4),
  },
  // Renovacion del cliente 1: no es un cliente nuevo.
  {
    id: 'cop-renovacion',
    status: 'succeeded',
    amount: 3_300_000,
    currency: 'COP',
    provider: 'wompi',
    paymentMethodType: 'CARD',
    billingInterval: 'monthly',
    isRenewal: true,
    userId: 'demo-cliente-1',
    paidAt: hace(1),
  },
  // Dolares. Sin tarifa de PayPal: debe salir el aviso ambar y neto = bruto.
  {
    id: 'usd-paypal-1',
    status: 'succeeded',
    amount: 1_000,
    currency: 'USD',
    provider: 'paypal',
    billingInterval: 'monthly',
    userId: 'demo-cliente-5',
    paidAt: hace(6),
  },
  {
    id: 'usd-paypal-2',
    status: 'succeeded',
    amount: 10_000,
    currency: 'USD',
    provider: 'paypal',
    billingInterval: 'annual',
    userId: 'demo-cliente-6',
    paidAt: hace(2),
  },
  // Estos dos NO deben aparecer en ninguna parte.
  {
    id: 'cop-fallido',
    status: 'failed',
    amount: 3_300_000,
    currency: 'COP',
    provider: 'wompi',
    paymentMethodType: 'CARD',
    userId: 'demo-cliente-7',
    paidAt: hace(3),
  },
  {
    id: 'cop-pendiente',
    status: 'pending',
    amount: 3_300_000,
    currency: 'COP',
    provider: 'wompi',
    paymentMethodType: 'PSE',
    userId: 'demo-cliente-8',
    paidAt: hace(3),
  },
];

async function borrar() {
  const snap = await db.collection('payments').get();
  const demo = snap.docs.filter((d) => d.id.startsWith(PREFIJO));
  await Promise.all(demo.map((d) => d.ref.delete()));
  console.log(`🧹 Borrados ${demo.length} pagos de demostracion.`);
}

async function sembrar() {
  const lote = db.batch();
  for (const { id, ...datos } of PAGOS) {
    lote.set(db.collection('payments').doc(PREFIJO + id), datos);
  }
  await lote.commit();

  console.log(`✅ ${PAGOS.length} pagos sembrados.`);
  console.log('');
  console.log('   Lo que deberias ver en Administracion → Ingresos (este mes):');
  console.log('');
  console.log('   COP   cobrado $429.000  ·  5 pagos  ·  4 clientes');
  console.log('         (el cliente 1 pago dos veces: cuenta como UN cliente)');
  console.log('         comisiones restadas, neto por debajo del cobrado');
  console.log('         sin aviso ambar: las tarifas de Wompi estan puestas');
  console.log('');
  console.log('   USD   cobrado $110,00  ·  2 pagos  ·  2 clientes');
  console.log('         neto IGUAL al cobrado y AVISO AMBAR: PayPal sin tarifa');
  console.log('');
  console.log('   COP va primero (es el bloque mas grande).');
  console.log('   El fallido y el pendiente no aparecen en ningun sitio.');
}

(async () => {
  try {
    await borrar();
    if (!process.argv.includes('--borrar')) await sembrar();
  } catch (error) {
    console.error('💥', error.message);
    process.exit(1);
  }
})();
