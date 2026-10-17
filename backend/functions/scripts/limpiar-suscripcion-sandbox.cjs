/**
 * Borra la suscripcion de pruebas (sandbox) que quedo pegada a un usuario.
 *
 * Al probar el flujo de PayPal en sandbox el usuario queda marcado como Pro
 * con un subscriptionId que en produccion no existe. El sistema cree que ya
 * hay suscripcion activa y no deja volver a suscribirse, asi que antes de
 * probar los cobros reales hay que limpiar esos campos.
 *
 * No borra el usuario, ni sus contratos, ni su historial: solo los campos de
 * facturacion. Y antes deja una copia en JSON en la carpeta personal, fuera
 * del repositorio, para poder deshacerlo.
 *
 * Los pagos de la coleccion payments NO se tocan: solo se listan, porque son
 * registros y conviene decidirlos a mano.
 *
 * ── Credenciales ────────────────────────────────────────────────────────
 * Si GOOGLE_APPLICATION_CREDENTIALS no esta puesta, busca sola una clave de
 * servicio del proyecto en la carpeta "claves" del usuario.
 *
 * ── Uso (desde backend/functions) ───────────────────────────────────────
 *   node scripts/limpiar-suscripcion-sandbox.cjs            # solo mira
 *   node scripts/limpiar-suscripcion-sandbox.cjs --aplicar  # escribe
 *   node scripts/limpiar-suscripcion-sandbox.cjs --email=otro@dominio.com
 *
 *   --borrar-pagos-pendientes   borra tambien los payments en pending de ese
 *                               usuario (nunca los succeeded). Requiere --aplicar.
 *   --project=<id>   por defecto clausum-dev
 */
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const args = process.argv.slice(2);
const aplicar = args.includes('--aplicar');
const borrarPendientes = args.includes('--borrar-pagos-pendientes');
const valor = (nombre, pordefecto) =>
  args.find((a) => a.startsWith(`--${nombre}=`))?.split('=').slice(1).join('=') ?? pordefecto;

const projectId = valor('project', process.env.GCLOUD_PROJECT ?? 'clausum-dev');
const email = valor('email', 'felipereinaleso96@gmail.com');

/** Campos de facturacion que se van a borrar del documento del usuario. */
const CAMPOS = [
  'subscriptionId',
  'subscriptionStatus',
  'currentPeriodEnd',
  'billingProvider',
  'billingInterval',
  'subscriptionAmountInCents',
  'cancelAtPeriodEnd',
  'canceledAt',
  'wompiPaymentSourceId',
  'wompiBillingInterval',
  'wompiLastRenewalAttemptAt',
];

function buscarClave() {
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    return process.env.GOOGLE_APPLICATION_CREDENTIALS;
  }
  const dir = path.join(os.homedir(), 'claves');
  if (!fs.existsSync(dir)) return null;
  for (const nombre of fs.readdirSync(dir)) {
    if (!nombre.toLowerCase().endsWith('.json')) continue;
    const ruta = path.join(dir, nombre);
    try {
      const j = JSON.parse(fs.readFileSync(ruta, 'utf8'));
      if (j.private_key && j.project_id === projectId) return ruta;
    } catch {
      // no es una clave de servicio; seguir buscando
    }
  }
  return null;
}

const clave = buscarClave();
if (!clave) {
  console.error(`\nNo encontre credenciales para ${projectId}.`);
  console.error('   Pon la ruta de la clave de servicio y repite:');
  console.error('   $env:GOOGLE_APPLICATION_CREDENTIALS="C:\\ruta\\clave.json"\n');
  process.exit(1);
}
process.env.GOOGLE_APPLICATION_CREDENTIALS = clave;

const { initializeApp, applicationDefault } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');

initializeApp({ credential: applicationDefault(), projectId });
const db = getFirestore();

/** Convierte Timestamps a texto legible para poder imprimir y respaldar. */
function plano(valor) {
  if (valor === null || valor === undefined) return valor;
  if (typeof valor.toDate === 'function') return valor.toDate().toISOString();
  if (Array.isArray(valor)) return valor.map(plano);
  if (typeof valor === 'object') {
    return Object.fromEntries(Object.entries(valor).map(([k, v]) => [k, plano(v)]));
  }
  return valor;
}

