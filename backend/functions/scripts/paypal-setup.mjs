/**
 * Crea en PayPal el producto, los dos planes y el webhook.
 *
 * Existe porque los objetos de PayPal NO se migran entre entornos: los
 * planes creados en sandbox no sirven en produccion, hay que crearlos otra
 * vez contra la API real. Y el precio vive DENTRO del plan, asi que el dia
 * que cambie la tarifa en dolares habra que volver a pasar por aqui.
 *
 * Uso:
 *   $env:PAYPAL_CLIENT_ID="..."; $env:PAYPAL_CLIENT_SECRET="..."
 *   node scripts/paypal-setup.mjs            (sandbox)
 *   node scripts/paypal-setup.mjs --live     (produccion, cobra de verdad)
 *
 * El secreto se lee del entorno y NO se imprime nunca.
 */
import { createInterface } from 'node:readline/promises';
import { randomUUID } from 'node:crypto';

const live = process.argv.includes('--live');
const BASE = live ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com';

const URL_WEBHOOK =
  process.env.PAYPAL_WEBHOOK_URL ?? 'https://clausumlegal.com/api/billing/paypal/webhook';

const PRECIO_MENSUAL = process.env.PAYPAL_PRECIO_MENSUAL ?? '10.00';
const PRECIO_ANUAL = process.env.PAYPAL_PRECIO_ANUAL ?? '100.00';
const MONEDA = 'USD';

// Los cinco que el backend sabe atender. Suscribirse a menos deja cobros
// que nunca activan el plan; suscribirse a mas solo genera ruido.
const EVENTOS = [
  'BILLING.SUBSCRIPTION.ACTIVATED',
  'BILLING.SUBSCRIPTION.CANCELLED',
  'BILLING.SUBSCRIPTION.EXPIRED',
  'BILLING.SUBSCRIPTION.SUSPENDED',
  'PAYMENT.SALE.COMPLETED',
];

const clientId = process.env.PAYPAL_CLIENT_ID;
const clientSecret = process.env.PAYPAL_CLIENT_SECRET;

if (!clientId || !clientSecret) {
  console.error('Faltan PAYPAL_CLIENT_ID y/o PAYPAL_CLIENT_SECRET en el entorno.');
  console.error('En PowerShell:');
  console.error('  $env:PAYPAL_CLIENT_ID="..."');
  console.error('  $env:PAYPAL_CLIENT_SECRET="..."');
  process.exit(1);
}

async function token() {
  const r = await fetch(`${BASE}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: 'Basic ' + Buffer.from(`${clientId}:${clientSecret}`).toString('base64'),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });
  const j = await r.json();
  if (!r.ok) throw new Error(`No se pudo autenticar (${r.status}): ${JSON.stringify(j)}`);
  return j.access_token;
}

async function post(ruta, cuerpo, jwt) {
  const r = await fetch(`${BASE}${ruta}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${jwt}`,
      'Content-Type': 'application/json',
      // Idempotencia: si el script se corta a medias y lo repites, PayPal
      // no crea duplicados para la misma peticion.
      'PayPal-Request-Id': randomUUID(),
    },
    body: JSON.stringify(cuerpo),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`${ruta} fallo (${r.status}): ${JSON.stringify(j)}`);
  return j;
}

const plan = (productId, nombre, unidad, precio) => ({
  product_id: productId,
  name: nombre,
  status: 'ACTIVE',
  billing_cycles: [
    {
      frequency: { interval_unit: unidad, interval_count: 1 },
      tenure_type: 'REGULAR',
      sequence: 1,
      total_cycles: 0, // 0 = indefinido, hasta que el usuario cancele
      pricing_scheme: { fixed_price: { value: precio, currency_code: MONEDA } },
    },
  ],
  payment_preferences: {
    auto_bill_outstanding: true,
    setup_fee_failure_action: 'CONTINUE',
    payment_failure_threshold: 3,
  },
});

(async () => {
  console.log('');
  console.log(`  Entorno : ${live ? 'PRODUCCION — cobra dinero real' : 'sandbox'}`);
  console.log(`  API     : ${BASE}`);
  console.log(`  Webhook : ${URL_WEBHOOK}`);
  console.log(`  Precios : ${PRECIO_MENSUAL} ${MONEDA}/mes · ${PRECIO_ANUAL} ${MONEDA}/año`);
  console.log('');

  if (live) {
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    const ok = await rl.question('Vas a crear objetos REALES en PayPal. Escribe "si" para continuar: ');
    rl.close();
    if (ok.trim().toLowerCase() !== 'si') {
      console.log('Cancelado. No se creo nada.');
      process.exit(0);
    }
  }

  const jwt = await token();
  console.log('Autenticado.');

  const producto = await post(
    '/v1/catalogs/products',
    {
      name: 'Clausum Pro',
      description: 'Analisis de contratos con inteligencia artificial',
      type: 'SERVICE',
      category: 'SOFTWARE',
    },
    jwt
  );
  console.log(`Producto creado : ${producto.id}`);

  const mensual = await post('/v1/billing/plans', plan(producto.id, 'Clausum Pro mensual', 'MONTH', PRECIO_MENSUAL), jwt);
  console.log(`Plan mensual    : ${mensual.id}`);

  const anual = await post('/v1/billing/plans', plan(producto.id, 'Clausum Pro anual', 'YEAR', PRECIO_ANUAL), jwt);
  console.log(`Plan anual      : ${anual.id}`);

  const webhook = await post(
    '/v1/notifications/webhooks',
    { url: URL_WEBHOOK, event_types: EVENTOS.map((name) => ({ name })) },
    jwt
  );
  console.log(`Webhook         : ${webhook.id}`);

  console.log('');
  console.log('── Para .env.clausum-dev ──────────────────────────────');
  console.log(`PAYPAL_MODE=${live ? 'live' : 'sandbox'}`);
  console.log(`PAYPAL_PLAN_ID_MONTHLY=${mensual.id}`);
  console.log(`PAYPAL_PLAN_ID_ANNUAL=${anual.id}`);
  console.log('');
  console.log('── Para el gestor de secretos ─────────────────────────');
  console.log(`PAYPAL_WEBHOOK_ID=${webhook.id}`);
  console.log('');
})().catch((e) => {
  console.error('');
  console.error('FALLO:', e.message);
  console.error('');
  console.error('Si dice PERMISSION_DENIED o INVALID_RESOURCE_ID, la cuenta');
  console.error('Business puede no estar habilitada para suscripciones.');
  process.exit(1);
});
