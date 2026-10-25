/**
 * Comprueba que las credenciales de PayPal guardadas sirven de verdad.
 *
 * Hace tres preguntas a PayPal y no mueve un peso:
 *   1. ¿El par Client ID + secret autentica? (token de client_credentials)
 *   2. ¿Existen los dos planes que tiene configurada la app?
 *   3. ¿A que precio y en que moneda estan, y estan activos?
 *
 * Nunca imprime el secret ni el token. Si algo falla, dice que paso sin
 * filtrar la credencial en el mensaje de error.
 *
 * El secret NO se escribe a mano: se saca de Secret Manager, que es donde
 * vive, asi que no pasa por el portapapeles ni por la pantalla.
 *
 * ── Uso (en PowerShell) ─────────────────────────────────────────────────
 * La receta anterior tenia dos fallos y los dos se descubrieron usandola:
 *
 *   1. El CLI de Firebase se llamaba desde backend/functions, pero necesita
 *      el firebase.json, que esta en la RAIZ del repositorio. Alli fallaba y
 *      devolvia vacio, asi que la variable nunca se ponia y el script se
 *      quejaba de que faltaba el secreto, culpando al sintoma equivocado.
 *
 *   2. El CLI devuelve DOS lineas: el valor y una vacia del salto final.
 *      "Select-Object -Last 1" se quedaba con la vacia.
 *
 * De ahi el filtro de lineas vacias y la comprobacion de largo: si el valor
 * no mide 80 no se ejecuta nada, porque un valor basura haria fallar la
 * llamada a PayPal y pareceria que el secreto esta roto cuando el problema
 * seria de PowerShell.
 *
 *   cd C:\Users\User\repos\contratos
 *   $s = .\node_modules\.bin\firebase functions:secrets:access PAYPAL_CLIENT_SECRET --project clausum-dev
 *   $valor = (@($s) | Where-Object { $_.Trim() -ne '' } | Select-Object -Last 1).Trim()
 *   if ($valor.Length -eq 80) {
 *     $env:PAYPAL_CLIENT_SECRET = $valor
 *     cd backend\functions
 *     node scripts/verificar-paypal.cjs
 *     Remove-Item Env:\PAYPAL_CLIENT_SECRET
 *   } else { "No parece el secreto, no sigo." }
 *   Remove-Variable valor, s -ErrorAction SilentlyContinue
 */
const fs = require('node:fs');
const path = require('node:path');

/** Lee un .env a mano: node no carga estos archivos solo. */
function leerEnv(ruta) {
  const salida = {};
  if (!fs.existsSync(ruta)) return salida;
  for (const linea of fs.readFileSync(ruta, 'utf8').split(/\r?\n/)) {
    const limpia = linea.trim();
    if (!limpia || limpia.startsWith('#')) continue;
    const corte = limpia.indexOf('=');
    if (corte === -1) continue;
    salida[limpia.slice(0, corte).trim()] = limpia.slice(corte + 1).trim();
  }
  return salida;
}

const proyecto = process.env.GCLOUD_PROJECT ?? 'clausum-dev';
const env = leerEnv(path.join(__dirname, '..', `.env.${proyecto}`));

const modo = process.env.PAYPAL_MODE ?? env.PAYPAL_MODE ?? 'sandbox';
const clientId = process.env.PAYPAL_CLIENT_ID ?? env.PAYPAL_CLIENT_ID ?? '';
const secret = (process.env.PAYPAL_CLIENT_SECRET ?? '').split(/\r?\n/).filter(Boolean).pop() ?? '';
const planes = [
  ['mensual', process.env.PAYPAL_PLAN_ID_MONTHLY ?? env.PAYPAL_PLAN_ID_MONTHLY],
  ['anual', process.env.PAYPAL_PLAN_ID_ANNUAL ?? env.PAYPAL_PLAN_ID_ANNUAL],
].filter(([, id]) => id);

const base = modo === 'live' ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com';

function fallar(mensaje) {
  console.error(`\n${mensaje}\n`);
  process.exit(1);
}

if (!clientId) fallar(`No hay PAYPAL_CLIENT_ID en .env.${proyecto} ni en el entorno.`);
if (!secret) {
  fallar(
    'No hay PAYPAL_CLIENT_SECRET en el entorno.\n' +
      '   Sacalo de Secret Manager (no lo escribas a mano):\n' +
      '   $s = ..\\..\\node_modules\\.bin\\firebase functions:secrets:access PAYPAL_CLIENT_SECRET\n' +
      '   $env:PAYPAL_CLIENT_SECRET = ($s | Select-Object -Last 1).Trim()'
  );
}

