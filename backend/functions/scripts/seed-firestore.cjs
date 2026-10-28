/**
 * Siembra los documentos que la aplicacion necesita para arrancar.
 *
 * ── Por defecto NO pisa nada que ya exista ──────────────────────────────
 * Un seed existe para dejar funcionando un proyecto vacio, no para devolver
 * la configuracion a la de fabrica. La version anterior usaba
 * `set(..., { merge: true })` para todo, y eso tenia dos consecuencias que
 * nadie queria:
 *
 *  - `config/pricing` traia los precios escritos aqui. Un comentario
 *    aseguraba que merge no pisaba un precio cambiado desde el panel, y eso
 *    es falso: merge conserva los campos que NO vienen en el payload, pero
 *    `monthlyAmountInCents` si venia. Volver a correr el seed devolvia los
 *    precios a 35.000 COP sin avisar. Hay una prueba que fija ese
 *    comportamiento en firestore-merge.test.ts.
 *  - `config/features` traia `paypalEnabled: false`. Correr el seed con
 *    PayPal ya activo lo desactivaba.
 *
 * Ahora cada documento se crea solo si falta. Pisar lo que ya hay es una
 * decision que hay que tomar a mano, con --forzar-planes.
 *
 * ── Los planes salen de @clausum/shared ─────────────────────────────────
 * Antes estaban copiados aqui enteros --limites, precios y textos-- asi que
 * la verdad vivia en dos sitios. Llegaron a contradecirse: el codigo decia
 * que una cuenta sin suscripcion no incluye analisis y este script seguia
 * sembrando tres.
 *
 * Usa el compilado, no las fuentes, porque esto es un .cjs y no pasa por
 * TypeScript. Si falta, hay que compilar shared primero.
 *
 * ── Pisar un plan es en dos pasos, y hay una razon ─────────────────────
 * La primera version de --forzar-planes escribia y DESPUES imprimia el antes
 * y el despues. Eso convirtio un aviso en un informe de danos: reescribio el
 * plan Pro, que tenia 50 comparaciones puestas a mano desde administracion,
 * y las dejo en 30.
 *
 * Un diff que llega tarde no es una salvaguarda. Ahora --forzar-planes solo
 * ENSENA lo que cambiaria; para escribir hay que repetirlo con --confirmar, y
 * se puede acotar a un plan con --plan=free.
 *
 * Uso:
 *   node scripts/seed-firestore.cjs                        (crea lo que falte)
 *   node scripts/seed-firestore.cjs --emulator             (contra el emulador)
 *   node scripts/seed-firestore.cjs --forzar-planes        (ensaya, no escribe)
 *   ... --forzar-planes --confirmar                        (escribe los dos)
 *   ... --forzar-planes --plan=free --confirmar            (escribe solo ese)
 */
const { initializeApp } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');

let compartido;
try {
  compartido = require('../../../shared/dist/index.js');
} catch {
  console.error(
    '❌ Falta shared/dist. Compila primero:\n' +
      '   pnpm --filter @clausum/shared build'
  );
  process.exit(1);
}

const { SEED_PLANS, PRO_BILLING, PRO_BILLING_LATAM, BILLING_CURRENCY, BILLING_CURRENCY_LATAM } =
  compartido;

const projectId = process.env.GCLOUD_PROJECT ?? 'clausum-dev';

const usarEmulador =
  process.argv.includes('--emulator') || process.env.FIRESTORE_EMULATOR_HOST !== undefined;
const forzarPlanes = process.argv.includes('--forzar-planes');
const confirmado = process.argv.includes('--confirmar');
const planPedido =
  process.argv.find((a) => a.startsWith('--plan='))?.slice('--plan='.length) ?? 'todos';

if (!['todos', 'free', 'pro'].includes(planPedido)) {
  console.error(`❌ --plan=${planPedido} no existe. Usa free, pro o todos.`);
  process.exit(1);
}

if (usarEmulador) {
  process.env.FIRESTORE_EMULATOR_HOST ??= 'localhost:8080';
  console.log(`🧪 Emulador: ${process.env.FIRESTORE_EMULATOR_HOST} (proyecto ${projectId})`);
} else {
  console.log(`☁️  Proyecto REAL: ${projectId}`);
  if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    console.log('   (sin GOOGLE_APPLICATION_CREDENTIALS: se usaran las credenciales de gcloud)');
  }
}

initializeApp({ projectId });
const db = getFirestore();

/** Los planes, tal y como los declara el codigo compartido. */
const plans = {
  free: { ...SEED_PLANS.free, updatedAt: FieldValue.serverTimestamp() },
  pro: { ...SEED_PLANS.pro, updatedAt: FieldValue.serverTimestamp() },
};