async function main() {
  console.log(`\nProyecto: ${projectId}`);
  console.log(`Clave:    ${path.basename(clave)}`);
  console.log(`Usuario:  ${email}`);
  console.log(aplicar ? 'Modo:     APLICAR (va a escribir)\n' : 'Modo:     solo mirar\n');

  const encontrados = await db.collection('users').where('email', '==', email).get();
  if (encontrados.empty) {
    console.error(`No hay ningun usuario con el correo ${email}.`);
    process.exit(1);
  }
  if (encontrados.size > 1) {
    console.error(`Hay ${encontrados.size} usuarios con ese correo. No toco nada.`);
    encontrados.docs.forEach((d) => console.error(`   ${d.id}`));
    process.exit(1);
  }

  const doc = encontrados.docs[0];
  const datos = doc.data();
  console.log(`uid: ${doc.id}`);
  console.log(`planId actual: ${datos.planId ?? '(sin plan)'}\n`);

  const presentes = CAMPOS.filter((c) => datos[c] !== undefined);
  if (presentes.length === 0 && (datos.planId ?? 'free') === 'free') {
    console.log('Ya esta limpio: plan free y ningun campo de facturacion.\n');
  } else {
    console.log('Campos de facturacion que tiene ahora:');
    for (const c of presentes) console.log(`   ${c.padEnd(28)} ${JSON.stringify(plano(datos[c]))}`);
    if (presentes.length === 0) console.log('   (ninguno, pero el plan no es free)');
    console.log('');
  }

  // Lo que hay en subscriptions y payments: se informa, no se borra.
  const subs = await db.collection('subscriptions').where('userId', '==', doc.id).get();
  console.log(`subscriptions con este userId: ${subs.size}`);
  subs.docs.forEach((s) => {
    const d = s.data();
    console.log(
      `   ${s.id}  estado=${d.status ?? '—'}  paypal=${d.paypalSubscriptionId ?? '—'}`
    );
  });

  const pagos = await db.collection('payments').where('userId', '==', doc.id).get();
  console.log(`\npayments con este userId: ${pagos.size}`);
  pagos.docs.forEach((p) => {
    const d = p.data();
    console.log(
      `   ${p.id.slice(0, 30).padEnd(31)} ${(d.provider ?? '—').padEnd(8)} ` +
        `${(d.status ?? '—').padEnd(10)} ${String(d.amount ?? 0).padStart(9)} ${d.currency ?? '—'}`
    );
  });
  // Solo se borran los pending. Un succeeded es un cobro, y eso es un
  // registro contable: no se borra desde un script de limpieza.
  const pendientes = pagos.docs.filter((x) => x.data().status === 'pending');

  if (!borrarPendientes) {
    console.log(
      pendientes.length > 0
        ? `   (${pendientes.length} en pending; para borrarlos: --borrar-pagos-pendientes)\n`
        : '   (los pagos no se tocan)\n'
    );
  } else if (pendientes.length === 0) {
    console.log('   (no hay ninguno en pending que borrar)\n');
  } else if (!aplicar) {
    console.log(`   (se borrarian ${pendientes.length} en pending; falta --aplicar)\n`);
  } else {
    const marcaPagos = new Date().toISOString().replace(/[:.]/g, '-');
    const respaldoPagos = path.join(
      os.homedir(),
      `respaldo-pagos-pendientes-${doc.id}-${marcaPagos}.json`
    );
    fs.writeFileSync(
      respaldoPagos,
      JSON.stringify(
        pendientes.map((x) => ({ id: x.id, ...plano(x.data()) })),
        null,
        2
      ),
      'utf8'
    );
    console.log(`\n   Copia de los ${pendientes.length} pagos en:`);
    console.log(`   ${respaldoPagos}`);
    for (const x of pendientes) await x.ref.delete();
    const tras = await db.collection('payments').where('userId', '==', doc.id).get();
    console.log(
      `   Borrados ${pendientes.length}. Quedan ${tras.size} pagos de este usuario.\n`
    );
  }

  if (presentes.length === 0 && (datos.planId ?? 'free') === 'free') {
    console.log('El documento del usuario ya estaba limpio.\n');
    return;
  }

  if (!aplicar) {
    console.log('Esto es solo una mirada. Para escribirlo de verdad:');
    console.log('   node scripts/limpiar-suscripcion-sandbox.cjs --aplicar\n');
    return;
  }

  // Copia antes de escribir, fuera del repositorio.
  const marca = new Date().toISOString().replace(/[:.]/g, '-');
  const respaldo = path.join(os.homedir(), `respaldo-usuario-${doc.id}-${marca}.json`);
  fs.writeFileSync(respaldo, JSON.stringify(plano(datos), null, 2), 'utf8');
  console.log(`Copia guardada en:\n   ${respaldo}\n`);

  const cambios = { planId: 'free' };
  for (const c of presentes) cambios[c] = FieldValue.delete();
  await doc.ref.update(cambios);

  const despues = (await doc.ref.get()).data();
  const quedan = CAMPOS.filter((c) => despues[c] !== undefined);
  console.log(`Hecho. planId = ${despues.planId}`);
  console.log(
    quedan.length === 0
      ? 'Ningun campo de facturacion quedo en el documento.\n'
      : `OJO: todavia quedan ${quedan.join(', ')}\n`
  );
}

main().catch((e) => {
  console.error('\nFallo:', e?.message ?? e);
  process.exit(1);
});
