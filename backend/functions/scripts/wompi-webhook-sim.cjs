/**
 * Simulador de webhooks de Wompi para desarrollo local.
 *
 * Permite probar todo el camino post-pago (validación de firma, verificación
 * de monto y moneda, activación de Pro, idempotencia, fallos) sin tener una
 * cuenta de Wompi ni exponer el emulador a internet con un túnel.
 *
 * No necesita llaves reales: el checksum se calcula con el mismo
 * WOMPI_EVENTS_SECRET que lee el backend, así que un valor ficticio de
 * .env.local sirve mientras ambos lados usen el mismo.
 *
 * Requisitos: emuladores corriendo y, en el .env.local de functions,
 * WOMPI_PUBLIC_KEY / WOMPI_INTEGRITY_SECRET / WOMPI_EVENTS_SECRET con
 * cualquier valor de prueba.
 *
 * Uso:
 *   # crea un pago pendiente y lo aprueba
 *   node scripts/wompi-webhook-sim.cjs --uid=ABC123
 *
 *   # anual, rechazado
 *   node scripts/wompi-webhook-sim.cjs --uid=ABC123 --interval=annual --status=DECLINED
 *
 *   # reenvía el mismo evento: debe ser idempotente
 *   node scripts/wompi-webhook-sim.cjs --reference=clausum_ABC123_... --status=APPROVED
 *
 *   # monto alterado: el backend debe marcar AMOUNT_MISMATCH
 *   node scripts/wompi-webhook-sim.cjs --uid=ABC123 --amount=1
 *
 * Banderas:
 *   --uid            UID del usuario (obligatorio si no se pasa --reference)
 *   --reference      Referencia de un pago existente (p. ej. creado desde la UI)
 *   --interval       monthly | annual        (por defecto monthly)
 *   --status         APPROVED | DECLINED | VOIDED | ERROR  (por defecto APPROVED)
 *   --amount         Monto en centavos a enviar (por defecto, el real)
 *   --currency       Moneda a enviar (por defecto COP)
 *   --renewal        Marca el pago como renovación
 *   --bad-signature  Checksum inválido; el backend debe responder 401
 *   --api            Base de la API (por defecto el emulador de functions)
 *   --project        Project id (por defecto GCLOUD_PROJECT o clausum-dev)
 */
const { createHash } = require('crypto');
const { readFileSync, existsSync } = require('fs');
const { join } = require('path');
const { initializeApp } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');

// --- argumentos -----------------------------------------------------------

const args = Object.fromEntries(
  process.argv.slice(2).map((raw) => {
    const [key, value] = raw.replace(/^--/, '').split('=');
    return [key, value === undefined ? 'true' : value];
  })
);

const projectId = args.project ?? process.env.GCLOUD_PROJECT ?? 'clausum-dev';
const interval = args.interval === 'annual' ? 'annual' : 'monthly';
const status = (args.status ?? 'APPROVED').toUpperCase();
const isRenewal = args.renewal === 'true';
const currency = args.currency ?? 'COP';

// Los montos NO se escriben aqui. El precio vive en config/pricing y se
// cambia desde el panel de administracion; un valor fijo en este script
// envejece en silencio y produce un AMOUNT_MISMATCH que parece un fallo
// del backend cuando en realidad es el simulador mintiendo.
let realAmount = null;
let sentAmount = null;

if (!args.uid && !args.reference) {
  console.error('Falta --uid=<uid> (o --reference=<referencia existente>).');
  process.exit(1);
}

// --- secreto de eventos ---------------------------------------------------
// Se lee del mismo .env.local que carga el emulador, para que el checksum que
// firmamos sea exactamente el que el backend espera.