const config = {
  app: {
    maintenanceMode: false,
    supportEmail: 'soporte@clausumlegal.com',
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
  // Fuente de verdad de los precios: la leen tanto el cobro (Wompi, PayPal)
  // como la pantalla, y se editan desde administracion. Por eso este
  // documento solo se crea si falta.
  pricing: {
    CO: {
      monthlyAmountInCents: PRO_BILLING.monthlyAmountInCents,
      yearlyAmountInCents: PRO_BILLING.yearlyAmountInCents,
      currency: BILLING_CURRENCY,
    },
    LATAM: {
      monthlyAmountInCents: PRO_BILLING_LATAM.monthlyAmountInCents,
      yearlyAmountInCents: PRO_BILLING_LATAM.yearlyAmountInCents,
      currency: BILLING_CURRENCY_LATAM,
    },
    updatedAt: FieldValue.serverTimestamp(),
    updatedBy: 'seed',
  },
};

/**
 * Crea el documento si no existe. Si existe, lo deja exactamente como esta.
 *
 * No usa merge a proposito: merge pisa los campos que vienen en el payload,
 * y aqui vienen justo los que un administrador pudo haber cambiado.
 */
async function crearSiFalta(ref, datos, etiqueta) {
  const snap = await ref.get();
  if (snap.exists) {
    console.log(`   = ${etiqueta} ya existe, sin tocar`);
    return false;
  }
  await ref.set(datos);
  console.log(`   + ${etiqueta} creado`);
  return true;
}

async function seed() {
  let huboCambios = false;

  console.log('\nPlanes:');
  for (const [id, plan] of Object.entries(plans)) {
    const ref = db.collection('plans').doc(id);

    if (!forzarPlanes) {
      await crearSiFalta(ref, plan, `plans/${id}`);
      continue;
    }

    if (planPedido !== 'todos' && planPedido !== id) {
      console.log(`   . plans/${id} fuera de --plan=${planPedido}`);
      continue;
    }

    // Se lee ANTES de decidir si se escribe: el diff tiene que poder verse sin
    // haber tocado nada, que es justo lo que fallo la primera vez.
    const antes = (await ref.get()).data();
    const limitesAntes = antes?.limits ?? {};
    const limitesDespues = plan.limits;

    const resumen = (l) =>
      `${l.analysesPerMonth ?? '?'} analisis, ${l.comparisonsPerMonth ?? '?'} comparaciones`;

    const cambia =
      limitesAntes.analysesPerMonth !== limitesDespues.analysesPerMonth ||
      limitesAntes.comparisonsPerMonth !== limitesDespues.comparisonsPerMonth;

    if (!antes) {
      if (confirmado) await ref.set(plan);
      console.log(
        `   ${confirmado ? '+' : '~'} plans/${id} ${confirmado ? 'creado' : 'se crearia'}` +
          ` — ${resumen(limitesDespues)}`
      );
      continue;
    }

    if (!cambia) {
      if (confirmado) await ref.set(plan);
      console.log(`   = plans/${id} sin cambio en los limites — ${resumen(limitesDespues)}`);
      continue;
    }

    huboCambios = true;
    if (confirmado) await ref.set(plan);
    console.log(
      `   ${confirmado ? '!' : '~'} plans/${id} ${confirmado ? 'REESCRITO' : 'CAMBIARIA'}\n` +
        `       antes:   ${resumen(limitesAntes)}\n` +
        `       despues: ${resumen(limitesDespues)}`
    );
  }


  console.log('\nConfiguracion:');
  for (const [id, doc] of Object.entries(config)) {
    await crearSiFalta(db.collection('config').doc(id), doc, `config/${id}`);
  }

  if (!forzarPlanes) {
    console.log(
      '\n💡 Nada existente se ha modificado. Para reescribir los planes con los\n' +
        '   limites del codigo: node scripts/seed-firestore.cjs --forzar-planes'
    );
  } else if (!confirmado) {
    // Va al final y no junto a los planes a proposito: un aviso de "no se ha
    // escrito nada" enterrado a mitad de la salida se lee como si el script ya
    // hubiera terminado, y lo que viene debajo parece el resultado real.
    console.log(
      huboCambios
        ? '\n⚠️  ENSAYO: no se ha escrito nada. Revisa el antes/despues de arriba.\n' +
            '   Si es lo que quieres, repite el comando añadiendo --confirmar.\n' +
            '   Para acotarlo a un plan: --plan=pro --confirmar'
        : '\n✓ ENSAYO: los limites de Firestore ya coinciden con el codigo.'
    );
  }
  console.log('\n✅ Seed completado.');
}

seed().catch((err) => {
  // El fallo mas probable contra el proyecto real es de credenciales, y su
  // error nativo es un volcado de pila de google-auth-library que no dice
  // que hacer. Se traduce a las dos salidas que existen.
  const mensaje = String(err?.message ?? err);

  if (mensaje.includes('Could not load the default credentials')) {
    console.error(
      '\n❌ Sin credenciales para el proyecto real.\n\n' +
        '   Dos formas de resolverlo:\n\n' +
        '   a) Con la clave de servicio que ya tengas (solo esta ventana):\n' +
        '      PowerShell:  $env:GOOGLE_APPLICATION_CREDENTIALS = "C:\\ruta\\a\\la\\clave.json"\n' +
        '      bash:        export GOOGLE_APPLICATION_CREDENTIALS=/ruta/a/la/clave.json\n\n' +
        '   b) Con tu cuenta de Google (queda guardado en el disco):\n' +
        '      gcloud auth application-default login\n\n' +
        '   Contra el emulador no hace falta ninguna: usa --emulator.\n'
    );
    process.exit(1);
  }

  console.error('❌ Error en seed:', err);
  process.exit(1);
});
