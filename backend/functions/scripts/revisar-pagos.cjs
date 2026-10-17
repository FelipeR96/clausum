/**
 * Resumen de la coleccion payments, para mirar despues de probar cobros.
 *
 * Uso (con GOOGLE_APPLICATION_CREDENTIALS apuntando a la clave de servicio):
 *   node scripts/revisar-pagos.cjs
 *   node scripts/revisar-pagos.cjs --emulator
 */
const { initializeApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

const projectId = process.env.GCLOUD_PROJECT ?? 'clausum-dev';

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

const fecha = (t) => (t?.toDate ? t.toDate().toISOString().slice(0, 16).replace('T', ' ') : '—');

async function main() {
  const snap = await db.collection('payments').orderBy('createdAt', 'asc').get();

  console.log(`\n${snap.size} documentos en payments\n`);
  console.log(
    'PROVEEDOR  ESTADO      IMPORTE      MONEDA  INTERVALO  RENOV  COBRADO           REFERENCIA'
  );
  console.log('-'.repeat(118));

  const total = {};
  for (const doc of snap.docs) {
    const d = doc.data();
    const fila = [
      (d.provider ?? '—').padEnd(10),
      (d.status ?? '—').padEnd(11),
      String(d.amount ?? 0).padStart(10),
      ' ' + (d.currency ?? '—').padEnd(7),
      (d.billingInterval ?? '—').padEnd(10),
      (d.isRenewal ? 'si' : 'no').padEnd(6),
      fecha(d.paidAt).padEnd(17),
      doc.id.slice(0, 34),
    ].join(' ');
    console.log(fila);

    if (d.status === 'succeeded') {
      const k = `${d.provider ?? '?'} ${d.currency ?? '?'}`;
      total[k] ??= { pagos: 0, importe: 0 };
      total[k].pagos += 1;
      total[k].importe += typeof d.amount === 'number' ? d.amount : 0;
    }
  }

  console.log('\nSolo los cobrados (succeeded), que es lo que cuenta Ingresos:');
  for (const [k, v] of Object.entries(total)) {
    console.log(`  ${k.padEnd(14)} ${String(v.pagos).padStart(2)} pagos  ${v.importe} centavos`);
  }
  if (Object.keys(total).length === 0) console.log('  (ninguno)');

  const u = await db.collection('users').get();
  console.log('\nUsuarios:');
  for (const doc of u.docs) {
    const d = doc.data();
    console.log(
      `  ${(d.email ?? doc.id).padEnd(32)} ${(d.planId ?? '—').padEnd(5)} ${(d.subscriptionStatus ?? '—').padEnd(10)} ` +
        `${(d.billingProvider ?? '—').padEnd(8)} ${(d.billingInterval ?? '—').padEnd(8)} vence ${fecha(d.currentPeriodEnd)}` +
        `${d.cancelAtPeriodEnd ? '  [sin renovacion]' : ''}` +
        `${d.planGrantedBy ? '  [cortesia]' : ''}`
    );
  }
}

main().catch((e) => {
  console.error('Fallo:', e.message);
  process.exit(1);
});