console.log(`\nModo:      ${modo}  (${base})`);
console.log(`Client ID: ${clientId.slice(0, 8)}…${clientId.slice(-4)}  (${clientId.length} car.)`);
console.log(`Secret:    ${secret.slice(0, 4)}…  (${secret.length} car.)  [no se imprime]`);

// Una credencial equivocada suele delatarse por la forma antes de la red.
if (secret === clientId) fallar('El secret es IDENTICO al Client ID. Se copio el campo de arriba.');
if (secret.startsWith('BAAY')) fallar('El secret empieza por BAAY: eso es un Client ID, no un secret.');
if (secret.length < 60) fallar(`El secret mide ${secret.length} caracteres. Deberia medir ~80.`);

async function pedirToken() {
  const credenciales = Buffer.from(`${clientId}:${secret}`).toString('base64');
  const r = await fetch(`${base}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${credenciales}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });
  const cuerpo = await r.json().catch(() => ({}));
  if (!r.ok) {
    console.error(`\n1. Autenticacion: FALLA  (HTTP ${r.status})`);
    console.error(`   ${cuerpo.error ?? '?'}: ${cuerpo.error_description ?? 'sin detalle'}`);
    if (r.status === 401) {
      console.error('\n   401 significa que el par Client ID + secret no es valido.');
      console.error('   Casos tipicos: el secret es de la app de sandbox y no de la live,');
      console.error('   se copio el Client ID por error, o el secret fue borrado en PayPal.');
    }
    process.exit(1);
  }
  const alcances = String(cuerpo.scope ?? '').split(/\s+/).filter(Boolean);
  console.log(`\n1. Autenticacion: OK  (HTTP 200)`);
  console.log(`   token válido ${Math.round((cuerpo.expires_in ?? 0) / 60)} min, ${alcances.length} permisos`);
  const suscripciones = alcances.some((a) => a.includes('subscription'));
  console.log(`   permiso de suscripciones: ${suscripciones ? 'presente' : 'NO APARECE'}`);
  return cuerpo.access_token;
}

async function verPlan(etiqueta, id, token) {
  const r = await fetch(`${base}/v1/billing/plans/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!r.ok) {
    const cuerpo = await r.json().catch(() => ({}));
    console.log(`   ${etiqueta.padEnd(8)} ${id}  ->  FALLA (HTTP ${r.status}) ${cuerpo.name ?? ''}`);
    if (r.status === 404) {
      console.log(`            404: este plan no existe en ${modo}. Los planes de sandbox`);
      console.log('            no existen en live; hay que crearlos con paypal-setup.mjs --live.');
    }
    return false;
  }
  const p = await r.json();
  const ciclo = (p.billing_cycles ?? []).find((c) => c.tenure_type === 'REGULAR') ?? {};
  const precio = ciclo.pricing_scheme?.fixed_price ?? {};
  const cada = ciclo.frequency ?? {};
  console.log(
    `   ${etiqueta.padEnd(8)} ${id}  ->  ${p.status}  ` +
      `${precio.value ?? '?'} ${precio.currency_code ?? ''}  ` +
      `cada ${cada.interval_count ?? '?'} ${cada.interval_unit ?? '?'}  ` +
      `(${p.name ?? 'sin nombre'})`
  );
  return p.status === 'ACTIVE';
}

async function main() {
  const token = await pedirToken();

  console.log(`\n2. Planes configurados (${planes.length}):`);
  if (planes.length === 0) {
    console.log('   ninguno en .env — falta PAYPAL_PLAN_ID_MONTHLY / _ANNUAL');
    process.exit(1);
  }
  const resultados = [];
  for (const [etiqueta, id] of planes) resultados.push(await verPlan(etiqueta, id, token));

  const todoBien = resultados.every(Boolean);
  console.log(
    todoBien
      ? `\nTodo correcto: las credenciales ${modo} autentican y los dos planes estan activos.\n`
      : '\nHay planes que no estan activos o no existen. Revisa las lineas de arriba.\n'
  );
  if (!todoBien) process.exit(1);
}

main().catch((e) => {
  console.error('\nFallo inesperado:', e?.message ?? e);
  process.exit(1);
});