function readEventsSecret() {
  if (process.env.WOMPI_EVENTS_SECRET) return process.env.WOMPI_EVENTS_SECRET;
  const envPath = join(__dirname, '..', '.env.local');
  if (!existsSync(envPath)) return null;
  const line = readFileSync(envPath, 'utf8')
    .split(/\r?\n/)
    .find((l) => l.trim().startsWith('WOMPI_EVENTS_SECRET='));
  if (!line) return null;
  const value = line.slice(line.indexOf('=') + 1).trim().replace(/^["']|["']$/g, '');
  return value || null;
}

const eventsSecret = readEventsSecret();
if (!eventsSecret) {
  console.error(
    'No encontré WOMPI_EVENTS_SECRET ni en el entorno ni en backend/functions/.env.local.\n' +
      'Agrega un valor de prueba (cualquiera sirve en local) y vuelve a correr.'
  );
  process.exit(1);
}

// --- firestore (emulador) -------------------------------------------------

// Mismo criterio que los seeds: el destino se dice, no se adivina. Con la
// variable vacia este script se colgaba contra un emulador apagado.
const usarEmulador =
  process.argv.includes('--emulator') || process.env.FIRESTORE_EMULATOR_HOST !== undefined;

if (usarEmulador) {
  process.env.FIRESTORE_EMULATOR_HOST ??= '127.0.0.1:8080';
  console.log(`🧪 Emulador: ${process.env.FIRESTORE_EMULATOR_HOST}`);
} else {
  console.log(`☁️  Proyecto REAL: ${projectId}`);
}
initializeApp({ projectId });
const db = getFirestore();

const apiBase = args.api ?? `http://127.0.0.1:5001/${projectId}/us-east1/api`;

// --- firma ----------------------------------------------------------------
// Misma cadena que verifyWompiEventChecksum: los valores de las propiedades en
// orden, luego el timestamp, luego el secreto de eventos.

function getNested(obj, path) {
  const value = path.split('.').reduce((acc, key) => (acc == null ? acc : acc[key]), obj);
  return String(value ?? '');
}

function signEvent(data, properties, timestamp) {
  let chain = '';
  for (const prop of properties) chain += getNested(data, prop);
  chain += String(timestamp);
  chain += eventsSecret;
  return createHash('sha256').update(chain).digest('hex').toUpperCase();
}

// --- flujo ----------------------------------------------------------------

async function ensurePendingPayment() {
  if (args.reference) {
    const snap = await db.collection('payments').doc(args.reference).get();
    if (!snap.exists) {
      console.error(`No existe el pago ${args.reference} en el emulador.`);
      process.exit(1);
    }
    const data = snap.data();
    console.log(
      `Pago existente: ${args.reference} (estado actual: ${data.status}, usuario: ${data.userId})`
    );
    // El monto sale del propio pago: es el que el backend va a esperar.
    realAmount = data.amount;
    sentAmount = args.amount ? Number(args.amount) : realAmount;
    return { reference: args.reference, userId: data.userId };
  }

  // Pago nuevo: el precio se lee de config/pricing, la misma fuente que
  // usa el backend para firmar y cobrar.
  const pricingSnap = await db.collection('config').doc('pricing').get();
  const co = pricingSnap.exists ? pricingSnap.data().CO : null;
  if (!co) {
    console.error('No existe config/pricing en ' + projectId + '. Correr `pnpm seed:firestore`.');
    process.exit(1);
  }
  realAmount = interval === 'annual' ? co.yearlyAmountInCents : co.monthlyAmountInCents;
  sentAmount = args.amount ? Number(args.amount) : realAmount;
  console.log(`Precio vigente (${interval}): ${realAmount} centavos`);

  const suffix = Math.random().toString(36).slice(2, 10);
  const reference = `clausum_${args.uid.slice(0, 8)}_${Date.now()}_${interval}_${suffix}`;

  await db
    .collection('payments')
    .doc(reference)
    .set({
      userId: args.uid,
      provider: 'wompi',
      reference,
      amount: realAmount,
      currency: 'COP',
      status: 'pending',
      planId: 'pro',
      billingInterval: interval,
      isRenewal,
      description: `Clausum Pro — simulación ${interval}`,
      createdAt: FieldValue.serverTimestamp(),
    });

  console.log(`Pago pendiente creado: ${reference}`);
  return { reference, userId: args.uid };
}

async function main() {
  const { reference, userId } = await ensurePendingPayment();

  const timestamp = Math.floor(Date.now() / 1000);
  const transaction = {
    id: `sim-${timestamp}-${Math.random().toString(36).slice(2, 8)}`,
    amount_in_cents: sentAmount,
    reference,
    customer_email: 'prueba@clausum.test',
    currency,
    status,
    payment_source_id: 12345,
  };

  const properties = ['transaction.id', 'transaction.status', 'transaction.amount_in_cents'];

  const event = {
    event: 'transaction.updated',
    data: { transaction },
    environment: 'test',
    signature: {
      properties,
      checksum:
        args['bad-signature'] === 'true'
          ? '0'.repeat(64)
          : signEvent({ transaction }, properties, timestamp),
    },
    timestamp,
  };

  const url = `${apiBase}/billing/wompi/webhook`;
  console.log(`\nPOST ${url}`);
  console.log(`  transacción ${transaction.id} · ${status} · ${sentAmount} ${currency}`);

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(event),
  });

  const body = await res.text();
  console.log(`\nRespuesta HTTP ${res.status}: ${body}\n`);

  // El estado resultante es lo que de verdad queremos comprobar.
  const paymentSnap = await db.collection('payments').doc(reference).get();
  const payment = paymentSnap.data() ?? {};
  console.log('payments/' + reference);
  console.log(`  status      : ${payment.status}`);
  if (payment.failureCode) console.log(`  failureCode : ${payment.failureCode}`);
  if (payment.wompiTransactionId) console.log(`  transacción : ${payment.wompiTransactionId}`);

  if (userId) {
    const userSnap = await db.collection('users').doc(userId).get();
    if (userSnap.exists) {
      const user = userSnap.data();
      const end = user.subscriptionPeriodEnd ?? user.currentPeriodEnd;
      console.log(`\nusers/${userId}`);
      console.log(`  plan        : ${user.plan ?? user.planId ?? '(sin plan)'}`);
      console.log(`  estado      : ${user.subscriptionStatus ?? '(sin estado)'}`);
      if (end) {
        const date = end.toDate ? end.toDate() : new Date(end);
        console.log(`  periodo fin : ${date.toISOString()}`);
      }
    } else {
      console.log(`\nusers/${userId} no existe en el emulador.`);
    }
  }

  if (res.status !== 200) process.exitCode = 1;
}

main().catch((error) => {
  console.error('\nFalló el simulador:', error.message);
  process.exit(1);
});
